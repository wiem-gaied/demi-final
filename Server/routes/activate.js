
import express from "express";
import pool from "../db.js"; 
import bcrypt from "bcryptjs";

const router = express.Router();
router.get("/by-token", async (req, res) => {
  const { token } = req.query;

  try {
    const [rows] = await pool.query(
      "SELECT email FROM users WHERE activation_token = ?",
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Token invalide" });
    }

    res.json({ email: rows[0].email });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/activate
router.post("/", async (req, res) => {
  const { email, token, password } = req.body;

  if (!email || !token || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  try {
    // Vérifier que l'utilisateur existe avec ce token
    const [rows] = await pool.query(
      "SELECT id, activation_token FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const user = rows[0];

    

    if (user.activation_token !== token) {
      return res.status(400).json({ message: "Token invalide" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour la base de données : mot de passe + activation
    await pool.query(
      "UPDATE users  SET status = 'active' ,password = ?, activation_token = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    return res.json({ success: true, message: "Compte activé avec succès" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;