// backend/routes/analysisRoutes.js
// =====================================================================
//  COMPLIANCE ANALYSES — full version
//  - POST /                  → save a new finalized analysis
//  - GET  /                  → list all analyses (light)
//  - GET  /latest            → latest analysis (for dashboard)
//  - GET  /by-standard       → latest analysis per standard
//  - GET  /:id               → full analysis detail (for reporting page)
//  - DELETE /:id             → delete an analysis
//  - GET  /assets            → list assets (for risk multi-select)
//
//  Mount in server.js with:
//    app.use("/api/analyses", analysisRoutes);
// =====================================================================
import express from "express";
import db from "../db.js";

const router = express.Router();

const STATUS_SCORE = { "Covered": 100, "Partial": 50, "Not covered": 0 };

// ---------------------------------------------------------------------
// Helper — normalize a risk description so we can dedupe reformulations
// ---------------------------------------------------------------------
function normalizeText(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")     // strip accents
    .replace(/[^a-z0-9 ]/g, " ")         // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Jaccard token similarity (0..1)
function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter(w => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

// Deduplicate a list of risks (objects with .description) — keeps the
// first occurrence and merges asset/threat/vuln/mitigation arrays.
function deduplicateRisks(risks, threshold = 0.55) {
  const kept = [];
  for (const r of risks) {
    const desc = r.description || r.intitule || "";
    if (!desc.trim()) continue;
    const dup = kept.find(k =>
      jaccard(k.description || k.intitule || "", desc) >= threshold
    );
    if (dup) {
      const merge = (arrA = [], arrB = []) =>
        Array.from(new Set([...(arrA || []), ...(arrB || [])].filter(Boolean)));
      dup.assets         = merge(dup.assets, r.assets);
      dup.asset_ids      = merge(dup.asset_ids, r.asset_ids);
      dup.threats        = merge(dup.threats, r.threats);
      dup.vulnerabilities= merge(dup.vulnerabilities, r.vulnerabilities);
      dup.mitigationPlan = merge(dup.mitigationPlan, r.mitigationPlan);
      dup.impact      = Math.max(dup.impact      ?? 1, r.impact      ?? 1);
      dup.probabilite = Math.max(dup.probabilite ?? 1, r.probabilite ?? 1);
      if (dup.risk_class !== r.risk_class) dup.risk_class = "both";
    } else {
      kept.push({ ...r });
    }
  }
  return kept;
}

function safeJson(v) {
  if (!v) return [];
  if (Array.isArray(v) || typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return []; }
}

// =====================================================================
// POST /api/analyses — save a finalized analysis
// =====================================================================
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    console.log("✅ ROUTE /api/analyses POST HIT");
    await conn.beginTransaction();

    const {
      title, document_name,
      standard_id, standard_name,
      created_by_id, created_by_name,
      policies = [],
    } = req.body;

    if (!title) {
      await conn.rollback();
      return res.status(400).json({ error: "Title is required" });
    }

    // ── KPI roll-up across all items ──────────────────────────────
    const allItems = policies.flatMap(p => p.items || []);
    let covered = 0, partial = 0, notCovered = 0, total = 0, scoreSum = 0;
    for (const it of allItems) {
      const finalStatus = it.ciso_status || it.ai_status || "Not covered";
      const sc = STATUS_SCORE[finalStatus] ?? 0;
      scoreSum += sc; total++;
      if      (finalStatus === "Covered") covered++;
      else if (finalStatus === "Partial") partial++;
      else                                notCovered++;
    }
    const globalScore = total ? Math.round(scoreSum / total) : 0;

    // ── 1) compliance_analyses ────────────────────────────────────
    const [aRes] = await conn.query(
      `INSERT INTO compliance_analyses
        (title, document_name, standard_id, standard_name,
         global_score, covered_count, partial_count, not_covered_count,
         total_items, created_by_id, created_by_name, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'finalized')`,
      [title, document_name || "", standard_id || null, standard_name || "",
       globalScore, covered, partial, notCovered, total,
       created_by_id || null, created_by_name || ""]
    );
    const analysisId = aRes.insertId;

    // ── 2) loop policies ──────────────────────────────────────────
    for (const p of policies) {
      const pItems = p.items || [];
      let pSum = 0;
      for (const it of pItems) {
        const fs = it.ciso_status || it.ai_status || "Not covered";
        pSum += STATUS_SCORE[fs] ?? 0;
      }
      const pScore = pItems.length ? Math.round(pSum / pItems.length) : 0;
      const pStatus = pScore >= 80 ? "Covered" : pScore >= 30 ? "Partial" : "Not covered";

      const [pRes] = await conn.query(
        `INSERT INTO analysis_policies
          (analysis_id, policy_name, policy_summary, policy_score, status)
         VALUES (?,?,?,?,?)`,
        [analysisId, p.policy_name || "Unnamed policy",
         p.policy_summary || "", pScore, pStatus]
      );
      const policyId = pRes.insertId;

      // items
      for (const it of pItems) {
        const fs = it.ciso_status || it.ai_status || "Not covered";
        await conn.query(
          `INSERT INTO analysis_items
            (analysis_id, policy_id, item_id, ref_id, title, type,
             ai_status, ai_confidence, ciso_status, ciso_comment,
             score, evidence)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [analysisId, policyId, String(it.item_id || ""),
           it.ref_id || "", it.title || "", it.type || "annex_control",
           it.ai_status || "Not covered", it.ai_confidence || 0,
           it.ciso_status || null, it.ciso_comment || "",
           STATUS_SCORE[fs] ?? 0,
           JSON.stringify(it.evidence || [])]
        );
      }

      // gaps
      for (const g of (p.gaps || [])) {
        if (!g || !String(g).trim()) continue;
        await conn.query(
          `INSERT INTO analysis_gaps (analysis_id, policy_id, description)
           VALUES (?,?,?)`,
          [analysisId, policyId, String(g)]
        );
      }

      // remediations
      for (const r of (p.remediations || [])) {
        if (!r?.action) continue;
        await conn.query(
          `INSERT INTO analysis_remediations
            (analysis_id, policy_id, action, priority, due_date, assigned_to)
           VALUES (?,?,?,?,?,?)`,
          [analysisId, policyId, r.action,
           r.priority || "Medium",
           r.due_date || null,
           r.assigned_to || ""]
        );
      }

      // ── risks → risks / business_risks (with dedup + asset_ids + "both") ──
      const dedupedRisks = deduplicateRisks(p.risks || []);

      for (const risk of dedupedRisks) {
        if (!risk?.intitule && !risk?.description) continue;
        const intitule    = (risk.intitule || (risk.description || "").slice(0, 100)).trim();
        const description = risk.description || "";
        const cls         = risk.risk_class || "asset";

        // ASSET RISK side
        if (cls === "asset" || cls === "both") {
          const [rRes] = await conn.query(
            `INSERT INTO risks
              (intitule, categorie, source, owner, description,
               impact, probabilite, statut, dueDate, analysis_id, risk_class)
             VALUES (?,?,?,?,?,?,?,?,?,?, 'asset')`,
            [intitule,
             risk.categorie || "Information Security",
             `AI Analysis #${analysisId}`,
             risk.owner || created_by_name || "",
             description,
             risk.impact      ?? 2,
             risk.probabilite ?? 2,
             "Open",
             risk.dueDate || null,
             analysisId]
          );
          const riskId = rRes.insertId;

          // mitigation_plans
          for (const m of (risk.mitigationPlan || [])) {
            if (!m) continue;
            await conn.query(
              `INSERT INTO mitigation_plans
                (risk_id, action, priority, status, due_date)
               VALUES (?,?,?,?,?)`,
              [riskId, m, "Medium", "Open", risk.dueDate || null]);
          }

          // ── ASSETS by ID (multi-select from UI) ──
          const assetIds = Array.isArray(risk.asset_ids) ? risk.asset_ids : [];
          for (const aid of assetIds) {
            if (!aid) continue;
            await conn.query(
              `INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`,
              [riskId, aid]);
          }
          // legacy: by name
          for (const a of (risk.assets || [])) {
            if (!a) continue;
            const [ar] = await conn.query(`SELECT id FROM assets WHERE intitule = ? LIMIT 1`, [a]);
            let aid = ar[0]?.id;
            if (!aid) {
              const [ai] = await conn.query(`INSERT INTO assets (intitule, type) VALUES (?, 'Other')`, [a]);
              aid = ai.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`,
              [riskId, aid]);
          }

          // threats
          for (const t of (risk.threats || [])) {
            if (!t) continue;
            const [tr] = await conn.query(`SELECT id FROM threats WHERE name = ? LIMIT 1`, [t]);
            let tid = tr[0]?.id;
            if (!tid) {
              const [ti] = await conn.query(`INSERT INTO threats (name) VALUES (?)`, [t]);
              tid = ti.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_threats (risk_id, threat_id) VALUES (?,?)`,
              [riskId, tid]);
          }
          // vulnerabilities
          for (const v of (risk.vulnerabilities || [])) {
            if (!v) continue;
            const [vr] = await conn.query(`SELECT id FROM vulnerabilities WHERE name = ? LIMIT 1`, [v]);
            let vid = vr[0]?.id;
            if (!vid) {
              const [vi] = await conn.query(`INSERT INTO vulnerabilities (name) VALUES (?)`, [v]);
              vid = vi.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_vulnerabilities (risk_id, vulnerability_id) VALUES (?,?)`,
              [riskId, vid]);
          }
        }

        // BUSINESS RISK side
        if (cls === "business" || cls === "both") {
          await conn.query(
            `INSERT INTO business_risks
              (title, description, category, department, owner,
               dueDate, probability, impact, status, treatment,
               mitigationPlan, createdAt, analysis_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),?)`,
            [intitule,
             description,
             risk.categorie || "Operational",
             risk.department || "",
             risk.owner || created_by_name || "",
             risk.dueDate || null,
             risk.probabilite ?? 2,
             risk.impact      ?? 2,
             "Open",
             "Mitigate",
             (risk.mitigationPlan || []).join("\n"),
             analysisId]);
        }
      }
    }

    await conn.commit();
    return res.json({
      success: true,
      analysis_id: analysisId,
      global_score: globalScore,
      total_items: total,
      covered, partial, notCovered,
    });
  } catch (e) {
    await conn.rollback();
    console.error("save analysis error:", e);
    return res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// =====================================================================
// GET /api/analyses — list (light)
// =====================================================================
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, title, document_name, standard_id, standard_name,
             global_score, covered_count, partial_count, not_covered_count,
             total_items, created_by_name, created_at, status
      FROM compliance_analyses
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error("list analyses error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// GET /api/analyses/latest — for the dashboard
// =====================================================================
router.get("/latest", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM compliance_analyses
      ORDER BY created_at DESC LIMIT 1
    `);
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================================================================
// GET /api/analyses/by-standard — latest analysis per standard
// =====================================================================
router.get("/by-standard", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*
      FROM compliance_analyses a
      INNER JOIN (
        SELECT standard_id, MAX(created_at) AS max_at
        FROM compliance_analyses
        WHERE standard_id IS NOT NULL
        GROUP BY standard_id
      ) latest
        ON latest.standard_id = a.standard_id
       AND latest.max_at      = a.created_at
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================================================================
// GET /api/analyses/assets — list assets (for risk multi-select)
// =====================================================================
router.get("/assets", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, intitule, type, Location, owner FROM assets ORDER BY intitule`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// GET /api/analyses/:id — full detail (used by reporting page)
// =====================================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [aRows] = await db.query(`SELECT * FROM compliance_analyses WHERE id = ?`, [id]);
    if (!aRows.length) return res.status(404).json({ error: "Analysis not found" });
    const analysis = aRows[0];

    const [policies]     = await db.query(`SELECT * FROM analysis_policies     WHERE analysis_id = ?`, [id]);
    const [items]        = await db.query(`SELECT * FROM analysis_items        WHERE analysis_id = ?`, [id]);
    const [gaps]         = await db.query(`SELECT * FROM analysis_gaps         WHERE analysis_id = ?`, [id]);
    const [remediations] = await db.query(`SELECT * FROM analysis_remediations WHERE analysis_id = ?`, [id]);
    const [aRisks]       = await db.query(`SELECT * FROM risks                 WHERE analysis_id = ?`, [id]);
    const [bRisks]       = await db.query(`SELECT * FROM business_risks        WHERE analysis_id = ?`, [id]);

    const policiesFull = policies.map(p => ({
      ...p,
      items:        items.filter(it => it.policy_id === p.id)
                         .map(it => ({ ...it, evidence: safeJson(it.evidence) })),
      gaps:         gaps.filter(g => g.policy_id === p.id),
      remediations: remediations.filter(r => r.policy_id === p.id),
    }));

    res.json({
      analysis,
      policies: policiesFull,
      asset_risks:    aRisks,
      business_risks: bRisks,
    });
  } catch (e) {
    console.error("get analysis detail error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// DELETE /api/analyses/:id
// =====================================================================
router.delete("/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM compliance_analyses WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;