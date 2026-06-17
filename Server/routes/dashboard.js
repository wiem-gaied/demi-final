// backend/routes/dashboard.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// ─── Canonicalise la norme ───────────────────────────────────────────
function canonicalStandard(standardId, standardName) {
  const s = `${standardId || ""} ${standardName || ""}`.toLowerCase();

  if (s.includes("27001")) return {
    id: "international_standard_iso_iec_27001_2022",
    name: "ISO/IEC 27001:2022", short: "ISO 27001",
    desc: "Information security",
  };
  if (s.includes("22301")) return {
    id: "international_standard_iso_iec_22301_2019",
    name: "ISO/IEC 22301:2019", short: "ISO 22301",
    desc: "Business continuity",
  };
  if (s.includes("nist")) return {
    id: "nist_csf_2_0",
    name: "NIST CSF 2.0", short: "NIST CSF",
    desc: "Cybersecurity Framework",
  };

  const clean = String(standardName || standardId || "Unknown").replace(/_/g, " ").trim();
  return {
    id: standardId || clean,
    name: clean,
    short: clean.slice(0, 14),
    desc: "Compliance framework",
  };
}

// =====================================================================
// GET /api/dashboard/overview
//   - global_score recalculé depuis analysis_items.ciso_status
//   - chaque norme : score actuel + score de l'analyse précédente
// =====================================================================
router.get("/overview", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.id,
        a.standard_id,
        a.standard_name,
        COALESCE(stats.computed_score, a.global_score, 0) AS global_score,
        DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ')   AS created_at_str,
        UNIX_TIMESTAMP(a.created_at)                      AS created_at_unix
      FROM compliance_analyses a
      LEFT JOIN (
        SELECT
          analysis_id,
          ROUND(AVG(
            CASE COALESCE(NULLIF(ciso_status, ''), ai_status)
              WHEN 'Covered'     THEN 100
              WHEN 'Partial'     THEN  50
              WHEN 'Not covered' THEN   0
            END
          )) AS computed_score
        FROM analysis_items
        WHERE COALESCE(NULLIF(ciso_status, ''), ai_status) <> 'Not applicable'
        GROUP BY analysis_id
      ) stats ON stats.analysis_id = a.id
      WHERE a.status = 'finalized'
        AND a.standard_id IS NOT NULL
      ORDER BY a.created_at ASC
    `);

    // Group by canonical norm, keep score history (ascending by date)
    const groups = new Map();
    for (const r of rows) {
      const c = canonicalStandard(r.standard_id, r.standard_name);
      if (!groups.has(c.id)) groups.set(c.id, { meta: c, hist: [] });
      groups.get(c.id).hist.push({
        score: Number(r.global_score) || 0,
        str:   r.created_at_str,
        unix:  Number(r.created_at_unix),
      });
    }

    // Une carte par norme analysée — latest + previous
    const standards = [];
    for (const { meta, hist } of groups.values()) {
      const latest = hist[hist.length - 1];
      const prev   = hist.length > 1 ? hist[hist.length - 2] : null;
      standards.push({
        standard_id:   meta.id,
        standard_name: meta.name,
        short_name:    meta.short,
        description:   meta.desc,
        score:         latest.score,
        prev_score:    prev ? prev.score : null,
        prev_at:       prev ? prev.str   : null,
        trend:         prev ? latest.score - prev.score : 0,
        last_at:       latest.str,
        last_unix:     latest.unix,
        nb_analyses:   hist.length,
      });
    }

    // Global score = moyenne des scores latest de chaque norme
    const globalScore = standards.length
      ? Math.round(standards.reduce((sum, s) => sum + s.score, 0) / standards.length)
      : 0;

    // lastAuditDays — jours depuis la dernière analyse finalisée (toutes normes)
    const [latestRow] = await db.query(`
      SELECT UNIX_TIMESTAMP(MAX(created_at)) AS latest_unix
      FROM compliance_analyses
      WHERE status = 'finalized'
    `);
    let lastAuditDays = 999;
    const latestUnix = Number(latestRow[0]?.latest_unix ?? 0);
    if (latestUnix > 0) {
      lastAuditDays = Math.max(
        0,
        Math.floor((Math.floor(Date.now() / 1000) - latestUnix) / 86_400)
      );
    }

    res.json({ globalScore, lastAuditDays, standards });
  } catch (e) {
    console.error("dashboard overview error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// GET /api/dashboard/priority-actions
//   Toutes les normes (pas juste ISO 27001),
//   exclut les risques Resolved/Closed et les actions Done/Completed.
// =====================================================================
router.get("/priority-actions", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        mp.id,
        mp.action,
        mp.priority,
        mp.status         AS action_status,
        mp.due_date,
        mp.progress,
        mp.assigned_to,
        r.id              AS risk_id,
        r.intitule        AS risk_title,
        r.statut          AS risk_status,
        r.analysis_id,
        ca.standard_id    AS norm_id,
        ca.standard_name  AS norm_name
      FROM mitigation_plans mp
      JOIN risks r ON mp.risk_id = r.id
      LEFT JOIN compliance_analyses ca ON r.analysis_id = ca.id
      WHERE (r.statut  IS NULL OR r.statut  NOT IN ('Resolved', 'Closed'))
        AND (mp.status IS NULL OR mp.status NOT IN ('Done', 'Completed'))
      ORDER BY
        FIELD(mp.priority, 'Critical', 'High', 'Medium', 'Low'),
        mp.due_date ASC
    `);

    // Expose l'id canonique de la norme pour que le front affiche "ISO 27001" etc.
    const out = rows.map(r => ({
      ...r,
      norm: r.norm_id ? canonicalStandard(r.norm_id, r.norm_name).id : null,
    }));

    res.json(out);
  } catch (e) {
    console.error("priority-actions error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;