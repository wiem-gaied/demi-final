import express from "express";
import db from "../db.js";

const router = express.Router();

// GET all business risks
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM business_risks ORDER BY createdAt DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD risk
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      department,
      owner,
      dueDate,
      probability,
      impact,
      status,
      treatment,
      mitigationPlan,
    } = req.body;

    const createdAt = new Date();

    const [result] = await db.query(
      `INSERT INTO business_risks 
      (title, description, category, department, owner, dueDate, probability, impact, status, treatment, mitigationPlan, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        category,
        department,
        owner,
        dueDate,
        probability,
        impact,
        status,
        treatment,
        mitigationPlan,
        createdAt,
      ]
    );

    res.json({ id: result.insertId, ...req.body, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE business_risks SET ? WHERE id = ?`,
      [req.body, id]
    );

    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM risks WHERE id = ?", [id]);

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;