// backend/routes/aiRoutes.js — v4 (FIXED for multiple files)
//
// Fixed: Better error handling for multer and file uploads
//
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import db from "../db.js";
import { analyzeDocumentWithPython } from "../services/pythonClient.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer with better error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = os.tmpdir();
    console.log(`[MULTER] Saving file to: ${tempDir}`);
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    const filename = `${Date.now()}_${safe}`;
    console.log(`[MULTER] Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  },
});

const log = (type, msg, data = null) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${type}] ${msg}`);
  if (data !== null) console.log(JSON.stringify(data, null, 2));
};

function mapStatus(status) {
  if (!status) return "Not covered";
  const v = status.toString().trim().toLowerCase();
  if (v.includes("applicable") && v.includes("not")) return "Not applicable";
  if (v === "covered" || (v.includes("cover") && !v.includes("not"))) return "Covered";
  if (v.includes("partial")) return "Partial";
  if (v.includes("not")) return "Not covered";
  return "Not covered";
}

const SCORE = { "Covered": 100, "Partial": 50, "Not covered": 0 };

// ───── filtering: builds the imported-items payload for one standard ──
async function buildItemsForStandard(standardId) {
  const [exRows] = await db.query(
    `SELECT entity_id, entity_type FROM policy_exceptions
     WHERE standard_id = ? AND is_active = 1`, [standardId]);
  const exceptedFamilies = new Set(exRows.filter(r => r.entity_type === "chapter").map(r => r.entity_id));
  const exceptedControls = new Set(exRows.filter(r => r.entity_type === "control").map(r => r.entity_id));

  const [stdRows] = await db.query(
    `SELECT id, name, version, description FROM ciso_standards WHERE id = ?`, [standardId]);
  const standard = stdRows[0] || { id: standardId, name: standardId };

  const [coreRows] = await db.query(
    `SELECT id, ref_id, title, description, parent_id FROM ciso_core_chapters
     WHERE standard_id = ? ORDER BY display_order ASC, ref_id ASC`, [standardId]);

  const chapterById = new Map(coreRows.map(c => [c.id, c]));
  const isCoreChapterExcepted = (id) => {
    let cur = id, guard = 0;
    while (cur && guard++ < 100) {
      if (exceptedFamilies.has(cur)) return true;
      cur = chapterById.get(cur)?.parent_id || null;
    }
    return false;
  };
  const keptCoreChapters   = coreRows.filter(c => !isCoreChapterExcepted(c.id));
  const keptCoreChapterIds = new Set(keptCoreChapters.map(c => c.id));

  const coreChapterItems = keptCoreChapters.map(c => ({
    id: c.id, type: "core_chapter", standard_id: standardId,
    ref_id: c.ref_id, title: c.title, description: c.description || "",
    mandatory: true,
  }));

  const [familyRows] = await db.query(
    `SELECT id, ref_id, name, description FROM ciso_families
     WHERE standard_id = ? ORDER BY display_order ASC, ref_id ASC`, [standardId]);
  const keptFamilies = familyRows.filter(f => !exceptedFamilies.has(f.id));
  const keptFamilyIds = new Set(keptFamilies.map(f => f.id));

  const [controlRows] = await db.query(
    `SELECT id, ref_id, name, description, family_id, core_chapter_id
     FROM ciso_controls
     WHERE standard_id = ? ORDER BY ref_id ASC`, [standardId]);

  const keptControls = controlRows.filter(c => {
    if (exceptedControls.has(c.id)) return false;
    if (c.core_chapter_id) return keptCoreChapterIds.has(c.core_chapter_id);
    if (c.family_id)       return keptFamilyIds.has(c.family_id);
    return true;
  });

  const familyItems = keptFamilies.map(f => ({
    id: f.id, type: "annex_family", standard_id: standardId,
    ref_id: f.ref_id, title: f.name, description: f.description || "",
    mandatory: false,
  }));
  const controlItems = keptControls.map(c => ({
    id: c.id,
    type: c.core_chapter_id ? "core_control" : "annex_control",
    standard_id: standardId,
    family_id: c.family_id || null,
    core_chapter_id: c.core_chapter_id || null,
    ref_id: c.ref_id, title: c.name,
    description: c.description || "",
    mandatory: !!c.core_chapter_id,
  }));

  return {
    standard,
    items: [...coreChapterItems, ...familyItems, ...controlItems],
    stats: {
      standard_id: standardId, standard_name: standard.name,
      core_chapters_total: coreRows.length,
      core_chapters_kept:  keptCoreChapters.length,
      families_total: familyRows.length, families_kept: keptFamilies.length,
      controls_total: controlRows.length, controls_kept: keptControls.length,
    },
  };
}

