import express from "express";
import db from "../db.js";

const router = express.Router();
router.post("/", async(req,res) =>{
    try{
        const {
            intitule,
            type,
            Location,
            owner
        } = req.body;
        const [result] = await db.query(`INSERT INTO assets
            (intitule, type, Location, owner) 
                VALUES (?, ?, ?, ?)`,
            [intitule, type, Location, owner]);
        const [rows] = await db.query("SELECT * FROM assets WHERE id = ?", [result.insertId]);

            res.status(201).json(rows[0]);

        } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
        }
    
});
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM assets");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router.get("/assets-withrisks", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id AS asset_id,
        a.intitule AS asset_intitule,
        a.type,
        a.Location,
        a.owner,
        r.id AS risk_id,
        r.intitule AS risk_intitule,
        r.categorie,
        r.impact,
        r.probabilite,
        r.statut
      FROM assets a
      LEFT JOIN risk_assets ra ON ra.asset_id = a.id
      LEFT JOIN risks r ON r.id = ra.risk_id
      ORDER BY a.id
    `);

    const assetsMap = new Map();

    rows.forEach(row => {
      if (!assetsMap.has(row.asset_id)) {
        assetsMap.set(row.asset_id, {
          id: row.asset_id,
          intitule: row.asset_intitule,
          type: row.type,
          Location: row.Location,
          owner: row.owner,
          risks: []
        });
      }

      if (row.risk_id) {
        assetsMap.get(row.asset_id).risks.push({
          id: row.risk_id,
          intitule: row.risk_intitule,
          categorie: row.categorie,
          impact: row.impact,
          probabilite: row.probabilite,
          statut: row.statut
        });
      }
    });

    res.json(Array.from(assetsMap.values()));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM assets WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. supprimer les relations
    await db.query(
      "DELETE FROM risk_assets WHERE asset_id = ?",
      [id]
    );

    // 2. supprimer l'asset
    const [result] = await db.query(
      "DELETE FROM assets WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json({
      message: "Asset deleted successfully",
      affectedRows: result.affectedRows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});
export default router;
