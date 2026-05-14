// backend/routes/dashboardRoutes.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// =====================================================================
// GET /api/dashboard/overview
// =====================================================================
router.get("/overview", async (_req, res) => {
  try {
    // 1️⃣ Latest finalized analysis per standard + previous score (trend)
    //    ✅ Use UNIX_TIMESTAMP() to avoid Node.js Date/timezone issues
    const [perStd] = await db.query(`
      SELECT
        a.standard_id,
        a.global_score,
        DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_str,
        UNIX_TIMESTAMP(a.created_at)                      AS created_at_unix,
        (
          SELECT global_score
          FROM   compliance_analyses
          WHERE  standard_id = a.standard_id
            AND  created_at  < a.created_at
            AND  status      = 'finalized'
          ORDER  BY created_at DESC
          LIMIT  1
        ) AS prev_score
      FROM compliance_analyses a
      INNER JOIN (
        SELECT   standard_id, MAX(created_at) AS max_at
        FROM     compliance_analyses
        WHERE    standard_id IS NOT NULL
          AND    status = 'finalized'
        GROUP BY standard_id
      ) lt
        ON  lt.standard_id = a.standard_id
        AND lt.max_at      = a.created_at
      WHERE a.status = 'finalized'
    `);

    // 2️⃣ Build standards array
    const standards = perStd.map(r => ({
      standard_id: r.standard_id,
      score:       r.global_score ?? 0,
      trend:       r.prev_score == null
                     ? 0
                     : (r.global_score - r.prev_score),
      last_at:     r.created_at_str,
      last_unix:   Number(r.created_at_unix),
    }));

    // 3️⃣ Global score = average of latest score per analysed standard
    const globalScore = standards.length
      ? Math.round(
          standards.reduce((sum, s) => sum + s.score, 0) / standards.length
        )
      : 0;

    // 4️⃣ lastAuditDays — computed from UNIX timestamps (no timezone ambiguity)
    //    We also query overall latest (covers analyses without standard_id)
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
        ca.standard_id    AS norm
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

    res.json(rows);
  } catch (e) {
    console.error("priority-actions error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;