import express from "express";
import db from "../db.js";

const router = express.Router();
router.get("/overview", async (_req, res) => {
  try {
    // most recent analysis
    const [latestRows] = await db.query(`
      SELECT id, global_score, created_at
      FROM compliance_analyses
      ORDER BY created_at DESC
      LIMIT 1`);
    const latest = latestRows[0] || null;
 
    const globalScore   = latest?.global_score ?? 0;
    const lastAuditDays = latest
      ? Math.max(0, Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 86400000))
      : 999;
 
    // latest analysis per standard + its previous one (for trend)
    const [perStd] = await db.query(`
      SELECT a.standard_id, a.global_score, a.created_at,
             (SELECT global_score FROM compliance_analyses
               WHERE standard_id = a.standard_id
                 AND created_at < a.created_at
               ORDER BY created_at DESC LIMIT 1) AS prev_score
      FROM compliance_analyses a
      INNER JOIN (
        SELECT standard_id, MAX(created_at) AS max_at
        FROM compliance_analyses
        WHERE standard_id IS NOT NULL
        GROUP BY standard_id
      ) lt
        ON lt.standard_id = a.standard_id
       AND lt.max_at      = a.created_at
    `);
 
    const standards = perStd.map(r => ({
      standard_id: r.standard_id,
      score:       r.global_score,
      trend:       (r.prev_score == null) ? 0 : (r.global_score - r.prev_score),
      last_at:     r.created_at,
    }));
 
    res.json({ globalScore, lastAuditDays, standards });
  } catch (e) {
    console.error("dashboard overview error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get("/priority-actions", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        mp.id,
        mp.action,
        mp.priority,
        mp.status AS action_status,
        mp.due_date,
        mp.progress,
        mp.assigned_to,
        r.id AS risk_id,
        r.intitule AS risk_title,
        r.statut AS risk_status
      FROM mitigation_plans mp
      JOIN risks r ON mp.risk_id = r.id
      WHERE r.statut != 'Resolved'
      AND mp.status != 'Done'
      ORDER BY 
        FIELD(mp.priority, 'High', 'Medium', 'Low'),
        mp.due_date ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;