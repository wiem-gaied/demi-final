import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post("/import-policy", async (req, res) => {
  try {

    const { policyId, level, title, version, chapters_count, items_count } = req.body;
    const userId = req.user?.id || 1;

    await db.query(
      `INSERT INTO imported_policies (user_id, policy_id, level, title, version, chapters_count, items_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title),
       chapters_count = VALUES(chapters_count),
         items_count = VALUES(items_count)`,
      [userId, policyId, level, title, version || "1.0",  chapters_count || null, items_count || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed" });
  }
});
router.get("/imported-policies", async (req, res) => {
  const userId = req.user?.id || 1;

  try {
    const [rows] = await db.query(
      `SELECT policy_id, level, title, version
       FROM imported_policies
       WHERE user_id = ?`,
      [userId]
    );

    // Normalize output
    const result = rows.map(r => ({
      id: r.policy_id,
      level: r.level.toLowerCase(),
      title: r.title,
      version: r.version,
      chapters_count: r.chapters_count,
      items_count: r.items_count
    }));

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/imported", async (req, res) => {
  const userId = req.user?.id || 1;

  try {
    // 1. Récupérer les exceptions
    const [exceptions] = await db.query(`
      SELECT * FROM policy_exceptions
      WHERE user_id = ?
    `, [userId]);

    const excludedPackages = new Set(
      exceptions.filter(e => e.level === "package").map(e => e.policy_id)
    );

    const excludedChapters = new Set(
      exceptions.filter(e => e.level === "chapter").map(e => e.policy_id)
    );

    const excludedItems = new Set(
      exceptions.filter(e => e.level === "item").map(e => e.policy_id)
    );

    // 2. Packages importés
    const [packages] = await db.query(`
      SELECT p.* 
      FROM imported_policies ip
      JOIN packages p ON ip.policy_id = p.id
      WHERE ip.level = 'package' AND ip.user_id = ?
    `, [userId]);

    if (packages.length === 0) return res.json([]);

    // 🔥 Filtrer packages exclus
    const filteredPackages = packages.filter(
      pkg => !excludedPackages.has(pkg.id)
    );

    if (filteredPackages.length === 0) return res.json([]);

    const packageIds = filteredPackages.map(p => p.id);

    // 3. Chapters
    const [chapters] = await db.query(`
      SELECT * FROM chapters
      WHERE package_id IN (?)
    `, [packageIds]);

    // 🔥 Filtrer chapters exclus + ceux appartenant à un package exclu
    const filteredChapters = chapters.filter(
      ch =>
        !excludedChapters.has(ch.id) &&
        !excludedPackages.has(ch.package_id)
    );

    const chapterIds = filteredChapters.map(c => c.id);

    if (chapterIds.length === 0) {
      return res.json(filteredPackages.map(pkg => ({
        ...pkg,
        chapters: []
      })));
    }

    
    // 4. Items
   
    const [items] = await db.query(`
      SELECT * FROM items
      WHERE chapter_id IN (?)
    `, [chapterIds]);

    //  Filtrer items exclus + ceux appartenant à un chapter exclu
    const filteredItems = items.filter(
      item =>
        !excludedItems.has(item.id) &&
        !excludedChapters.has(item.chapter_id)
    );

    const result = filteredPackages.map(pkg => ({
      ...pkg,
      chapters: filteredChapters
        .filter(c => c.package_id === pkg.id)
        .map(ch => ({
          ...ch,
          items: filteredItems.filter(i => i.chapter_id === ch.id)
        }))
    }));

    res.json(result);

  } catch (err) {
    console.error("Error in /imported:", err);
    res.status(500).json({ error: "Server error" });
  }
});
router.delete("/unimport-policy", async (req, res) => {
  try {
    const { policyId, level } = req.body;
    const userId = req.user?.id || 1;

    // ITEM → delete only itself
    if (level === "item") {
      await db.query(
        `DELETE FROM imported_policies 
         WHERE user_id = ? AND policy_id = ? AND level = 'item'`,
        [userId, policyId]
      );
    }

    // CHAPTER → delete chapter + its items
    else if (level === "chapter") {
      await db.query(
        `DELETE FROM imported_policies 
         WHERE user_id = ? 
         AND (policy_id = ? OR level = 'item')`,
        [userId, policyId]
      );
    }

    // PACKAGE → delete everything related
    else if (level === "package") {
      await db.query(
        `DELETE FROM imported_policies 
         WHERE user_id = ?`,
        [userId]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});
router.post("/add-exception", async (req, res) => {
  try {
    const { policyId, level, title, reason } = req.body;
    const userId = req.user?.id || 1;

    await db.query(
      `INSERT INTO policy_exceptions (user_id, policy_id, level, title, reason)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [userId, policyId, level, title, reason]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Add exception failed" });
  }
});
router.get("/exceptions", async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    const [rows] = await db.query(
      `SELECT policy_id AS id, level, title, reason
       FROM policy_exceptions
       WHERE user_id = ?`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch exceptions failed" });
  }
});
router.post("/remove-exception", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const { policyId, level } = req.body;
    const userId = req.user?.id || 1;
    console.log("userId:", userId);
console.log("policyId:", policyId);
console.log("level:", level);

    await db.query(
      `DELETE FROM policy_exceptions
       WHERE user_id = ? AND policy_id = ? AND level = ?`,
      [userId, policyId, level]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete exception failed" });
  }
});



 export default router;