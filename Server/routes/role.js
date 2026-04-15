import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {

    const [rows] = await db.query("SELECT DISTINCT role FROM users");

    
    const roles = rows.map(r => r.role);


    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;