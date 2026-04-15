import bcrypt from "bcrypt";
import pool from "./db.js"; // ton fichier de connexion DB

const hashAdminPassword = async () => {
  try {
    const passwordPlain = "systemadmingrc@1992"; // mot de passe actuel en clair
    const saltRounds = 10;
    const hashed = await bcrypt.hash(passwordPlain, saltRounds);

    // Mettre à jour l'admin dans la DB
    await pool.query("UPDATE users SET password = ? WHERE email = ?", [
      hashed,
      "systemadmingrc@gmail.com"
    ]);

    console.log("Mot de passe admin hashé avec succès !");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

hashAdminPassword();