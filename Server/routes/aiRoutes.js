// backend/routes/aiRoutes.js
// =====================================================================
//  Changements vs version précédente :
//   ✅ Le champ `comment` est maintenant propagé jusqu'au frontend
//   ✅ Les fallbacks ne produisent plus jamais de phrases comme
//      "No mention of X" ou "Add a documented procedure for X"
//   ✅ Si Python échoue, on dit honnêtement "Manual review required"
// =====================================================================
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

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const log = (type, msg, data = null) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${type}] ${msg}`);
  if (data !== null) console.log(JSON.stringify(data, null, 2));
};

function mapStatus(status) {
  if (!status) return "Not covered";
  const v = status.toString().trim().toLowerCase();
  if (v === "covered" || (v.includes("cover") && !v.includes("not"))) return "Covered";
  if (v.includes("partial")) return "Partial";
  if (v.includes("not")) return "Not covered";
  return "Not covered";
}

// ───── filtering (unchanged from your existing code) ─────────────────────
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
    `SELECT id, ref_id, title, description FROM ciso_core_chapters
     WHERE standard_id = ? ORDER BY display_order ASC, ref_id ASC`, [standardId]);
  const coreItems = coreRows.map(c => ({
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
    `SELECT id, ref_id, name, description, family_id FROM ciso_controls
     WHERE standard_id = ? ORDER BY ref_id ASC`, [standardId]);
  const keptControls = controlRows.filter(
    c => keptFamilyIds.has(c.family_id) && !exceptedControls.has(c.id));

  const familyItems = keptFamilies.map(f => ({
    id: f.id, type: "annex_family", standard_id: standardId,
    ref_id: f.ref_id, title: f.name, description: f.description || "",
    mandatory: false,
  }));
  const controlItems = keptControls.map(c => ({
    id: c.id, type: "annex_control", standard_id: standardId,
    family_id: c.family_id, ref_id: c.ref_id, title: c.name,
    description: c.description || "", mandatory: false,
  }));

  return {
    standard,
    items: [...coreItems, ...familyItems, ...controlItems],
    stats: {
      standard_id: standardId, standard_name: standard.name,
      core_chapters_total: coreRows.length,
      families_total: familyRows.length, families_kept: keptFamilies.length,
      controls_total: controlRows.length, controls_kept: keptControls.length,
    },
  };
}

// ───── /analyze-pdf ──────────────────────────────────────────────────────
router.post("/analyze-pdf", upload.single("pdf"), async (req, res) => {
  let tmpFilePath = null;
  try {
    log("INFO", "📥 [ANALYZE-PDF] Request received");
    if (!req.file?.path) return res.status(400).json({ error: "No file uploaded" });
    tmpFilePath = req.file.path;
    log("INFO", `📄 ${req.file.originalname} -> ${tmpFilePath}`);

    let standardIds = [];
    try {
      if (req.body.standardIds) standardIds = JSON.parse(req.body.standardIds);
    } catch (e) { log("WARN", "Invalid standardIds JSON"); }
    if (!Array.isArray(standardIds) || !standardIds.length) {
      const [imp] = await db.query(`SELECT standard_id FROM imported_policies`);
      standardIds = imp.map(r => r.standard_id);
    }
    if (!standardIds.length) return res.status(400).json({ error: "No imported standard found." });

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
    if (!standardsPayload.length) return res.status(400).json({ error: "Nothing to analyze." });

    log("INFO", "🚀 Calling Python analyzer…");
    let pyResult = null;
    try {
      pyResult = await analyzeDocumentWithPython({
        documentPath: tmpFilePath,
        documentName: req.file.originalname,
        standards: standardsPayload,
      });
      log("INFO", `✅ Python: ${Object.keys(pyResult?.results || {}).length} item(s), ${pyResult?.policies?.length || 0} policy(ies)`);
    } catch (pyErr) {
      log("ERROR", "Python failed → fallback", pyErr.message);
      pyResult = buildHonestFallback(req.file.originalname, allInputItems, pyErr.message);
    }

    const ensured = ensureAllItemsPresent(pyResult, allInputItems);

    // Normalize statuses and propagate comment field
    if (Array.isArray(ensured.policies)) {
      ensured.policies = ensured.policies.map(p => ({
        ...p,
        assessments: (p.assessments || []).map(a => ({
          ...a,
          status: mapStatus(a.status),
          comment: typeof a.comment === "string" ? a.comment : "",
        })),
      }));
    }
    for (const k of Object.keys(ensured.results || {})) {
      ensured.results[k].status = mapStatus(ensured.results[k].status);
      if (typeof ensured.results[k].comment !== "string") ensured.results[k].comment = "";
    }

    return res.json({
      success: true,
      document: req.file.originalname,
      stats: aggregatedStats,
      ...ensured,
    });
  } catch (err) {
    log("ERROR", "analyze-pdf error", err.message || err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    if (tmpFilePath) fs.unlink(tmpFilePath, () => {});
  }
});

/**
 * If Python crashed, build placeholders that are HONEST about the failure
 * — no fake "No mention of X" / "Add a documented procedure" anymore.
 */
function buildHonestFallback(docName, items, errorMsg) {
  const flat = {};
  const truncated = (errorMsg || "unknown error").slice(0, 120);
  for (const it of items) {
    flat[it.id] = {
      item_id: it.id,
      ref_id:  it.ref_id || "",
      title:   it.title  || "",
      type:    it.type   || "",
      status:  "Not covered",
      conf:    0,
      comment: `Automated analysis failed (${truncated}). Manual review required for this control.`,
      evidence: [],
      risks:    [],
      gaps:     [],
      remediation: "",
    };
  }
  return {
    document_name: docName,
    global_compliance_percentage: 0,
    policies: [{
      policy_name: "General Information Security Policy",
      policy_summary: "Automated analysis unavailable — please review each control manually.",
      assessments: Object.values(flat),
    }],
    results: flat,
    error: errorMsg,
  };
}

/**
 * Make sure every imported item appears in results AND in every policy's
 * assessments — uses HONEST placeholders, not fake "No mention of X".
 */
function ensureAllItemsPresent(pyResult, items) {
  const out = pyResult || {};
  out.policies = Array.isArray(out.policies) ? out.policies : [];
  out.results  = (out.results && typeof out.results === "object") ? out.results : {};

  const itemsById = Object.fromEntries(items.map(it => [it.id, it]));

  for (const it of items) {
    if (!out.results[it.id]) {
      out.results[it.id] = {
        item_id: it.id, ref_id: it.ref_id || "", title: it.title || "",
        type: it.type || "", status: "Not covered", conf: 0,
        comment: "AI did not return a confident assessment for this control. Manual review required.",
        evidence: [], risks: [], gaps: [], remediation: "",
      };
    } else {
      const r = out.results[it.id];
      r.item_id = r.item_id || it.id;
      r.ref_id  = r.ref_id  || it.ref_id || "";
      r.title   = r.title   || it.title || "";
      r.type    = r.type    || it.type || "";
      if (typeof r.comment !== "string") r.comment = "";
    }
  }

  if (!out.policies.length) {
    out.policies = [{
      policy_name: "General Information Security Policy",
      policy_summary: "Default view (no specific policy detected in the document).",
      assessments: [],
    }];
  }

  const allAssessments = Object.values(out.results);
  for (const p of out.policies) {
    if (!Array.isArray(p.assessments) || !p.assessments.length) {
      p.assessments = allAssessments;
    } else {
      // ── ensure every imported item is also in this policy's assessments
      const existingIds = new Set(p.assessments.map(a => a.item_id));
      for (const it of items) {
        if (!existingIds.has(it.id)) {
          p.assessments.push(out.results[it.id]);
        }
      }
      p.assessments = p.assessments.map(a => {
        const meta = itemsById[a.item_id] || {};
        return {
          item_id: a.item_id,
          ref_id:  a.ref_id || meta.ref_id || "",
          title:   a.title  || meta.title  || "",
          type:    a.type   || meta.type   || "",
          status:  a.status || "Not covered",
          conf:    typeof a.conf === "number" ? a.conf : 0,
          comment: typeof a.comment === "string" ? a.comment : "",
          evidence: Array.isArray(a.evidence) ? a.evidence : [],
          risks:    Array.isArray(a.risks)    ? a.risks    : [],
          gaps:     Array.isArray(a.gaps)     ? a.gaps     : [],
          remediation: typeof a.remediation === "string" ? a.remediation : "",
        };
      });
    }
  }

  if (!out.global_compliance_percentage) {
    const score = { Covered: 100, Partial: 50, "Not covered": 0 };
    const vals = Object.values(out.results);
    if (vals.length) {
      out.global_compliance_percentage = Math.round(
        vals.reduce((s, v) => s + (score[mapStatus(v.status)] || 0), 0) / vals.length
      );
    }
  }
  return out;
}

router.get("/test", (_req, res) => {
  res.json({ message: "AI route working", timestamp: new Date().toISOString() });
});

export default router;