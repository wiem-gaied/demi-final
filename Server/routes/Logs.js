import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const user = req.session?.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Requête de base
    let query = `
      SELECT 
        l.id,
        l.user_email,
        l.role,
        l.action,
        l.target,
        l.extra_info,
        l.level,
        l.created_at,
        l.ip_address
      FROM logs l
    `;

    const params = [];

    // Filtrage par rôle de l'utilisateur courant
    if (user.role === "admin") {
      query += " WHERE l.role = ? ORDER BY l.created_at DESC";
      params.push("admin");
    } else if (user.role === "auditor") {
      query += " WHERE l.role IN (?, ?) ORDER BY l.created_at DESC";
      params.push("auditor", "user");
    } else {
      query += " WHERE l.user_email = ? ORDER BY l.created_at DESC";
      params.push(user.email);
    }

    const [rows] = await db.query(query, params);

    console.log("LOGS RESULT:", rows);

    res.json(rows);
  } catch (err) {
    console.error("GET /logs error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;