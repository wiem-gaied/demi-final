import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { activityLogger } from "../middlewares/activityLogger.js";
import { formatDate } from "../utils/dateFormat.js";


const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password, token } = req.body;

  try {
    // 1. USER CHECK
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Email not found" });
    }

    const user = rows[0];

    // STATUS CHECK
    if (user.status === "pending") {
      return res.status(403).json({ message: "Activate your account" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ message: "Account disabled" });
    }

    // 2. PASSWORD CHECK
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Juste avant l'appel activityLogger pour LOGIN_FAILED
      console.log("🔴 LOGIN_FAILED - about to log");
      console.log("🔴 req.body.email =", req.body?.email);
      console.log("🔴 req.session.user =", req.session?.user);

      
      await activityLogger("LOGIN_FAILED")(req, res, () => {});
      console.log("🔴 LOGIN_FAILED - logger called");

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. 🔥 FIRST TIME MFA SETUP (QR CODE)
    // 3. FIRST TIME MFA SETUP
if (!user.mfa_secret) {
  const secret = speakeasy.generateSecret({
    name: `GRC (${user.email})`,
  });

  await pool.query(
    "UPDATE users SET mfa_secret=? WHERE id=?",
    [secret.base32, user.id]
  );

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // ❗ IMPORTANT: ne pas activer MFA ici
  return res.json({
    mfaSetup: true,
    qrCode,
    
  });
}
    // 4. 🔐 MFA REQUIRED
    if (!token) {
      return res.json({ mfaRequired: true });
    }

    // 5. VERIFY MFA CODE
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token,
      window: 0,
    });

    if (!verified) {
      // Pareil pour MFA_FAILED
      console.log("🔴 MFA_FAILED - about to log");
      console.log("🔴 req.body.email =", req.body?.email);
      console.log("🔴 req.session.user =", req.session?.user);

      
      await activityLogger("MFA_FAILED")(req, res, () => {});
      console.log("🔴 MFA_FAILED - logger called");


      return res.status(401).json({ message: "Invalid MFA code" });
    }

    // 6. ACTIVATE MFA ONLY AFTER SUCCESS
    if (!user.mfa_enabled) {
      await pool.query(
        "UPDATE users SET mfa_enabled=1 WHERE id=?",
        [user.id]
      );
    }
    await pool.query(
  "UPDATE users SET last_login = NOW() WHERE id = ?",
  [user.id]
);

    // 7. GET USER GROUPS
    const [groupsRows] = await pool.query(
      `
      SELECT g.id as group_id, g.name as group_name, p.key_name as permission_name
      FROM user_groups ug
      JOIN groups_list g ON ug.group_id = g.id
      JOIN group_permissions gp ON g.id = gp.group_id
      JOIN permissions p ON gp.permission_id = p.id
      WHERE ug.user_id = ?
      `,
      [user.id]
    );

    const grouped = {};

    groupsRows.forEach((row) => {
      if (!grouped[row.group_id]) {
        grouped[row.group_id] = {
          id: row.group_id,
          name: row.group_name,
          permissions: [],
        };
      }
      if (row.permission_name) {
        grouped[row.group_id].permissions.push(row.permission_name);
      }
    });

    const userGroups = Object.values(grouped);

    // 8. SESSION
    req.session.userId = user.id;
    req.session.user = {
      id: user.id, 
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`,
      organization: user.organization,
      department: user.department,
      groups: userGroups,
    };

    await activityLogger("LOGIN")(req, res, () => {});

    const redirect = user.role === "admin" ? "/admin" : "/layout";

    req.session.save((err) => {
      if (err) console.error(err);
      res.json({
        success: true,
        redirect,
      });
    });
    console.log(`[login] session set: userId=${req.session.user.id} role=${req.session.user.role}`);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Place-la juste avant `export default router;`
router.post("/logout", (req, res) => {
  if (!req.session) return res.json({ success: true });
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("grc_sid");
    res.json({ success: true });
  });
});

export default router;