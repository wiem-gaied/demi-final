// cisoRouters.js
// Strict per-framework hierarchy:
//  - The hierarchy endpoint queries strictly by standard_id (no cross-framework leak)
//  - It ALWAYS returns two top-level sections: Core (mandatory) and Annex (optional)
//  - Core chapters carry their controls (joined via core_chapter_id)
//  - Annex families carry their controls (joined via family_id)
//  - No more keyword-based "guessing" of which is core vs annex
//  - The legacy importStandardsToDB has been replaced with a *minimal* re-import that
//    trusts the JSON's already-structured `core_chapters` / `families` keys produced by check.py.

import express from "express";
import fs from "fs";
import path from "path";
import db from "../db.js";
import {
  authenticateToken,
  getUserContext,
  visibilityClause,
  assertCanSeeStandard
} from "./authHelper.js";

const router = express.Router();

const DATA_DIR = path.resolve("C:/Users/stagiaire/Desktop/Ollama/Ollama/data/standards");

let isImporting = false;

// ============================================================
// FILE HELPERS
// ============================================================
// List framework JSON files, deduplicating intelligently:
//   - prefer files matching the deterministic <standardId>.json naming (no timestamp)
//   - among legacy timestamped duplicates of the same framework, keep only the newest
function getAllFrameworkFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const all = fs.readdirSync(DATA_DIR).filter(f =>
    f.endsWith(".json") &&
    !f.startsWith("frameworks_index_") &&
    !f.startsWith("ciso_standards_") &&
    !f.startsWith("all_frameworks_")
  );

  const TIMESTAMPED = /_\d{8}_\d{6}\.json$/;
  const groups = new Map();
  for (const f of all) {
    const base = f.replace(TIMESTAMPED, "").replace(/\.json$/, "").toLowerCase();
    const isDeterministic = !TIMESTAMPED.test(f);
    const stat = fs.statSync(path.join(DATA_DIR, f));
    const cur = groups.get(base);
    if (!cur ||
        (isDeterministic && !cur.isDeterministic) ||
        (isDeterministic === cur.isDeterministic && stat.mtimeMs > cur.mtime)) {
      groups.set(base, { file: f, mtime: stat.mtimeMs, isDeterministic });
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(v => path.join(DATA_DIR, v.file));
}

function readFrameworkFromFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.framework || data.standard || data;
  } catch (e) {
    console.error(`Read error ${filePath}: ${e.message}`);
    return null;
  }
}

function safeFragment(s, fallback) {
  const v = String(s || fallback || "x").replace(/[^a-zA-Z0-9.]/g, "_").replace(/_+/g, "_");
  return v.replace(/^_+|_+$/g, "") || fallback || "x";
}

