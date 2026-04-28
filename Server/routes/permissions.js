import express from 'express';
import db from "../db.js";

const router = express.Router();

router.get("/groups", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        g.id,
        g.name,
        g.description,
        p.key_name
      FROM groups_list g
      LEFT JOIN group_permissions gp ON g.id = gp.group_id
      LEFT JOIN permissions p ON gp.permission_id = p.id
    `);

    const groupsMap = {};

    rows.forEach(r => {
      if (!groupsMap[r.id]) {
        groupsMap[r.id] = {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: []
        };
      }

      if (r.key_name) {
        groupsMap[r.id].permissions.push(r.key_name);
      }
    });

    res.json(Object.values(groupsMap));

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching groups" });
  }
});
router.post("/groups", async (req, res) => {
  const { name, description, permissions,members  } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO groups_list (name, description) VALUES (?, ?)",
      [name, description]
    );

    const groupId = result.insertId;

    if (permissions && permissions.length > 0) {
      const [permRows] = await conn.query(
        "SELECT id, key_name FROM permissions"
      );

      const permMap = Object.fromEntries(
        permRows.map(p => [p.key_name, p.id])
      );

      for (const key of permissions) {
        const permId = permMap[key];
        if (permId) {
          await conn.query(
            "INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)",
            [groupId, permId]
          );
        }
      }
    }
    if (members && members.length > 0) {
      const values = members.map(userId => [userId, groupId]);

      await conn.query(
        "INSERT INTO user_groups (user_id, group_id) VALUES ?",
        [values]
      );
    }

    await conn.commit();
    res.json({ id: groupId });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error creating group" });
  } finally {
    conn.release();
  }
});
router.get("/me/permissions", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role; // récupérer le rôle depuis le token/session

  // Si le rôle est "user" → toutes les permissions par défaut
  if (userRole === "user") {
    const [allPermissions] = await db.query(`
      SELECT key_name FROM permissions
    `);

    return res.json({
      permissions: allPermissions.map(p => p.key_name)
    });
  }

  // Sinon → logique normale basée sur les groupes
  const [groups] = await db.query(`
    SELECT g.id
    FROM user_groups ug
    JOIN groups_list g ON ug.group_id = g.id
    WHERE ug.user_id = ?
  `, [userId]);

  let permissions = [];

  for (const g of groups) {
    const [perms] = await db.query(`
      SELECT p.key_name
      FROM group_permissions gp
      JOIN permissions p ON gp.permission_id = p.id
      WHERE gp.group_id = ?
    `, [g.id]);

    permissions.push(...perms.map(p => p.key_name));
  }

  res.json({
    permissions: [...new Set(permissions)]
  });
});
router.put("/groups/:id/permissions", async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // supprimer anciennes permissions
    await conn.query(
      "DELETE FROM group_permissions WHERE group_id = ?",
      [id]
    );

    // récupérer mapping
    const [permRows] = await conn.query(
      "SELECT id, key_name FROM permissions"
    );

    const permMap = Object.fromEntries(
      permRows.map(p => [p.key_name, p.id])
    );

    // insérer nouvelles
    for (const key of permissions) {
      const permId = permMap[key];
      if (permId) {
        await conn.query(
          "INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)",
          [id, permId]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Permissions updated" });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error updating permissions" });
  } finally {
    conn.release();
  }
});
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, key_name, label, category
      FROM permissions 
      ORDER BY category, key_name
    `);
    
    // Vérifiez si des données existent
    if (!rows || rows.length === 0) {
      // Si pas de permissions, retournez un tableau vide
      return res.json([]);
    }
    
    const permissions = rows.map(p => ({
      id: p.key_name,
      label: p.label,
      category: p.category,
      
    }));
    
    res.json(permissions);
  } catch (err) {
    console.error("Error fetching permissions:", err);
    res.status(500).json({ 
      message: "Error fetching permissions",
      error: err.message 
    });
  }
});
// POST create new permission
router.post("/", async (req, res) => {
  const { id, label, category } = req.body;
  
  if (!id || !label || !category) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Check if permission already exists
    const [existing] = await conn.query(
      "SELECT id FROM permissions WHERE key_name = ?",
      [id]
    );
    
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: "Permission already exists" });
    }
    
    // Insert new permission
    await conn.query(
      "INSERT INTO permissions (key_name, label, category) VALUES (?, ?, ?)",
      [id, label, category]
    );
    
    await conn.commit();
    res.json({ 
      id, 
      label, 
      category,
      message: "Permission created successfully" 
    });
    
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error creating permission" });
  } finally {
    conn.release();
  }
});

// PUT update permission
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { label, category } = req.body;
  
  const conn = await db.getConnection();
  try {
    await conn.query(
      "UPDATE permissions SET label = ?, category = ? WHERE key_name = ?",
      [label, category, id]
    );
    
    await conn.commit();
    res.json({ message: "Permission updated successfully" });
    
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error updating permission" });
  } finally {
    conn.release();
  }
});
router.delete("/:id", async (req, res) => {
  const { id } = req.params; // id = key_name

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 🔹 1. récupérer permission ID réel
    const [permRows] = await conn.query(
      "SELECT id FROM permissions WHERE key_name = ?",
      [id]
    );

    if (permRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Permission not found" });
    }

    const permId = permRows[0].id;

    // 🔹 2. supprimer relations avec groupes
    await conn.query(
      "DELETE FROM group_permissions WHERE permission_id = ?",
      [permId]
    );

    // 🔹 3. supprimer permission
    await conn.query(
      "DELETE FROM permissions WHERE id = ?",
      [permId]
    );

    await conn.commit();

    res.json({ message: "Permission deleted successfully" });

  } catch (err) {
    await conn.rollback();
    console.error("DELETE PERMISSION ERROR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

export default router;