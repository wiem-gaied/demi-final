// db.js
import mysql from "mysql2/promise";
import "dotenv/config";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "grc_db",
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connexion
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL connecté à:", process.env.DB_NAME || "grc_db");
    connection.release();
  } catch (err) {
    console.error("❌ Erreur MySQL:");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
  }
})();

export default db;