// backend/routes/dashboard.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// ---------------------------------------------------------------------
// Canonicalise a messy standard id/name into one of the 3 known norms.
// The stored standard_id is a CISO library id (e.g. "library iso2"),
// so we look at BOTH the id and the saved standard_name to decide.
// ---------------------------------------------------------------------
function canonicalStandard(standardId, standardName) {
  const s = `${standardId || ""} ${standardName || ""}`.toLowerCase();

  if (s.includes("27001"))
    return {
      id: "international_standard_iso_iec_27001_2022",
      name: "ISO/IEC 27001:2022",
      short: "ISO 27001",
      desc: "Information security",
    };
  if (s.includes("22301"))
    return {
      id: "international_standard_iso_iec_22301_2019",
      name: "ISO/IEC 22301:2019",
      short: "ISO 22301",
      desc: "Business continuity",
    };
  if (s.includes("nist"))
    return {
      id: "nist_csf_2_0",
      name: "NIST CSF 2.0",
      short: "NIST CSF",
      desc: "Cybersecurity Framework",
    };

  // Unknown norm — keep it visible but with a cleaned-up label
  const clean = String(standardName || standardId || "Unknown")
    .replace(/_/g, " ")
    .trim();
  return {
    id: standardId || clean,
    name: clean,
    short: clean.slice(0, 14),
    desc: "Compliance framework",
  };
}

// =====================================================================
// GET /api/dashboard/overview
// =====================================================================
router.get("/overview", async (_req, res) => {
  try {
    // All finalized analyses (oldest -> newest) so we can group by the
    // real norm and compute the trend vs the previous analysis.
    const [rows] = await db.query(`
      SELECT
        standard_id,
        standard_name,
        global_score,
        DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_str,
        UNIX_TIMESTAMP(created_at)                    AS created_at_unix
      FROM   compliance_analyses
      WHERE  status = 'finalized'
        AND  standard_id IS NOT NULL
      ORDER  BY created_at ASC
    `);

    // Group by canonical norm, keeping the score history (ascending)
    const groups = new Map();
    for (const r of rows) {
      const c = canonicalStandard(r.standard_id, r.standard_name);
      if (!groups.has(c.id)) groups.set(c.id, { meta: c, hist: [] });
      groups.get(c.id).hist.push({
        score: r.global_score ?? 0,
        str:   r.created_at_str,
        unix:  Number(r.created_at_unix),
      });
    }

    // One card per analysed norm — latest score + trend vs previous
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
        trend:         prev ? latest.score - prev.score : 0,
        last_at:       latest.str,
        last_unix:     latest.unix,
      });
    }

    // Global score = average of each analysed norm's latest score
    const globalScore = standards.length
      ? Math.round(
          standards.reduce((sum, s) => sum + s.score, 0) / standards.length
        )
      : 0;

    // lastAuditDays — separate query so analyses without a standard_id
    // still count towards "days since last analysis"
    const [latestRow] = await db.query(`
      SELECT UNIX_TIMESTAMP(MAX(created_at)) AS latest_unix
      FROM   compliance_analyses
      WHERE  status = 'finalized'
    `);

    let lastAuditDays = 999;
    const latestUnix = Number(latestRow[0]?.latest_unix ?? 0);
    if (latestUnix > 0) {
      const nowUnix = Math.floor(Date.now() / 1000);
      lastAuditDays = Math.max(0, Math.floor((nowUnix - latestUnix) / 86_400));
    }

    res.json({ globalScore, lastAuditDays, standards });
  } catch (e) {
    console.error("dashboard overview error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// GET /api/dashboard/priority-actions
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
        ca.standard_id    AS norm_id,
        ca.standard_name  AS norm_name
      FROM mitigation_plans mp
      JOIN risks r
        ON mp.risk_id = r.id
      LEFT JOIN compliance_analyses ca
        ON r.analysis_id = ca.id
      WHERE r.statut  != 'Resolved'
        AND mp.status != 'Done'
      ORDER BY
        FIELD(mp.priority, 'Critical', 'High', 'Medium', 'Low'),
        mp.due_date ASC
      LIMIT 50
    `);

    // Expose the canonical norm id so the UI shows "ISO 27001" etc.
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
