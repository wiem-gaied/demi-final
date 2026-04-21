import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from "../db.js";
import  sendResetLink from "../mailer.js";
import { authMiddleware } from "../middlewares/rbac.js";

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
router.post("/check-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const userId = req.user.id;
    console.log("SESSION:", req.session);
console.log("USER:", req.session.user);
console.log("COOKIES:", req.headers.cookie);

    const [rows] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(
      currentPassword,
      rows[0].password
    );

    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    return res.json({ valid: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});
router.put("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // vérifier ancien mot de passe
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password too short" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, req.user.id]
    );

    return res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;