// ───── /analyze-pdf ──────────────────────────────────────────────────────
router.post("/analyze-pdf", (req, res, next) => {
  // Handle multer errors
  upload.array("pdfs", 50)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      log("ERROR", `Multer error: ${err.message}`);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      log("ERROR", `Unknown upload error: ${err.message}`);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const tempFiles = [];
  try {
    log("INFO", "📥 [ANALYZE-PDF] Request received");
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      log("ERROR", "No files uploaded");
      return res.status(400).json({ error: "No files uploaded. Please select at least one PDF, DOC, or TXT file." });
    }
    
    log("INFO", `📄 Received ${req.files.length} file(s): ${req.files.map(f => f.originalname).join(", ")}`);
    
    // Store temp file paths for cleanup
    req.files.forEach(file => {
      tempFiles.push(file.path);
      log("INFO", `   - ${file.originalname} -> ${file.path}`);
    });

    let standardIds = [];
    try {
      if (req.body.standardIds) {
        standardIds = typeof req.body.standardIds === 'string' 
          ? JSON.parse(req.body.standardIds) 
          : req.body.standardIds;
      }
    } catch (e) { 
      log("WARN", "Invalid standardIds JSON", e.message); 
    }
    
    if (!Array.isArray(standardIds) || !standardIds.length) {
      const [imp] = await db.query(`SELECT DISTINCT standard_id FROM imported_policies`);
      standardIds = imp.map(r => r.standard_id);
    }
    
    if (!standardIds.length) {
      return res.status(400).json({ error: "No imported standard found. Please import a framework first." });
    }

    const standardsPayload = [];
    const aggregatedStats = [];
    const allInputItems = [];
    
    for (const sid of standardIds) {
      const built = await buildItemsForStandard(sid);
      log("INFO", `📦 ${sid} => items: ${built.items.length}`);
      if (!built.items.length) continue;
      standardsPayload.push({
        standard_id: built.standard.id,
        standard_name: built.standard.name,
        standard_version: built.standard.version || "1.0",
        items: built.items,
      });
      aggregatedStats.push(built.stats);
      allInputItems.push(...built.items);
    }
    
    if (!standardsPayload.length) {
      return res.status(400).json({ error: "No items to analyze. The selected framework might be empty." });
    }

    log("INFO", `🚀 Calling Python analyzer with ${req.files.length} file(s) for ${allInputItems.length} item(s)…`);
    
    let pyResult = null;
    try {
      // ─── NEW: pass ALL uploaded files to Python (1 file = 1 policy) ───
      const documents = req.files.map(f => ({
        path: f.path,
        name: f.originalname,
      }));

      const combinedName = req.files.length === 1
        ? req.files[0].originalname
        : `${req.files.length} files: ${req.files.map(f => f.originalname).join(", ")}`;

      log("INFO", `📚 Passing ${documents.length} document(s) to Python (1 file = 1 policy)`);
      documents.forEach(d => log("INFO", `   • ${d.name}`));

      pyResult = await analyzeDocumentWithPython({
        documents,                                // ← NEW: array of {path, name}
        documentPath: req.files[0].path,          // kept for backward-compat
        documentName: combinedName,
        standards: standardsPayload,
      });

      log("INFO", `✅ Python: ${(pyResult?.items?.length || 0)} item(s), `
        + `${pyResult?.policies_detected?.length || 0} policy(ies)`);
    } catch (pyErr) {
      log("ERROR", "Python failed → fallback", pyErr.message);
      pyResult = buildHonestFallback(
        req.files.map(f => f.originalname).join(", "),
        allInputItems,
        pyErr.message,
      );
    }

    const ensured = ensureAllItemsPresent(pyResult, allInputItems);
    
    // Add multi-file info to response
    ensured.processed_files = req.files.map(f => f.originalname);
    ensured.file_count = req.files.length;

    return res.json({
      success: true,
      document: req.files.length === 1 ? req.files[0].originalname : `${req.files.length} files processed`,
      stats: aggregatedStats,
      ...ensured,
    });
  } catch (err) {
    log("ERROR", "analyze-pdf error", err.message || err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    // Clean up temp files
    for (const filePath of tempFiles) {
      fs.unlink(filePath, (err) => {
        if (err) log("WARN", `Failed to delete temp file ${filePath}:`, err.message);
      });
    }
  }
});

