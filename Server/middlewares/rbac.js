// middleware/auth.js
import db from "../db.js";

export function authMiddleware(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = req.session.user;
  next();
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(403).json({ message: "No user" });
      }

      
      const [[user]] = await db.query(
        `SELECT role FROM users WHERE id = ?`,
        [userId]
      );

      if (user?.role === "user") {
        return next(); // bypass RBAC complet
      }

      // 2. Récupérer les groupes de l'utilisateur
      const [groups] = await db.query(`
        SELECT g.id
        FROM user_groups ug
        JOIN groups_list g ON ug.group_id = g.id
        WHERE ug.user_id = ?
      `, [userId]);

      let permissions = [];

      // 3. Récupérer permissions de chaque groupe
      for (const g of groups) {
        const [perms] = await db.query(`
          SELECT p.key_name
          FROM group_permissions gp
          JOIN permissions p ON gp.permission_id = p.id
          WHERE gp.group_id = ?
        `, [g.id]);

        permissions.push(...perms.map(p => p.key_name));
      }

      // 4. Vérifier aussi les permissions directes sur le user
      const [directPerms] = await db.query(`
        SELECT p.key_name
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ?
      `, [userId]);

      permissions.push(...directPerms.map(p => p.key_name));

      const userPermissions = new Set(permissions);
      console.log("FRESH PERMISSIONS:", [...userPermissions]);

      // 5. Check permission
      if (!userPermissions.has(permission)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("RBAC ERROR:", err);
      res.status(500).json({ message: "RBAC error" });
    }
  };
}