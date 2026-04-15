import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

router.get("/activation/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [rows] = await pool.query(
      "SELECT email FROM users WHERE activation_token = ?",
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Token invalide"
      });
    }

    res.json({
      success: true,
      email: rows[0].email
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

router.post("/activate", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Données manquantes"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `UPDATE users 
       SET password = ?, activation_token = NULL
       WHERE activation_token = ?`,
      [hashedPassword, token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Token invalide"
      });
    }

    res.json({
      success: true,
      message: "Compte activé"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

// =============================
// login utilisateur
// =============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Email incorrect"
      });
    }

    const user = rows[0];

    // Vérification activation via activation_token
    if (user.activation_token !== null) {
      return res.status(403).json({
        success: false,
        message: "Compte non activé"
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

export default router;