
import express from "express";
import db from "../db.js"; 
import { activityLogger } from "../middlewares/activityLogger.js";

const router = express.Router();

// ─── Ajouter une entreprise ─────────────────────────────
router.post("/",activityLogger("ADD_Company"), async (req, res, next) => {
  if (!req.session?.user) {
      return res.status(401).json({ message: "Admin non authentifié" });
    }
    next();
  },
  
  async (req, res) => {
  const { name, sector, email, website, phone } = req.body;

  if (!name) return res.status(400).json({ message: "Le nom est requis" });

  try {
    const [result] = await db.query(
      "INSERT INTO companies (name, sector, email, website, phone) VALUES (?, ?, ?, ?, ?)",
      [name, sector || "Autre", email, website, phone]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      sector: sector || "Autre",
      email,
      website,
      phone
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─── Récupérer toutes les entreprises ─────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM companies ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.delete("/:id", activityLogger("DELETE_Company", { table: "companies", nameColumn: "name" }),async (req, res, next) => {
  if (!req.session?.user) return res.status(401).json({ message: "Admin non authentifié" });

  const id = req.params.id;

  // Récupérer le nom avant suppression
  try {
    const [rows] = await db.query("SELECT name FROM companies WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Entreprise non trouvée" });

    req.companyName = rows[0].name; // passe le nom à adminLogger

    next(); // passe au middleware adminLogger
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
},  async (req, res) => {
  try {
    const [result] = await db.execute("DELETE FROM companies WHERE id = ?", [req.params.id]);
    res.json({ message: `Entreprise "${req.companyName}" supprimée avec succès` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;