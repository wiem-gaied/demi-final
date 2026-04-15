import express from 'express';
import db from "../db.js";
const router = express.Router();
router.get("/", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM security_settings LIMIT 1");
  res.json(rows[0]);
});
router.put("/", async (req, res) => {
  console.log("BODY:", req.body);
  const { session_timeout } = req.body;
  

  await db.query(
    "UPDATE security_settings SET session_timeout = ? WHERE id = 1",
    [session_timeout]
  );

  res.json({ success: true });
});
export default router;