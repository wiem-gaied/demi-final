import express from "express";
import db from "../db.js";

const router = express.Router();

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