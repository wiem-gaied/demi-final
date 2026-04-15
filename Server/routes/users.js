// server/routes/users.js
import express from "express";
import pool from "../db.js";
import crypto from "crypto";         
import { sendInvitationEmail } from "../mailer.js"; 
import QRCode from "qrcode";
import speakeasy from "speakeasy";
import { activityLogger } from "../middlewares/activityLogger.js";


const router = express.Router();

// GET /api/users/:id
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, first_name, last_name, email, organization, role, status, department FROM users"
      
    );
    

    if (!rows.length) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const user = rows[0];
    user.name = `${user.first_name} ${user.last_name}`;
    user.initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router.post("/",activityLogger("CREATE_USER", { table: "users", nameColumn: "email" }),async (req, res) => {
  const { first_name, last_name, email, role, organization,status,department} = req.body;
  

  try {
    const activation_token = crypto.randomBytes(32).toString("hex");
    const invitationLink = `http://localhost:5173/activate?token=${activation_token}`;

    // Envoyer l’email via ton mailer
    await sendInvitationEmail(email, first_name, invitationLink);

    const [result] = await pool.query(
      "INSERT INTO users (first_name,last_name,email,role,organization,activation_token,status,department) VALUES (?,?,?,?,?,?,?,?)",
      [
        first_name,
        last_name,
        email,
        role,
        organization,
        activation_token,
        status,
        department,
        
      ],
    );

    res.status(201).json({
      id: result.insertId,
      first_name,
      last_name,
      email,
      role,
      organization,
      status,
      department,
      
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.delete("/:id",activityLogger("DELETE_USER", { table: "users", nameColumn: "email" }), async (req, res) => {
  const id = req.params.id;

  try {
    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "utilisateur non trouvée" });
    }

    res.json({ message: "utilisateur supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.post("/setup-mfa", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email requis" });
  const [rows] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
  if (!rows.length) return res.status(404).json({ message: "Utilisateur non trouvé" });

  try {
    // Générer un secret MFA unique
    const secret = speakeasy.generateSecret({
      name: `GRC (${email})`,
    });

    // Stocker secret.base32 dans la DB pour l'utilisateur
    await pool.query("UPDATE users SET mfa_secret=? WHERE email=?", [secret.base32, email]);

    // Générer le QR code en data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Envoyer la data au frontend
    res.json({ qrCodeUrl, secret: secret.base32 });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Endpoint pour vérifier le code MFA fourni par l’utilisateur
router.post("/verify-mfa", async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ message: "Email et token requis" });

  try {
    const [rows] = await pool.query("SELECT mfa_secret FROM users WHERE email=?", [email]);
    if (!rows.length) return res.status(404).json({ message: "Utilisateur non trouvé" });

    const verified = speakeasy.totp.verify({
      secret: rows[0].mfa_secret,
      encoding: "base32",
      token,
      window: 1 // autorise un décalage de 1 intervalle pour fiabilité
    });

    if (!verified) return res.status(400).json({ message: "Code MFA invalide" });

    // Marquer l’utilisateur comme MFA validé
    await pool.query("UPDATE users SET mfa_enabled=1 WHERE email=?", [email]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});



export default router;