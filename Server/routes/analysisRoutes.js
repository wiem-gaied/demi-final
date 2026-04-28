// backend/routes/analysisRoutes.js
// =====================================================================
//  COMPLIANCE ANALYSES — adapted to the EXISTING database schema
//  (no new tables — uses: risks, business_risks, risk_assets,
//   risk_threats, risk_vulnerabilities, mitigation_plans, assets,
//   threats, vulnerabilities)
//
//  Mount in your server.js with:
//    import analysisRoutes from "./routes/analysisRoutes.js";
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
      // merge arrays (assets, threats, vulnerabilities, mitigationPlan)
      const merge = (arrA = [], arrB = []) =>
        Array.from(new Set([...(arrA || []), ...(arrB || [])].filter(Boolean)));
      dup.assets         = merge(dup.assets, r.assets);
      dup.threats        = merge(dup.threats, r.threats);
      dup.vulnerabilities= merge(dup.vulnerabilities, r.vulnerabilities);
      dup.mitigationPlan = merge(dup.mitigationPlan, r.mitigationPlan);
      // keep the most severe impact / probability
      dup.impact      = Math.max(dup.impact      ?? 1, r.impact      ?? 1);
      dup.probabilite = Math.max(dup.probabilite ?? 1, r.probabilite ?? 1);
      // if duplicate is asset-only and new is business (or vice-versa) → both
      if (dup.risk_class !== r.risk_class) dup.risk_class = "both";
    } else {
      kept.push({ ...r });
    }
  }
  return kept;
}

// ---------------------------------------------------------------------
// POST /api/analyses
//  → Persists the validated analysis. Because compliance_analyses
//    tables do not exist in the DB, we ONLY persist what your real
//    schema can hold: risks, business_risks, their joins, mitigations.
//  → Returns aggregate KPIs computed from the payload (so the UI can
//    show them right away).
// ---------------------------------------------------------------------
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    console.log("✅ ROUTE /api/analyses HIT");
    await conn.beginTransaction();

    const {
      title,
      document_name,
      standard_name,
      created_by_name,
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
      scoreSum += sc;
      total++;
      if      (finalStatus === "Covered") covered++;
      else if (finalStatus === "Partial") partial++;
      else                                notCovered++;
    }
    const globalScore = total ? Math.round(scoreSum / total) : 0;

    // ── Persist risks for each policy ─────────────────────────────
    const createdRiskIds        = [];
    const createdBusinessRiskIds = [];

    for (const p of policies) {
      // dedupe risks for this policy (anti-reformulation)
      const dedupedRisks = deduplicateRisks(p.risks || []);

      for (const risk of dedupedRisks) {
        if (!risk?.intitule && !risk?.description) continue;
        const intitule    = (risk.intitule || (risk.description || "").slice(0, 100)).trim();
        const description = risk.description || "";
        const cls         = risk.risk_class || "asset"; // 'asset' | 'business' | 'both'

        // ── ASSET RISK side ───────────────────────────────────────
        if (cls === "asset" || cls === "both") {
          const [rRes] = await conn.query(
            `INSERT INTO risks
              (intitule, categorie, source, owner, description,
               impact, probabilite, statut, dueDate)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
              intitule,
              risk.categorie || "Information Security",
              `Compliance Analysis: ${title}`,
              risk.owner || created_by_name || "",
              description,
              risk.impact      ?? 2,
              risk.probabilite ?? 2,
              "Open",
              risk.dueDate || null,
            ]
          );
          const riskId = rRes.insertId;
          createdRiskIds.push(riskId);

          // mitigation_plans
          for (const m of (risk.mitigationPlan || [])) {
            if (!m) continue;
            await conn.query(
              `INSERT INTO mitigation_plans
                (risk_id, action, priority, status, due_date)
               VALUES (?,?,?,?,?)`,
              [riskId, m, "Medium", "Open", risk.dueDate || null]
            );
          }

          // ── ASSETS ── now driven by IDs (multi-select from UI)
          const assetIds = Array.isArray(risk.asset_ids) ? risk.asset_ids : [];
          for (const aid of assetIds) {
            if (!aid) continue;
            await conn.query(
              `INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`,
              [riskId, aid]
            );
          }
          // legacy support — names (in case some old caller still sends them)
          for (const a of (risk.assets || [])) {
            if (!a) continue;
            const [ar] = await conn.query(
              `SELECT id FROM assets WHERE intitule = ? LIMIT 1`, [a]);
            let aid = ar[0]?.id;
            if (!aid) {
              const [ai] = await conn.query(
                `INSERT INTO assets (intitule, type) VALUES (?, 'Other')`, [a]);
              aid = ai.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`,
              [riskId, aid]);
          }

          // ── THREATS
          for (const t of (risk.threats || [])) {
            if (!t) continue;
            const [tr] = await conn.query(
              `SELECT id FROM threats WHERE name = ? LIMIT 1`, [t]);
            let tid = tr[0]?.id;
            if (!tid) {
              const [ti] = await conn.query(
                `INSERT INTO threats (name) VALUES (?)`, [t]);
              tid = ti.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_threats (risk_id, threat_id) VALUES (?,?)`,
              [riskId, tid]);
          }

          // ── VULNERABILITIES
          for (const v of (risk.vulnerabilities || [])) {
            if (!v) continue;
            const [vr] = await conn.query(
              `SELECT id FROM vulnerabilities WHERE name = ? LIMIT 1`, [v]);
            let vid = vr[0]?.id;
            if (!vid) {
              const [vi] = await conn.query(
                `INSERT INTO vulnerabilities (name) VALUES (?)`, [v]);
              vid = vi.insertId;
            }
            await conn.query(
              `INSERT IGNORE INTO risk_vulnerabilities (risk_id, vulnerability_id) VALUES (?,?)`,
              [riskId, vid]);
          }
        }

        // ── BUSINESS RISK side ────────────────────────────────────
        if (cls === "business" || cls === "both") {
          const [bRes] = await conn.query(
            `INSERT INTO business_risks
              (title, description, category, department, owner,
               dueDate, probability, impact, status, treatment,
               mitigationPlan, createdAt)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,
            [
              intitule,
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
            ]
          );
          createdBusinessRiskIds.push(bRes.insertId);
        }
      }
    }

    await conn.commit();
    return res.json({
      success: true,
      // We don't persist the analysis itself (no compliance_analyses table),
      // but we return the same shape your UI expects:
      analysis_id:  null,
      global_score: globalScore,
      total_items:  total,
      covered, partial, notCovered,
      created_risk_ids:          createdRiskIds,
      created_business_risk_ids: createdBusinessRiskIds,
      message: "Risks persisted. (Analysis history requires the compliance_analyses table — currently absent from the schema.)",
    });
  } catch (e) {
    await conn.rollback();
    console.error("save analysis error:", e);
    return res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------
// GET /api/analyses/assets — list all assets (for the UI multi-select)
// ---------------------------------------------------------------------
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

export default router;