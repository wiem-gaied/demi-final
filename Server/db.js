// db.js
import mysql from "mysql2/promise";
import "dotenv/config";

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pfe@2025',
    database: process.env.DB_NAME || 'sys',
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
    // Optionnel pour éviter les "ER_NET_READ_INTERRUPTED" sur idle prolongé :
    idleTimeout: 60000,
});

// Test connexion
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL connecté à:", process.env.DB_NAME || "sys");
    connection.release();
  } catch (err) {
    console.error("❌ Erreur MySQL:");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
  }
})();

export default db;