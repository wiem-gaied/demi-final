import express from "express";
import db from "../db.js";


const router = express.Router();

router.get("/profile", async (req, res) => {
  try {

    const userId = req.session?.userId;
    
    if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });
    console.log("Session:", req.session);


    const [rows] = await db.query(
      "SELECT id, first_name, last_name, email, role, avatar, organization, last_login FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }


    const user = rows[0];
    req.session.user = req.session.user || {};
    req.session.user.email = user.email;
    req.session.user.role = user.role;
    console.log(req.session);
    console.log("SESSION:", req.session);

    const initials =
      user.first_name.charAt(0).toUpperCase() +
      user.last_name.charAt(0).toUpperCase();

    res.json({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      email: user.email,
      initials,
      avatar: user.avatar,
      organization: user.organization,
      lastLogin: user.last_login
        ? new Date(user.last_login).toLocaleString()
        : "Première connexion"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;