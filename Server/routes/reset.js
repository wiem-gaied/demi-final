import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from "../db.js";
import  sendResetLink from "../mailer.js";

const router = express.Router();

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifie si l'utilisateur existe
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Générer token
    const token = crypto.randomBytes(32).toString("hex");

    // Expiration 15 min
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Supprimer les anciens tokens pour cet email
    await pool.query(
      "DELETE FROM password_resets WHERE email = ?",
      [email]
    );

    // Stocker en DB
    await pool.query(
      "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expires]
    );

    // Lien reset
    const ResetLink = `http://localhost:5173/reset-password/${token}`;

    // Envoi email
    await sendResetLink(email, user.first_name, ResetLink);

    res.json({ message: "Reset link sent successfully" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/verify-token/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.json({ valid: true, email: rows[0].email });
  } catch (err) {
    console.error("Verify token error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const email = rows[0].email;

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await pool.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    // Delete token
    await pool.query(
      "DELETE FROM password_resets WHERE token = ?",
      [token]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;