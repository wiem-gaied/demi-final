import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { category } = req.query;

    const conditions = [];
    const params = [];

    // 🔐 filtre user
    if (user.role === "admin") {
      conditions.push("l.role = ?");
      params.push("admin");
    } else if (user.role === "auditor") {
      conditions.push("l.role IN (?, ?)");
      params.push("auditor", "user");
    } else {
      conditions.push("l.user_email = ?");
      params.push(user.email);
    }

    // 🔥 FILTRE CATEGORY
    if (category && category !== "all") {
      conditions.push("l.category = ?");
      params.push(category.toUpperCase());
    }

    const whereSql = conditions.length > 0
      ? " WHERE " + conditions.join(" AND ")
      : "";

    // ✅ Le tri se fait sur une sous-requête (id uniquement) → plus jamais
    //    d'« Out of sort memory », même avec un gros extra_info.
    const query = `
      SELECT
        l.id, l.user_email, l.role, l.action, l.target, l.extra_info,
        l.level, l.created_at, l.ip_address, l.category
      FROM logs l
      JOIN (
        SELECT l.id
        FROM logs l
        ${whereSql}
        ORDER BY l.created_at DESC
        LIMIT 1000
      ) x ON x.id = l.id
      ORDER BY l.created_at DESC
    `;

    const [rows] = await db.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("GET logs error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT
         l.id, l.user_email, l.role, l.action, l.target, l.extra_info,
         l.level, l.created_at, l.ip_address, l.category
       FROM logs l
       JOIN (
         SELECT id
         FROM logs
         WHERE user_email = ?
         ORDER BY created_at DESC
         LIMIT 1000
       ) x ON x.id = l.id
       ORDER BY l.created_at DESC`,
      [email]
    );

    res.json(rows);
  } catch (err) {
    console.error("🔥 FULL LOG ERROR 👉", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

export default router;