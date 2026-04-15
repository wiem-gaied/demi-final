import express from "express"
import db from "../db.js"
import { activityLogger } from "../middlewares/activityLogger.js";

const router = express.Router();

// ==================== PACKAGES ROUTES ====================

// Route pour créer un nouveau package
router.post("/packages",activityLogger("CREATE_Package"), async (req, res) => {
  try {
    const { title, version, description, organization } = req.body;

    if (!title || !version) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: title, version are required" 
      });
    }

    const [result] = await db.query(
      `INSERT INTO packages (title, version, description, organization)
       VALUES (?, ?, ?, ?)`,
      [title, version, description || null, organization || null]
    );

    res.json({ success: true, id: result.insertId });
    
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour récupérer tous les packages
router.get("/packages", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM packages ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour récupérer un package spécifique
router.get("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query(
      "SELECT * FROM packages WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Package not found" 
      });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour supprimer un package
router.delete("/packages/:id",  activityLogger("DELETE_PACKAGE", { table: "packages", nameColumn: "title" }),async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete all items from chapters first
    await db.query(`
      DELETE items FROM items 
      INNER JOIN chapters ON items.chapter_id = chapters.id 
      WHERE chapters.package_id = ?
    `, [id]);
    
    // Then delete chapters
    await db.query("DELETE FROM chapters WHERE package_id = ?", [id]);
    
    // Finally delete the package
    const [result] = await db.query(
      "DELETE FROM packages WHERE id = ?",
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Package not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Package deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour mettre à jour un package
router.put("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, version, description, organization } = req.body;
    
    const [result] = await db.query(
      `UPDATE packages 
       SET title = ?, version = ?, description = ?, organization = ?
       WHERE id = ?`,
      [title, version, description || null, organization || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Package not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Package updated successfully" 
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== CHAPTERS ROUTES ====================

// Route pour créer un chapitre
router.post("/chapters",activityLogger("CREATE_chapter"), async (req, res) => {
  try {
    const { package_id, title, description } = req.body;

    if (!package_id || !title) {
      return res.status(400).json({
        success: false,
        error: "package_id and title are required"
      });
    }

    const [result] = await db.query(
      `INSERT INTO chapters (package_id, title, description)
       VALUES (?, ?, ?)`,
      [package_id, title, description || null]
    );

    res.json({
      success: true,
      id: result.insertId
    });
  } catch (error) {
    console.error("Error creating chapter:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour récupérer les chapitres d'un package
router.get("/chapters/:package_id", async (req, res) => {
  try {
    const { package_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM chapters WHERE package_id = ? ORDER BY id ASC`,
      [package_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour supprimer un chapitre
router.delete("/chapters/:id",activityLogger("DELETE_Chapter", { table: "chapters", nameColumn: "title" }), async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all items in this chapter
    await db.query("DELETE FROM items WHERE chapter_id = ?", [id]);
    
    // Then delete the chapter
    const [result] = await db.query(
      "DELETE FROM chapters WHERE id = ?",
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Chapter not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Chapter deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== ITEMS ROUTES ====================

// Route pour créer un item (policy)
router.post("/items",activityLogger("CREATE_item"), async (req, res) => {
  try {
    const { chapter_id, title, description, type } = req.body;

    if (!chapter_id || !title || !type) {
      return res.status(400).json({
        success: false,
        error: "chapter_id, title and type are required"
      });
    }

    const [result] = await db.query(
      `INSERT INTO items (chapter_id, title, description, type)
       VALUES (?, ?, ?, ?)`,
      [chapter_id, title, description || null, type]
    );

    res.json({
      success: true,
      id: result.insertId
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour récupérer les items d'un chapitre
router.get("/items/:chapter_id", async (req, res) => {
  try {
    const { chapter_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM items WHERE chapter_id = ? ORDER BY id ASC`,
      [chapter_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour supprimer un item
router.delete("/items/:id", activityLogger("DELETE_ITEM", { table: "items", nameColumn: "title" }),async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query(
      "DELETE FROM items WHERE id = ?",
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Item not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Item deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
router.get("/policies", async (req, res) => {
  try {
    const [packages] = await db.query("SELECT * FROM packages");

    for (const pkg of packages) {
      const [chapters] = await db.query(
        "SELECT * FROM chapters WHERE package_id = ?",
        [pkg.id]
      );

      for (const chapter of chapters) {
        const [items] = await db.query(
          "SELECT * FROM items WHERE chapter_id = ?",
          [chapter.id]
        );

        chapter.items = items;
      }

      pkg.chapters = chapters;
    }

    res.json(packages);
  } catch (error) {
    console.error("Error fetching policies:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.put("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, version, description, organization } = req.body;

    const result = await db.query(
      `UPDATE packages
       SET title = ?,
           version = ?,
           description = ?,
           organization = ?,
           updated_at = NOW()
       WHERE id = ?`,
       
      [title, version, description, organization, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }

    res.json({ success: true, package: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.put("/chapters/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    await db.query(
      `UPDATE chapters
       SET title = ?,
           description = ?
       WHERE id = ?`,
      [title, description, id]
    );

    const [rows] = await db.query(
      `SELECT * FROM chapters WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.json({ success: true, chapter: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    await db.query(
      `UPDATE items
       SET title = ?,
           description = ?
       WHERE id = ?`,
      [title, description, id]
    );

    const [rows] = await db.query(
      `SELECT * FROM items WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "item not found" });
    }

    res.json({ success: true, item: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;