/**
 * Python crashed entirely → return every item as "Not applicable" with an
 * honest comment so the UI still shows the imported framework.
 */
function buildHonestFallback(docName, items, errorMsg) {
  const truncated = (errorMsg || "unknown error").slice(0, 120);
  const itemsArr = items.map(it => ({
    item_id:       it.id,
    ref_id:        it.ref_id || "",
    title:         it.title || "",
    type:          it.type || "",
    is_applicable: false,
    status:        "Not applicable",
    conf:          0,
    fallback_note: `Automated analysis failed (${truncated}). Manual review required.`,
    policy_assessments: [],
  }));
  return {
    document_name: docName,
    global_compliance_percentage: 0,
    policies_detected: [],
    items: itemsArr,
    error: errorMsg,
  };
}

/**
 * Ensure every imported item has an entry in `out.items`.
 */
function ensureAllItemsPresent(pyResult, items) {
  const out = pyResult || {};
  out.items             = Array.isArray(out.items) ? out.items : [];
  out.policies_detected = Array.isArray(out.policies_detected) ? out.policies_detected : [];

  const seen = new Set(out.items.map(it => it.item_id));
  const itemsById = Object.fromEntries(items.map(it => [it.id, it]));

  // Add missing items as "Not applicable"
  for (const it of items) {
    if (seen.has(it.id)) continue;
    out.items.push({
      item_id:            it.id,
      ref_id:             it.ref_id || "",
      title:              it.title || "",
      type:               it.type || "",
      is_applicable:      false,
      status:             "Not applicable",
      conf:               0,
      fallback_note:      "No relevant policy detected in the uploaded document for this control.",
      policy_assessments: [],
    });
  }

  // Normalize every item
  out.items = out.items.map(it => {
    const meta = itemsById[it.item_id] || {};
    const isApplicable = it.is_applicable !== false && (it.policy_assessments?.length > 0);
    const status = mapStatus(it.status || (isApplicable ? "Not covered" : "Not applicable"));

    const policy_assessments = Array.isArray(it.policy_assessments)
      ? it.policy_assessments.map(a => ({
          policy_name:    a.policy_name || "",
          policy_summary: a.policy_summary || "",
          status:         mapStatus(a.status),
          conf:           typeof a.conf === "number" ? a.conf : 0,
          comment:        typeof a.comment === "string" ? a.comment : "",
          risks:          Array.isArray(a.risks) ? a.risks.filter(x => (x || "").toString().trim()) : [],
          gaps:           Array.isArray(a.gaps)  ? a.gaps.filter(x => (x || "").toString().trim())  : [],
          remediation:    typeof a.remediation === "string" ? a.remediation : "",
          _source:        a._source || "llm",
        }))
      : [];

    return {
      item_id:            it.item_id,
      ref_id:             it.ref_id || meta.ref_id || "",
      title:              it.title  || meta.title  || "",
      type:               it.type   || meta.type   || "",
      is_applicable:      isApplicable,
      status:             isApplicable ? status : "Not applicable",
      conf:               typeof it.conf === "number" ? it.conf : 0,
      fallback_note:      it.fallback_note || "",
      policy_assessments,
    };
  });

  // Compute global compliance % if Python didn't
  const applicable = out.items.filter(it => it.is_applicable);
  if (applicable.length > 0) {
    out.global_compliance_percentage = Math.round(
      applicable.reduce((s, it) => s + (SCORE[it.status] ?? 0), 0) / applicable.length
    );
  } else if (!out.global_compliance_percentage) {
    out.global_compliance_percentage = 0;
  }

  return out;
}

router.get("/test", (_req, res) => {
  res.json({ message: "AI route working (v3 item-centric)", timestamp: new Date().toISOString() });
});

export default router;