// frameworksauditor.js  (mounted at /api/framauditor)
// Adds strict per-user visibility:
//   - admin actions  => created_by_user_id = NULL (public, visible to all logged users)
//   - user actions   => created_by_user_id = userId (private to that user)
//   - not logged in  => authenticateToken returns 401 => nothing shown
// Uses the shared authHelper.js so the same rules apply to /api/ciso and /api/scraper.

import express from "express";
import db from "../db.js";
import {
  authenticateToken,
  getUserContext,
  visibilityClause,
  assertCanSeeStandard
} from "./authHelper.js";

const router = express.Router();

// ============================================================
// GET /packages — frameworks visible to the current user
// ============================================================
router.get("/packages", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.json([]); // belt-and-braces

    const { whereClause, params } = visibilityClause(ctx, "s");
    const [standards] = await db.query(`
      SELECT
        s.id, s.name, s.version, s.provider, s.description,
        s.is_custom, s.created_by_user_id,
        (SELECT COUNT(*) FROM ciso_controls WHERE standard_id = s.id) AS controls_count
      FROM ciso_standards s
      WHERE ${whereClause}
      ORDER BY s.is_custom DESC, s.name
    `, params);
    res.json(standards);
  } catch (err) {
    console.error("Error fetching packages:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /packages/:id/hierarchy — same visibility check
// ============================================================
router.get("/packages/:id/hierarchy", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = await getUserContext(req);
    const [stdRows] = await db.query(
      "SELECT id, name, created_by_user_id FROM ciso_standards WHERE id = ?",
      [id]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Standard not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [coreChapters] = await db.query(`
      SELECT id, title, description, ref_id AS ref, display_order, level, parent_id
      FROM ciso_core_chapters
      WHERE standard_id = ?
      ORDER BY display_order ASC, ref_id ASC
    `, [id]);

    const [families] = await db.query(`
      SELECT id, ref_id, name, description, display_order
      FROM ciso_families
      WHERE standard_id = ?
      ORDER BY display_order ASC, ref_id ASC
    `, [id]);

    const [controls] = await db.query(`
      SELECT id, ref_id, name, description, family_id, core_chapter_id, implementation_guidance
      FROM ciso_controls
      WHERE standard_id = ?
      ORDER BY ref_id ASC, id ASC
    `, [id]);

    const hierarchy = [];

    if (coreChapters.length > 0) {
      const buildChapterTree = (parentId = null) =>
        coreChapters
          .filter(c => parentId === null
            ? (!c.parent_id || c.parent_id === "")
            : c.parent_id === parentId)
          .map(ch => ({
            id: ch.id,
            ref_id: ch.ref,
            title: ch.title,
            description: ch.description || "",
            type: "core_chapter",
            children: buildChapterTree(ch.id),
            items: controls
              .filter(c => c.core_chapter_id === ch.id)
              .map(c => ({
                id: c.id, ref_id: c.ref_id, name: c.name, description: c.description || ""
              }))
          }));

      const coreTree = buildChapterTree();
      if (coreTree.length > 0) {
        hierarchy.push({
          id: "core_section",
          title: "Core Chapters",
          description: "Main framework structure chapters",
          type: "core_section",
          isAnnex: false,
          children: coreTree,
          items: []
        });
      }
    }

    if (families.length > 0) {
      for (const family of families) {
        let cleanName = family.name || "";
        if (family.ref_id && cleanName.includes(family.ref_id)) {
          cleanName = cleanName
            .replace(`${family.ref_id} - `, "")
            .replace(`${family.ref_id} `, "");
        }
        const displayTitle = family.ref_id ? `${family.ref_id} - ${cleanName}` : cleanName;
        const familyControls = controls.filter(c => c.family_id === family.id);

        hierarchy.push({
          id: family.id,
          ref_id: family.ref_id,
          title: displayTitle,
          description: family.description || "",
          type: "annex_family",
          isAnnex: true,
          children: [],
          items: familyControls.map(c => ({
            id: c.id, ref_id: c.ref_id, name: c.name,
            description: c.description || "",
            guidance: c.implementation_guidance
          }))
        });
      }
    }

    res.json({ hierarchy });
  } catch (err) {
    console.error("Error fetching hierarchy:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// IMPORT POLICY
// ============================================================
router.post("/import-policy", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    const { standardId, title, version } = req.body;
    if (!standardId) return res.status(400).json({ error: "standardId is required" });

    // Refuse importing a framework you can't see in the first place
    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?",
      [standardId]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Framework not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [existing] = await db.query(
      `SELECT id FROM imported_policies WHERE standard_id = ?`,
      [standardId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Framework already imported" });
    }

    await db.query(
      `INSERT INTO imported_policies (standard_id, title, version)
       VALUES (?, ?, ?)`,
      [standardId, title || "Security Framework", version || "1.0"]
    );
    res.json({ success: true, message: "Framework imported successfully" });
  } catch (err) {
    console.error("import-policy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET IMPORTED POLICIES (only those the user can see)
// ============================================================
router.get("/imported-policies", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.json([]);

    const { whereClause, params } = visibilityClause(ctx, "s");
    const [imports] = await db.query(`
      SELECT
        ip.standard_id AS id,
        ip.title       AS name,
        ip.version,
        ip.imported_at
      FROM imported_policies ip
      JOIN ciso_standards s ON s.id = ip.standard_id
      WHERE ${whereClause}
      ORDER BY ip.imported_at DESC
    `, params);
    res.json(imports);
  } catch (err) {
    console.error("Error fetching imported policies:", err);
    res.json([]);
  }
});

// ============================================================
// GET imported (with controls + exceptions) — same visibility filter
// ============================================================
router.get("/imported", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.json([]);

    const { whereClause, params } = visibilityClause(ctx, "s");
    const [frameworks] = await db.query(`
      SELECT ip.standard_id, ip.title, ip.version
      FROM imported_policies ip
      JOIN ciso_standards s ON s.id = ip.standard_id
      WHERE ${whereClause}
    `, params);

    const result = [];
    for (const fw of frameworks) {
      const [chapters]   = await db.query("SELECT * FROM ciso_core_chapters WHERE standard_id = ?", [fw.standard_id]);
      const [families]   = await db.query("SELECT * FROM ciso_families       WHERE standard_id = ?", [fw.standard_id]);
      const [controls]   = await db.query("SELECT * FROM ciso_controls       WHERE standard_id = ?", [fw.standard_id]);
      const [exceptions] = await db.query(
        "SELECT entity_id, entity_type FROM policy_exceptions WHERE standard_id = ? AND is_active = TRUE",
        [fw.standard_id]
      );

      const exceptionChapters = new Set(exceptions.filter(e => e.entity_type === "chapter").map(e => e.entity_id));
      const exceptionControls = new Set(exceptions.filter(e => e.entity_type === "control").map(e => e.entity_id));

      const controlsFinal = controls.map(ctrl => ({
        ...ctrl,
        is_exception: exceptionChapters.has(ctrl.family_id) || exceptionControls.has(ctrl.id)
      }));

      result.push({
        standard_id: fw.standard_id,
        title: fw.title,
        version: fw.version,
        core_chapters: chapters,
        families,
        controls: controlsFinal
      });
    }
    res.json(result);
  } catch (err) {
    console.error("imported error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// UNIMPORT POLICY  — only owner or admin
// ============================================================
router.delete("/unimport-policy", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    const { policyId } = req.body;
    if (!policyId) return res.status(400).json({ error: "policyId is required" });

    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?",
      [policyId]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Framework not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    await db.query("DELETE FROM policy_exceptions WHERE standard_id = ?", [policyId]);
    await db.query("DELETE FROM imported_policies WHERE standard_id = ?", [policyId]);
    res.json({ success: true, message: "Framework removed successfully" });
  } catch (err) {
    console.error("unimport-policy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXCEPTIONS
// ============================================================
router.post("/add-exception", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    const { policyId, standardId, level, title, reason } = req.body;
    if (!policyId || !reason || !standardId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?",
      [standardId]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Framework not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const entityType = level === "chapter" ? "chapter" : "control";

    const [existing] = await db.query(
      `SELECT id FROM policy_exceptions WHERE standard_id = ? AND entity_id = ? AND entity_type = ?`,
      [standardId, policyId, entityType]
    );
    if (existing.length > 0) {
      await db.query(
        `UPDATE policy_exceptions SET reason = ?, is_active = TRUE
         WHERE standard_id = ? AND entity_id = ? AND entity_type = ?`,
        [reason, standardId, policyId, entityType]
      );
    } else {
      await db.query(
        `INSERT INTO policy_exceptions (standard_id, entity_id, entity_type, title, reason, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [standardId, policyId, entityType, title || "", reason]
      );
    }

    if (entityType === "chapter") {
      await db.query(`
        INSERT IGNORE INTO policy_exceptions
          (standard_id, entity_id, entity_type, title, reason, is_active)
        SELECT ?, c.id, 'control', ?, ?, TRUE
        FROM ciso_controls c
        WHERE c.family_id = ?
      `, [standardId, title, reason, policyId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("add-exception error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/all-exceptions", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.json([]);
    const { whereClause, params } = visibilityClause(ctx, "s");

    const [chapters] = await db.query(`
      SELECT pe.entity_id AS id, pe.entity_type AS level, pe.title, pe.reason,
             pe.created_at AS excludedAt, pe.standard_id AS standardId,
             COALESCE(cc.ref_id, cf.ref_id) AS ref_id,
             COALESCE(cc.description, cf.description) AS description
      FROM policy_exceptions pe
      JOIN ciso_standards s ON s.id = pe.standard_id
      LEFT JOIN ciso_core_chapters cc ON cc.id = pe.entity_id
      LEFT JOIN ciso_families     cf ON cf.id = pe.entity_id
      WHERE pe.is_active = TRUE
        AND pe.entity_type = 'chapter'
        AND ${whereClause}
    `, params);

    const [controls] = await db.query(`
      SELECT pe.entity_id AS id, pe.entity_type AS level, pe.title, pe.reason,
             pe.created_at AS excludedAt, pe.standard_id AS standardId,
             c.ref_id, c.description
      FROM policy_exceptions pe
      JOIN ciso_standards s ON s.id = pe.standard_id
      INNER JOIN ciso_controls c ON c.id = pe.entity_id
      WHERE pe.is_active = TRUE
        AND pe.entity_type = 'control'
        AND ${whereClause}
    `, params);

    for (const ch of chapters) {
      const [childs] = await db.query("SELECT id FROM ciso_controls WHERE family_id = ?", [ch.id]);
      ch.childIds = childs.map(c => String(c.id));
    }
    const all = [...chapters, ...controls];
    all.sort((a, b) => new Date(b.excludedAt) - new Date(a.excludedAt));
    res.json(all);
  } catch (err) {
    console.error("Error fetching exceptions:", err);
    res.status(500).json([]);
  }
});

router.get("/exceptions/:standardId", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    const { standardId } = req.params;
    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?",
      [standardId]
    );
    if (!stdRows.length) return res.json([]);
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    const [exceptions] = await db.query(`
      SELECT entity_id AS id, entity_type AS level, title, reason, created_at AS excludedAt
      FROM policy_exceptions
      WHERE standard_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `, [standardId]);
    res.json(exceptions);
  } catch (err) {
    console.error("Error fetching exceptions:", err);
    res.status(500).json([]);
  }
});

router.delete("/remove-exception", authenticateToken, async (req, res) => {
  try {
    const ctx = await getUserContext(req);
    const { entity_id, standardId, entity_type } = req.body;
    if (!entity_id || !standardId || !entity_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [stdRows] = await db.query(
      "SELECT id, created_by_user_id FROM ciso_standards WHERE id = ?",
      [standardId]
    );
    if (!stdRows.length) return res.status(404).json({ error: "Framework not found" });
    if (!assertCanSeeStandard(stdRows[0], ctx, res)) return;

    await db.query(
      `UPDATE policy_exceptions SET is_active = FALSE
       WHERE standard_id = ? AND entity_id = ? AND entity_type = ?`,
      [standardId, entity_id, entity_type]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("remove-exception error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CUSTOM FRAMEWORK — admin makes it public, user makes it private
// ============================================================
router.post("/add-custom-framework", authenticateToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const ctx = await getUserContext(req);
    if (!ctx.userId) return res.status(401).json({ error: "Login required" });

    const { name, version, provider, description, coreChapters = [], annexFamilies = [] } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "Framework name is required" });
    if (!Array.isArray(coreChapters) || coreChapters.length === 0)
      return res.status(400).json({ error: "At least one core chapter is required" });

    // Admin creations are public, regular users own theirs privately
    const ownerId = ctx.isAdmin ? null : ctx.userId;

    // The id always carries the creator (or "admin") so it stays unique even
    // when the framework is public.
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const ownerTag = ctx.isAdmin ? "admin" : `u${ctx.userId}`;
    const standardId = `custom_${ownerTag}_${slug}_${Date.now()}`;

    await conn.beginTransaction();

    let totalControls = 0;
    const countCtrls = (nodes) => {
      for (const n of nodes || []) {
        totalControls += (n.controls || []).length;
        countCtrls(n.children);
      }
    };
    countCtrls(coreChapters);
    for (const f of annexFamilies) totalControls += (f.controls || []).length;

    await conn.query(
      `INSERT INTO ciso_standards
         (id, name, description, version, provider, ref_id, controls_count, created_by_user_id, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [standardId, name.trim(), description || "", version || "1.0",
       provider || "Custom", name.trim(), totalControls, ownerId]
    );

    const insertChapter = async (chapter, parentId, level, order) => {
      const safeRef = (chapter.ref_id || `ch_${order}`).replace(/[^a-zA-Z0-9.]/g, "_");
      const chapterId = `${standardId}__core_${safeRef}_${level}_${order}`;
      await conn.query(
        `INSERT INTO ciso_core_chapters
           (id, standard_id, ref_id, title, description, parent_id, level, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [chapterId, standardId, chapter.ref_id || `ch_${order}`,
         chapter.title || "Untitled", chapter.description || "",
         parentId, level, order]
      );

      for (let i = 0; i < (chapter.controls || []).length; i++) {
        const ctrl = chapter.controls[i];
        const ctrlSafe = (ctrl.ref_id || `ctrl_${i}`).replace(/[^a-zA-Z0-9.]/g, "_");
        await conn.query(
          `INSERT INTO ciso_controls
             (id, family_id, core_chapter_id, standard_id, ref_id, name, description)
           VALUES (?, NULL, ?, ?, ?, ?, ?)`,
          [`${chapterId}__ctrl_${ctrlSafe}_${i}`, chapterId, standardId,
           ctrl.ref_id || `ctrl_${i}`, ctrl.name || "Untitled", ctrl.description || ""]
        );
      }

      for (let i = 0; i < (chapter.children || []).length; i++) {
        await insertChapter(chapter.children[i], chapterId, level + 1, i);
      }
    };
    for (let i = 0; i < coreChapters.length; i++) {
      await insertChapter(coreChapters[i], null, 0, i);
    }

    for (let i = 0; i < annexFamilies.length; i++) {
      const fam = annexFamilies[i];
      const famSafe = (fam.ref_id || `fam_${i}`).replace(/[^a-zA-Z0-9.]/g, "_");
      const familyId = `${standardId}__fam_${famSafe}_${i}`;
      const ctrls = fam.controls || [];
      await conn.query(
        `INSERT INTO ciso_families
           (id, standard_id, ref_id, name, description, display_order, controls_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [familyId, standardId, fam.ref_id || `fam_${i}`,
         fam.name || "Untitled", fam.description || "", i, ctrls.length]
      );
      for (let j = 0; j < ctrls.length; j++) {
        const ctrl = ctrls[j];
        const ctrlSafe = (ctrl.ref_id || `ctrl_${j}`).replace(/[^a-zA-Z0-9.]/g, "_");
        await conn.query(
          `INSERT INTO ciso_controls
             (id, family_id, core_chapter_id, standard_id, ref_id, name, description)
           VALUES (?, ?, NULL, ?, ?, ?, ?)`,
          [`${familyId}__ctrl_${ctrlSafe}_${j}`, familyId, standardId,
           ctrl.ref_id || `ctrl_${j}`, ctrl.name || "Untitled", ctrl.description || ""]
        );
      }
    }

    await conn.commit();
    res.json({
      success: true,
      id: standardId,
      name: name.trim(),
      is_custom: true,
      visibility: ownerId === null ? "public" : "private",
      created_by_user_id: ownerId
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error("add-custom-framework error:", err);
    res.status(500).json({
      error: err.message, code: err.code, sqlMessage: err.sqlMessage, sql: err.sql
    });
  } finally {
    conn.release();
  }
});

export default router;