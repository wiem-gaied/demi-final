// backend/services/pythonClient.js
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function analyzePDFWithPython(fileBase64, selectedItems, policies) {
  return new Promise((resolve, reject) => {
    const scriptPath = "C:\\Users\\ASUS\\Desktop\\PFE\\main.py";
    
    console.log("🐍 Chemin du script Python:", scriptPath);
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script Python non trouvé: ${scriptPath}`));
      return;
    }
    
    // ✅ Déterminer l'extension du fichier
    // Pour simplifier, on utilise .pdf comme extension par défaut
    // mais le script Python détectera le vrai type
    const tempFilePath = path.join(os.tmpdir(), `temp_file_${Date.now()}.bin`);
    const tempPoliciesPath = path.join(os.tmpdir(), `temp_policies_${Date.now()}.json`);
    
    try {
      // Décoder le base64 et écrire le fichier
      const fileBuffer = Buffer.from(fileBase64, 'base64');
      fs.writeFileSync(tempFilePath, fileBuffer);
      
      console.log(`📁 Fichier temporaire créé: ${tempFilePath}`);
      console.log(`📊 Taille: ${fileBuffer.length} bytes`);
      
      // Vérifier le type de fichier par son contenu
      const header = fileBuffer.slice(0, 5).toString();
      let fileType = 'unknown';
      if (header.startsWith('%PDF')) fileType = 'pdf';
      else if (header.startsWith('<?xml')) fileType = 'xml';
      else if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B) fileType = 'docx'; // PK zip
      else fileType = 'txt'; // Par défaut, traiter comme texte
      
      console.log(`📄 Type détecté: ${fileType}`);
      
      // Écrire les politiques dans un fichier JSON
      const payload = {
        selectedItems,
        policies
      };
      fs.writeFileSync(tempPoliciesPath, JSON.stringify(payload));
      
      // Lancer le script Python avec les chemins
      const py = spawn("python", [scriptPath, tempFilePath, tempPoliciesPath]);
      
      let output = "";
      let errorOutput = "";
      
      py.stdout.on("data", (data) => {
        output += data.toString();
      });
      
      py.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("Python stderr:", data.toString());
      });
      
      py.on("error", (err) => {
        console.error("Erreur de spawn:", err);
        cleanup(tempFilePath, tempPoliciesPath);
        reject(new Error(`Erreur Python: ${err.message}`));
      });
      
      py.on("close", (code) => {
        console.log("Python process closed with code:", code);
        cleanup(tempFilePath, tempPoliciesPath);
        
        if (code !== 0) {
          console.error("Erreur Python:", errorOutput);
          reject(new Error(`Erreur Python: ${errorOutput || "Erreur inconnue"}`));
          return;
        }
        
        try {
          const cleanedOutput = output.trim();
          if (!cleanedOutput) {
            throw new Error("Pas de sortie de Python");
          }
          const parsed = JSON.parse(cleanedOutput);
          resolve(parsed);
        } catch (err) {
          console.error("Erreur de parsing JSON:", err);
          reject(new Error(`JSON invalide: ${err.message}`));
        }
      });
      
    } catch (err) {
      cleanup(tempFilePath, tempPoliciesPath);
      reject(new Error(`Erreur préparation: ${err.message}`));
    }
  });
}

function cleanup(...files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️ Fichier supprimé: ${file}`);
      }
    } catch (err) {
      console.error(`Erreur suppression ${file}:`, err);
    }
  }
}