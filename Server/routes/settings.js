import express from 'express';
import db from '../db.js';
const router = express.Router();
import crypto from "crypto";
import { requirePermission, authMiddleware  } from "../middlewares/rbac.js";
import { activityLogger } from "../middlewares/activityLogger.js";
import { sendInvitationEmail } from "../mailer.js";

router.post("/groups", authMiddleware,
  requirePermission("manage_groups"),async (req, res) => {
  try {
    const { name, description } = req.body;

    const [result] = await db.query(
      "INSERT INTO groups_list (name, description) VALUES (?, ?)",
      [name, description]
    );

    res.json({ id: result.insertId, name, description });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/groups", async (req, res) => {
  try {
    const query = `
      SELECT 
        g.id,
        g.name,
        g.description,

        GROUP_CONCAT(DISTINCT p.key_name) AS permissions,
        GROUP_CONCAT(DISTINCT u.id) AS members_ids

      FROM groups_list g

      LEFT JOIN group_permissions gp ON g.id = gp.group_id
      LEFT JOIN permissions p ON gp.permission_id = p.id

      LEFT JOIN user_groups ug ON g.id = ug.group_id
      LEFT JOIN users u ON ug.user_id = u.id

      GROUP BY g.id
    `;

    const [rows] = await db.query(query);

    const groups = rows.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,

      permissions: g.permissions ? g.permissions.split(",") : [],
      members: g.members_ids ? g.members_ids.split(",").map(id => Number(id)) : []
    }));

    res.json(groups);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post(
  "/users",authMiddleware,
  activityLogger("CREATE_USER", { table: "users", nameColumn: "email" }),
  async (req, res) => {
    const {
      first_name,
      last_name,
      email,
      role,
      department,
      organization,
      status,
      groups
    } = req.body;

    const creator = req.user;

    console.log("CREATOR:", creator);

    try {
      // 🔐 Génération token invitation
      const activation_token = crypto.randomBytes(32).toString("hex");
      const invitationLink = `http://localhost:5173/activate?token=${activation_token}`;

      // ✅ Détermination organisation
      let finalOrganization;

      if (creator.role === "auditor") {
        finalOrganization = creator.organization;
      }

      

      console.log("FINAL ORGANIZATION:", finalOrganization);

      // 📧 Envoi email
      console.log("Before sending email...");
      await sendInvitationEmail(email, first_name, invitationLink);
      console.log("After sending email...");

      // 🧠 Insert user
      const [result] = await db.query(
        `INSERT INTO users 
        (first_name, last_name, email, role, department, organization, status, activation_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name,
          last_name,
          email,
          role,
          department,
          finalOrganization,
          status,
          activation_token
        ]
      );

      const userId = result.insertId;

      // 👥 Insert groups (si fournis)
      if (groups && groups.length > 0) {
        const values = groups.map(groupId => [userId, groupId]);

        await db.query(
          "INSERT INTO user_groups (user_id, group_id) VALUES ?",
          [values]
        );
      }

      res.status(201).json({
        id: userId,
        first_name,
        last_name,
        email,
        role,
        organization: finalOrganization,
        status,
        department,
        groups
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);
router.get("/users", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.*,
        GROUP_CONCAT(ug.group_id) AS group_ids
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      GROUP BY u.id
    `);

    const users = rows.map(u => ({
      ...u,
      groups: u.group_ids
        ? u.group_ids.split(",").map(Number)
        : []
    }));

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      role,
      organization,
      status,
      department
    } = req.body;

    await db.query(
      `UPDATE users 
       SET first_name=?, last_name=?, email=?, role=?, organization=?, status=?, department=? 
       WHERE id=?`,
      [first_name, last_name, email, role, organization, status, department, id]
    );

    res.json({ id });

  } catch (err) {
    console.error("UPDATE ERROR:", err); // 🔥 IMPORTANT
    res.status(500).json({ message: err.message });
  }
});
// Route unique pour éditer complètement un groupe
router.put("/groups/:id", async (req, res) => {
  const groupId = req.params.id;
  const { name, description, permissions, members } = req.body;
  
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Mettre à jour les informations de base du groupe
    if (name) {
      await conn.query(
        "UPDATE groups_list SET name = ?, description = ? WHERE id = ?",
        [name, description || "", groupId]
      );
    }

    // 2. Mettre à jour les membres du groupe
    if (members !== undefined) {
      // Supprimer tous les membres existants
      await conn.query(
        "DELETE FROM user_groups WHERE group_id = ?",
        [groupId]
      );
      
      // Ajouter les nouveaux membres
      if (members && members.length > 0) {
        const memberValues = members.map(userId => [userId, groupId]);
        await conn.query(
          "INSERT INTO user_groups (user_id, group_id) VALUES ?",
          [memberValues]
        );
      }
    }

    // 3. Mettre à jour les permissions du groupe
    if (permissions !== undefined) {
      // Supprimer toutes les permissions existantes
      await conn.query(
        "DELETE FROM group_permissions WHERE group_id = ?",
        [groupId]
      );
      
      // Ajouter les nouvelles permissions
      if (permissions && permissions.length > 0) {
        // Récupérer le mapping des permissions
        const [permRows] = await conn.query(
          "SELECT id, key_name FROM permissions"
        );
        
        const permMap = Object.fromEntries(
          permRows.map(p => [p.key_name, p.id])
        );
        
        // Insérer les nouvelles permissions
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
    }

    await conn.commit();
    
    // Récupérer les données mises à jour pour les renvoyer
    const [groupRows] = await conn.query(
      "SELECT * FROM groups_list WHERE id = ?",
      [groupId]
    );
    
    const [memberRows] = await conn.query(
      "SELECT user_id FROM user_groups WHERE group_id = ?",
      [groupId]
    );
    
    const [permissionRows] = await conn.query(
      `SELECT p.key_name 
       FROM group_permissions gp 
       JOIN permissions p ON gp.permission_id = p.id 
       WHERE gp.group_id = ?`,
      [groupId]
    );
    
    const updatedGroup = {
      id: groupId,
      name: groupRows[0].name,
      description: groupRows[0].description,
      members: memberRows.map(m => m.user_id),
      permissions: permissionRows.map(p => p.key_name),
      color: groupRows[0].color
    };
    
    res.json({ 
      message: "Group updated successfully",
      group: updatedGroup
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});
router.delete("/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Supprimer les relations user_groups (IMPORTANT 🔥)
    await db.query(
      "DELETE FROM user_groups WHERE group_id = ?",
      [id]
    );

    // 2. Supprimer le groupe
    const [result] = await db.query(
      "DELETE FROM groups_list WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({ message: "Group deleted successfully" });

  } catch (err) {
    console.error("DELETE GROUP ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});
export default router;