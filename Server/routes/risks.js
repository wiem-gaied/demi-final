import express from "express";
import db from "../db.js";
import { activityLogger } from "../middlewares/activityLogger.js";

const router = express.Router();
router.post("/", activityLogger("ADD_risk"), async (req, res) => {
  try {
    const {
      intitule,
      categorie,
      actif,
      source,
      owner,
      description,
      MitigationPlan,
      dueDate,
      impact,
      probabilite,
      assets,
      threats,
      vulnerabilities,
    } = req.body;

    // 1. Insert risk
    const [result] = await db.query(
      `INSERT INTO risks 
      (intitule, categorie, actif, source, owner, description, dueDate, impact, probabilite, statut) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intitule,
        categorie,
        actif,
        source,
        owner,
        description,
        dueDate,
        impact,
        probabilite,
        "Open",
      ]
    );

    const riskId = result.insertId;

    // 2. Assets
    if (assets?.length) {
      for (const assetId of assets) {
        await db.query(
          `INSERT INTO risk_assets (risk_id, asset_id) VALUES (?, ?)`,
          [riskId, assetId]
        );
      }
    }

    // 3. Mitigation
    if (MitigationPlan?.length) {
      for (const action of MitigationPlan) {
        if (action.trim() !== "") {
          await db.query(
            `INSERT INTO mitigation_plans 
            (risk_id, action, priority, status, progress, due_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [riskId, action, "Medium", "Open", 0, dueDate]
          );
        }
      }
    }

    // 🔴 4. THREATS
    if (threats?.length) {
      for (const t of threats) {
        if (!t.name) continue;

        const [existing] = await db.query(
          `SELECT id FROM threats WHERE name = ?`,
          [t.name]
        );

        let threatId;

        if (existing.length > 0) {
          threatId = existing[0].id;
        } else {
          const [thrResult] = await db.query(
  `INSERT INTO threats (name) VALUES (?)`,
  [t.name]
);
threatId = thrResult.insertId;
        }

        await db.query(
          `INSERT INTO risk_threats (risk_id, threat_id)
           VALUES (?, ?)`,
          [riskId, threatId]
        );
      }
    }

    // 🟠 5. VULNERABILITIES
    if (vulnerabilities?.length) {
      for (const v of vulnerabilities) {
        if (!v.name) continue;

        const [existing] = await db.query(
          `SELECT id FROM vulnerabilities WHERE name = ?`,
          [v.name]
        );

        let vulnId;

        if (existing.length > 0) {
          vulnId = existing[0].id;
        } else {
          const [vulnResult] = await db.query(
  `INSERT INTO vulnerabilities (name) VALUES (?)`,
  [v.name]
);
vulnId = vulnResult.insertId;
        }

        await db.query(
          `INSERT INTO risk_vulnerabilities (risk_id, vulnerability_id)
           VALUES (?, ?)`,
          [riskId, vulnId]
        );
      }
    }

    res.status(201).json({ message: "Risk created successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/getrisks", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM risks");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});
router.delete("/:id", activityLogger("DELETE_risk", { table: "risks", nameColumn: "intitule" }),async (req, res) => {
    
    try{
        const { id } = req.params;
        const [rows] = await db.query("DELETE FROM risks where id= ?", [id]);
        res.json(rows);
         

    }catch (err) {
        res.status(500).json({ error: "Erreur serveur"});
    }
});
router.patch("/:id/status", async(req, res) =>{
    const { id } = req.params;
    const { statut } = req.body;
    try{
        const [rows] = await db.query ("UPDATE risks SET statut = ? WHERE id = ?",
      [statut, id])
      res.json({id, statut});
    }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }

});
// Ajoutez dans votre fichier routes/risks.js

router.post("/import-from-ai", activityLogger("IMPORT_AI_RISK"), async (req, res) => {
  try {
    const { 
      analysisResults,  // Résultat de l'analyse IA (full_analysis)
      controlId,        // ID du contrôle (ex: "5.1")
      policyId,         // ID de la politique
      sourceReport      // Nom du rapport analysé
    } = req.body;

    const importedRisks = [];

    // Parcourir les résultats d'analyse
    for (const [controlKey, controlData] of Object.entries(analysisResults)) {
      
      // Si le statut n'est pas "Covered", créer un risque
      if (controlData.status !== "Covered") {
        
        // Déterminer la catégorie à partir du contrôle
        const category = determineCategory(controlKey);
        
        // Déterminer l'impact et probabilité à partir des gaps
        const { impact, probability } = assessRiskLevel(controlData);
        
        // Construire l'intitulé du risque
        const intitule = buildIntitule(controlKey, controlData);
        
        // Construire la description enrichie
        const description = buildDescription(controlData, controlKey, sourceReport);
        
        // Déterminer le propriétaire par défaut
        const owner = "Security Team";
        
        // Date d'échéance (90 jours)
        const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 1. Insérer le risque dans la table `risks`
        const [riskResult] = await db.query(
          `INSERT INTO risks 
          (intitule, categorie, actif, source, description, impact, probabilite, statut, owner, dueDate) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            intitule,
            category,
            null,  // actif (peut être défini plus tard)
            "IA Audit",
            description,
            impact,
            probability,
            "Open",
            owner,
            dueDate
          ]
        );
        
        const riskId = riskResult.insertId;
        
        // 2. Ajouter les menaces (threats)
        if (controlData.threats?.length) {
          for (const threatName of controlData.threats) {
            if (threatName && threatName.trim()) {
              await addThreatToRisk(riskId, threatName);
            }
          }
        } else if (controlData.gaps?.length) {
          // Menace par défaut basée sur le premier gap
          await addThreatToRisk(riskId, `Non-conformité: ${controlData.gaps[0].substring(0, 200)}`);
        }
        
        // 3. Stocker les informations IA (optionnel - si vous ajoutez les colonnes)
        // Pour stocker les métadonnées IA, vous pouvez ajouter une table séparée
        await storeAIRiskMetadata(riskId, controlKey, policyId, controlData.compliance_percentage);
        
        importedRisks.push({ 
          id: riskId, 
          control: controlKey, 
          status: controlData.status,
          intitule: intitule
        });
      }
    }
    
    res.status(201).json({ 
      message: `${importedRisks.length} risque(s) importé(s) depuis l'analyse IA`,
      risks: importedRisks 
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'import IA: " + err.message });
  }
});

// ============================================================
// FONCTIONS UTILITAIRES COMPATIBLES AVEC VOTRE SCHEMA
// ============================================================

async function addThreatToRisk(riskId, threatName) {
  // Nettoyer le nom de la menace
  threatName = threatName.trim().substring(0, 255);
  if (!threatName) return;
  
  // Vérifier si la menace existe déjà
  const [existing] = await db.query(
    `SELECT id FROM threats WHERE name = ?`, 
    [threatName]
  );
  
  let threatId;
  
  if (existing.length > 0) {
    threatId = existing[0].id;
  } else {
    const [result] = await db.query(
      `INSERT INTO threats (name) VALUES (?)`, 
      [threatName]
    );
    threatId = result.insertId;
  }
  
  // Lier la menace au risque
  await db.query(
    `INSERT INTO risk_threats (risk_id, threat_id) VALUES (?, ?)`, 
    [riskId, threatId]
  );
}

async function storeAIRiskMetadata(riskId, controlId, policyId, complianceScore) {
  // Créer une table pour stocker les métadonnées IA (optionnel)
  // Exécutez d'abord: 
  // CREATE TABLE IF NOT EXISTS `risk_ia_metadata` (
  //   `risk_id` int NOT NULL,
  //   `control_id` varchar(50) DEFAULT NULL,
  //   `policy_id` varchar(50) DEFAULT NULL,
  //   `compliance_score` int DEFAULT NULL,
  //   `analysis_date` datetime DEFAULT CURRENT_TIMESTAMP,
  //   PRIMARY KEY (`risk_id`),
  //   FOREIGN KEY (`risk_id`) REFERENCES `risks` (`id`) ON DELETE CASCADE
  // );
  
  try {
    await db.query(
      `INSERT INTO risk_ia_metadata (risk_id, control_id, policy_id, compliance_score) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       control_id = VALUES(control_id), 
       policy_id = VALUES(policy_id), 
       compliance_score = VALUES(compliance_score)`,
      [riskId, controlId, policyId, complianceScore]
    );
  } catch (err) {
    // Table peut ne pas exister - ignorer l'erreur
    console.log("Note: Table risk_ia_metadata non créée, métadonnées non stockées");
  }
}

function determineCategory(controlId) {
  const categoryMap = {
    "5.1": "Governance",
    "5.2": "Policy", 
    "5.3": "Organization",
    "6.1": "Risk Management",
    "6.2": "Objectives",
    "7.1": "Resources",
    "7.2": "Competence",
    "7.3": "Awareness",
    "7.4": "Communication",
    "7.5": "Documentation",
    "8.1": "Operations",
    "9.1": "Monitoring",
    "9.2": "Internal Audit",
    "9.3": "Management Review",
    "10.1": "Improvement",
    "10.2": "Corrective Action"
  };
  
  // Chercher la catégorie par préfixe
  for (const [prefix, category] of Object.entries(categoryMap)) {
    if (controlId.startsWith(prefix)) {
      return category;
    }
  }
  
  return "Information Security";
}

function assessRiskLevel(controlData) {
  const complianceScore = controlData.compliance_percentage || 50;
  
  let impact, probability;
  
  if (complianceScore < 30) {
    impact = 4;  // Critical
    probability = 4;
  } else if (complianceScore < 60) {
    impact = 3;  // High
    probability = 3;
  } else if (complianceScore < 80) {
    impact = 2;  // Moderate
    probability = 2;
  } else {
    impact = 1;  // Low
    probability = 1;
  }
  
  return { impact, probability };
}

function buildIntitule(controlKey, controlData) {
  const statusEmoji = {
    "Not covered": "🔴",
    "Partial": "🟡",
    "Covered": "🟢"
  };
  const emoji = statusEmoji[controlData.status] || "⚪";
  
  let baseTitle = "";
  const titleMap = {
    "5.1": "Leadership et engagement",
    "5.2": "Politique de sécurité",
    "5.3": "Rôles et responsabilités",
    "6.1": "Actions face aux risques",
    "6.2": "Objectifs de sécurité"
  };
  
  baseTitle = titleMap[controlKey] || `Contrôle ${controlKey}`;
  
  return `${emoji} ${baseTitle} - ${controlData.status} (${controlData.compliance_percentage}%)`;
}

function buildDescription(controlData, controlKey, sourceReport) {
  const parts = [
    `**Contrôle:** ${controlKey}`,
    `**Statut de conformité:** ${controlData.status}`,
    `**Score:** ${controlData.compliance_percentage}%`,
    ``,
    `**Écarts identifiés (gaps):**`,
    ...(controlData.gaps?.length ? controlData.gaps.map(g => `- ${g}`) : ["- Aucun écart spécifique"]),
    ``,
    `**Recommandation d'atténuation:**`,
    `${controlData.remediation || "À définir"}`,
    ``,
    `**Risques associés:**`,
    ...(controlData.threats?.length ? controlData.threats.map(t => `- ${t}`) : ["- Non spécifié"]),
    ``,
    `**Source:** Analyse IA du rapport "${sourceReport}"`,
    `**Date analyse:** ${new Date().toLocaleString()}`
  ];
  
  return parts.join("\n");
}

// ============================================================
// ENDPOINT POUR RÉCUPÉRER LES RISQUES AVEC LEURS MÉTADONNÉES
// ============================================================

router.get("/getrisks-with-threats", async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT t.name) as threats,
        GROUP_CONCAT(DISTINCT a.intitule) as assets
      FROM risks r
      LEFT JOIN risk_threats rt ON r.id = rt.risk_id
      LEFT JOIN threats t ON rt.threat_id = t.id
      LEFT JOIN risk_assets ra ON r.id = ra.risk_id
      LEFT JOIN assets a ON ra.asset_id = a.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
export default router;