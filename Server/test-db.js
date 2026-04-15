// test-db.js
import db from "./db.js"; // attention au .js

async function testConnection() {
  try {
    const [rows] = await db.query("SELECT NOW() AS now");
    console.log("Connexion MySQL OK ! Heure du serveur :", rows[0].now);
  } catch (err) {
    console.error("Erreur de connexion MySQL :", err);
  }
}

testConnection();