function urnToStandardId(urn) {
  if (!urn) return null;
  const cleaned = String(urn).toLowerCase()
    .replace(/^urn:/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (cleaned.length <= 90) return cleaned;
  let h = 0;
  for (let i = 0; i < cleaned.length; i++) h = ((h << 5) - h + cleaned.charCodeAt(i)) | 0;
  return cleaned.slice(0, 80) + "_" + Math.abs(h).toString(36);
}

// ============================================================
// MINIMAL RE-IMPORT (used by /reimport)
// Trusts the JSON's `core_chapters` and `families`. NO keyword guessing.
// ============================================================
async function importOneFramework(conn, fw, presetStandardId = null) {
  // Prefer library_urn (matches what scraper.js writes) so re-imports never
  // produce a different ID than the original scrape.
  const standardId = presetStandardId
    || urnToStandardId(fw.library_urn)
    || urnToStandardId(fw.urn)
    || urnToStandardId(fw.ref_id)
    || urnToStandardId(fw.name);

  if (!standardId) throw new Error(`Cannot derive standard_id for "${fw.name || "unknown"}"`);

  // wipe THIS framework only
  await conn.query("DELETE FROM ciso_controls WHERE standard_id = ?", [standardId]);
  await conn.query("DELETE FROM ciso_families WHERE standard_id = ?", [standardId]);
  await conn.query("DELETE FROM ciso_core_chapters WHERE standard_id = ?", [standardId]);
  await conn.query("DELETE FROM ciso_standards WHERE id = ?", [standardId]);

  const coreList = fw.core_chapters || fw.coreChapters || [];
  const famList  = fw.families || [];

  const countCore = (arr) => (arr || []).reduce((s, n) =>
    s + (n.items || n.controls || []).length + countCore(n.children || []), 0);
  const countFam = (arr) => (arr || []).reduce((s, f) =>
    s + (f.items || f.controls || []).length + countFam(f.children || []), 0);

  const totalControls = countCore(coreList) + countFam(famList);

  await conn.query(
    `INSERT INTO ciso_standards (id, name, description, version, provider, ref_id, controls_count, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      standardId,
      fw.name || "Untitled",
      fw.description || "",
      fw.version || "1.0",
      fw.provider || fw.publisher || "Unknown",
      fw.ref_id || fw.urn || fw.name,
      totalControls
    ]
  );

  let coreSeq = 0, ctrlSeq = 0;
  const insertCore = async (node, parentId, level) => {
    coreSeq++;
    const localId = `${standardId}__c_${coreSeq}_${safeFragment(node.ref_id, "ch")}`.slice(0, 100);
    await conn.query(
      `INSERT INTO ciso_core_chapters
       (id, standard_id, ref_id, title, description, parent_id, level, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId, standardId,
        node.ref_id || `ch_${coreSeq}`,
        node.title || node.name || "Untitled",
        node.description || "",
        parentId, level, coreSeq
      ]
    );
    for (const item of (node.items || node.controls || [])) {
      ctrlSeq++;
      const cid = `${standardId}__cc_${ctrlSeq}_${safeFragment(item.ref_id, "ctl")}`.slice(0, 100);
      await conn.query(
        `INSERT INTO ciso_controls
         (id, family_id, core_chapter_id, standard_id, ref_id, name, description, implementation_guidance)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
        [cid, localId, standardId,
         item.ref_id || `ctl_${ctrlSeq}`,
         item.name || item.title || "Untitled",
         item.description || "",
         item.implementation_guidance || null]
      );
    }
    for (const child of (node.children || [])) await insertCore(child, localId, level + 1);
  };
  for (const node of coreList) await insertCore(node, null, 0);

  // Flatten any sub-family nesting (e.g. nested Annex A sections)
  const flattenFamilyTree = (families) => {
    const out = [];
    const walk = (f) => {
      out.push({
        ref_id: f.ref_id,
        name: f.title || f.name,
        description: f.description || "",
        items: f.items || f.controls || []
      });
      for (const sub of (f.children || [])) walk(sub);
    };
    for (const f of (families || [])) walk(f);
    return out;
  };
  const flatFamList = flattenFamilyTree(famList);

  let famSeq = 0;
  for (const fam of flatFamList) {
    famSeq++;
    const items = fam.items || [];
    const famId = `${standardId}__f_${famSeq}_${safeFragment(fam.ref_id, "fam")}`.slice(0, 100);
    await conn.query(
      `INSERT INTO ciso_families (id, standard_id, ref_id, name, description, display_order, controls_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [famId, standardId, fam.ref_id || `f_${famSeq}`,
       fam.name || "Untitled", fam.description || "", famSeq, items.length]
    );
    for (const item of items) {
      ctrlSeq++;
      const cid = `${standardId}__fc_${ctrlSeq}_${safeFragment(item.ref_id, "ctl")}`.slice(0, 100);
      await conn.query(
        `INSERT INTO ciso_controls
         (id, family_id, core_chapter_id, standard_id, ref_id, name, description, implementation_guidance)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
        [cid, famId, standardId,
         item.ref_id || `ctl_${ctrlSeq}`,
         item.name || item.title || "Untitled",
         item.description || "",
         item.implementation_guidance || null]
      );
    }
  }

  return { standardId, coreSeq, famSeq, ctrlSeq };
}

export async function importStandardsToDB() {
  if (isImporting) { console.log("Import already in progress, skipped."); return; }
  isImporting = true;
  console.log(`Re-import from ${DATA_DIR}`);
  const files = getAllFrameworkFiles();
  if (!files.length) { console.warn("No JSON files found."); isImporting = false; return; }

  const conn = await db.getConnection();
  let imported = 0;
  try {
    for (const fp of files) {
      const fw = readFrameworkFromFile(fp);
      if (!fw || !fw.name) continue;
      try {
        const result = await importOneFramework(conn, fw);
        console.log(`  imported ${fw.name} -> ${result.standardId} (core=${result.coreSeq} fam=${result.famSeq} ctrl=${result.ctrlSeq})`);
        imported++;
      } catch (e) {
        console.error(`  failed ${fw.name}: ${e.message}`);
      }
    }
  } finally {
    conn.release();
    isImporting = false;
  }
  console.log(`Done. ${imported} frameworks imported.`);
}

// ============================================================
// ROUTES
// ============================================================

// GET /me — diagnostic: who does the backend think you are?
// Call: curl -H "X-User-Id: 48" http://localhost:3000/api/ciso/me
router.get("/me", authenticateToken, async (req, res) => {
  const ctx = await getUserContext(req);
  res.json({
    userId: ctx.userId,
    role: ctx.role,
    isAdmin: ctx.isAdmin,
    email: ctx.email,
    name: ctx.name,
    authSource: req._authSource,
    note: ctx.isAdmin
      ? "Admin actions create PUBLIC frameworks (created_by_user_id = NULL)."
      : `User actions create PRIVATE frameworks (created_by_user_id = ${ctx.userId}).`
  });
});

// GET /packages — list frameworks visible to the current user
router.get("/packages", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.json([]);

    const { whereClause, params } = visibilityClause(ctx, "");
    const [rows] = await db.query(`
      SELECT id, name, description, version, provider, ref_id, controls_count,
             is_custom, created_by_user_id
      FROM ciso_standards
      WHERE ${whereClause}
      ORDER BY is_custom DESC, name ASC
    `, params);
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /packages/:id/hierarchy
// Always returns: { id, title, hierarchy: [ Core section, Annex section ] }
// Both sections are ALWAYS present, even when empty, so the UI is consistent.
router.get("/packages/:id/hierarchy", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = await getUserContext(req);
    const [stdRows] = await db.query("SELECT * FROM ciso_standards WHERE id = ?", [id]);
    if (!stdRows.length) return res.status(404).json({ error: "Standard not found" });
    const standard = stdRows[0];
    if (!assertCanSeeStandard(standard, ctx, res)) return;

    // ---- Core chapters (strict standard_id filter) ----
    const [coreRows] = await db.query(`
      SELECT id, ref_id, title, description, parent_id, level, display_order
      FROM ciso_core_chapters
      WHERE standard_id = ?
      ORDER BY display_order, ref_id
    `, [id]);

    const [coreCtrlRows] = await db.query(`
      SELECT id, ref_id, name, description, core_chapter_id
      FROM ciso_controls
      WHERE standard_id = ? AND core_chapter_id IS NOT NULL
      ORDER BY ref_id
    `, [id]);

    const ctrlByChapter = new Map();
    for (const c of coreCtrlRows) {
      if (!ctrlByChapter.has(c.core_chapter_id)) ctrlByChapter.set(c.core_chapter_id, []);
      ctrlByChapter.get(c.core_chapter_id).push({
        id: c.id,
        ref_id: c.ref_id,
        name: c.name,
        description: c.description || ""
      });
    }

    const buildCoreTree = (parentId) => coreRows
      .filter(ch => ch.parent_id === parentId)
      .map(ch => ({
        id: ch.id,
        ref_id: ch.ref_id,
        title: ch.title,
        description: ch.description || "",
        level: ch.level,
        items: ctrlByChapter.get(ch.id) || [],
        children: buildCoreTree(ch.id)
      }));

    const coreTree = buildCoreTree(null);

    // ---- Annex families (strict standard_id filter) ----
    const [famRows] = await db.query(`
      SELECT id, ref_id, name, description, display_order
      FROM ciso_families
      WHERE standard_id = ?
      ORDER BY display_order, ref_id
    `, [id]);

    const familiesWithControls = [];
    for (const f of famRows) {
      const [controls] = await db.query(`
        SELECT id, ref_id, name, description
        FROM ciso_controls
        WHERE family_id = ? AND standard_id = ?
        ORDER BY ref_id
      `, [f.id, id]);

      familiesWithControls.push({
        id: f.id,
        ref_id: f.ref_id,
        title: f.name,
        description: f.description || "",
        items: controls.map(c => ({
          id: c.id,
          ref_id: c.ref_id,
          name: c.name,
          description: c.description || ""
        })),
        children: []
      });
    }

    // ---- Always return both sections ----
    const hierarchy = [
      {
        id: `${id}__core_section`,
        ref_id: "core",
        title: "Core",
        description: `Mandatory requirements of ${standard.name}.`,
        isAnnex: false,
        items: [],
        children: coreTree
      },
      {
        id: `${id}__annex_section`,
        ref_id: "annex",
        title: "Annex",
        description: `Optional controls for ${standard.name} (exceptions allowed).`,
        isAnnex: true,
        items: [],
        children: familiesWithControls
      }
    ];

    res.json({
      id: standard.id,
      title: standard.name,
      version: standard.version,
      provider: standard.provider,
      hierarchy
    });
  } catch (err) {
    console.error("hierarchy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/controls — for analysis (flat list, all controls of the standard)
router.get("/packages/:id/controls", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = await getUserContext(req);
    const [stdRows] = await db.query("SELECT * FROM ciso_standards WHERE id = ?", [id]);
    if (!stdRows.length) return res.status(404).json({ error: "Standard not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [controls] = await db.query(`
      SELECT
        c.id,
        c.ref_id,
        c.name      AS title,
        c.description,
        c.family_id,
        c.core_chapter_id,
        f.ref_id    AS family_ref,
        f.name      AS family_name,
        cc.ref_id   AS chapter_ref,
        cc.title    AS chapter_title,
        s.name      AS standard_name
      FROM ciso_controls c
      LEFT JOIN ciso_families f       ON c.family_id = f.id
      LEFT JOIN ciso_core_chapters cc ON c.core_chapter_id = cc.id
      JOIN      ciso_standards s      ON c.standard_id = s.id
      WHERE c.standard_id = ?
      ORDER BY (c.family_id IS NULL) DESC, f.display_order, cc.display_order, c.ref_id
    `, [id]);

    res.json({
      standard_id: id,
      standard_name: stdRows[0].name,
      controls,
      total: controls.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/families
router.get("/packages/:id/families", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = await getUserContext(req);
    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?", [id]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Standard not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [families] = await db.query(`
      SELECT id, ref_id, name, description, display_order, controls_count
      FROM ciso_families
      WHERE standard_id = ?
      ORDER BY display_order
    `, [id]);
    res.json({
      standard_id: id,
      families: families.map(f => ({
        id: f.id, ref_id: f.ref_id, name: f.name, title: f.name,
        description: f.description || "", controls_count: f.controls_count || 0
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/core-chapters
router.get("/packages/:id/core-chapters", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = await getUserContext(req);
    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?", [id]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Standard not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [rows] = await db.query(`
      SELECT id, ref_id, title, description, parent_id, level, display_order
      FROM ciso_core_chapters
      WHERE standard_id = ?
      ORDER BY display_order
    `, [id]);

    const map = new Map();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id, ref_id: r.ref_id, title: r.title,
        description: r.description, parent_id: r.parent_id, level: r.level, children: []
      });
    }
    const roots = [];
    for (const r of rows) {
      const node = map.get(r.id);
      if (!r.parent_id || !map.has(r.parent_id)) roots.push(node);
      else map.get(r.parent_id).children.push(node);
    }
    res.json({ standard_id: id, core_chapters: roots, total: roots.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stats
router.get("/stats", async (req, res) => {
  try {
    const [[{ standards }]]    = await db.query("SELECT COUNT(*) AS standards FROM ciso_standards");
    const [[{ families }]]     = await db.query("SELECT COUNT(*) AS families FROM ciso_families");
    const [[{ controls }]]     = await db.query("SELECT COUNT(*) AS controls FROM ciso_controls");
    const [[{ coreChapters }]] = await db.query("SELECT COUNT(*) AS coreChapters FROM ciso_core_chapters");
    res.json({ standards, families, controls, coreChapters });
  } catch (err) {
    res.json({ standards: 0, families: 0, controls: 0, coreChapters: 0 });
  }
});

// GET /reimport — re-import all JSON files (uses minimal trusted importer)
router.get("/reimport", async (req, res) => {
  try {
    while (isImporting) await new Promise(r => setTimeout(r, 100));
    await importStandardsToDB();
    res.json({ message: "Re-import finished." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cleanup — remove duplicate framework rows.
// Two rows are considered duplicates when they share the same lower-cased name.
// We keep the row whose id is the URN-based one (preferred), or the most recent.
router.post("/cleanup", async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT id, name FROM ciso_standards"
    );
    const groups = new Map();
    for (const r of rows) {
      const key = (r.name || "").toLowerCase().trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const removed = [];
    for (const [, list] of groups) {
      if (list.length < 2) continue;
      // Prefer the URN-based id (starts with "intuitem_" or "urn_") if present
      const score = (id) => {
        if (id.startsWith("intuitem_") || id.startsWith("urn_")) return 2;
        if (id.includes("__")) return 1;
        return 0;
      };
      list.sort((a, b) => score(b.id) - score(a.id));
      const keep = list[0];
      const drop = list.slice(1);
      for (const d of drop) {
        await conn.query("DELETE FROM ciso_controls WHERE standard_id = ?", [d.id]);
        await conn.query("DELETE FROM ciso_families WHERE standard_id = ?", [d.id]);
        await conn.query("DELETE FROM ciso_core_chapters WHERE standard_id = ?", [d.id]);
        await conn.query("DELETE FROM ciso_standards WHERE id = ?", [d.id]);
        removed.push({ removed: d.id, kept: keep.id, name: d.name });
      }
    }
    await conn.commit();
    res.json({
      message: `Cleanup finished. Removed ${removed.length} duplicate framework(s).`,
      removed
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /json-files — list available JSON files
router.get("/json-files", async (req, res) => {
  try {
    const files = getAllFrameworkFiles();
    const frameworks = [];
    for (const file of files) {
      const fw = readFrameworkFromFile(file);
      if (fw) frameworks.push({
        file: path.basename(file),
        name: fw.name,
        controls_count: (fw.controls || []).length
      });
    }
    res.json({ directory: DATA_DIR, total_files: files.length, frameworks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;