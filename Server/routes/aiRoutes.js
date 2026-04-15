// backend/routes/aiRoutes.js - Version corrigée

import express from 'express';
import multer from 'multer';
import { analyzePDFWithPython } from '../services/pythonClient.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        console.log(`✅ Fichier accepté: ${file.originalname}`);
        cb(null, true);
    }
});

function mapStatus(status) {
    if (!status) return "Not covered";
    const clean = status.toString().trim().toLowerCase();
    if (clean === "covered") return "Covered";
    if (clean === "partial") return "Partial";
    if (clean === "not covered") return "Not covered";
    if (clean.includes("cover") && !clean.includes("not")) return "Covered";
    if (clean.includes("partial")) return "Partial";
    if (clean.includes("not")) return "Not covered";
    return "Not covered";
}

// ============================================================
// ENDPOINT: Analyser un PDF
// ============================================================
router.post("/analyze-pdf", upload.single('pdf'), async (req, res) => {
    try {
        console.log("📥 Requête reçue - analyse PDF");
        
        if (!req.file) {
            return res.status(400).json({ error: "Aucun fichier reçu" });
        }

        let selectedItems = [];
        let policies = [];
        
        try {
            if (req.body.selectedItems) {
                selectedItems = JSON.parse(req.body.selectedItems);
                console.log(`✅ ${selectedItems.length} items sélectionnés`);
            }
            if (req.body.policies) {
                policies = JSON.parse(req.body.policies);
                console.log(`✅ ${policies.length} politiques`);
            }
        } catch (e) {
            return res.status(400).json({ error: "Données invalides: " + e.message });
        }

        if (selectedItems.length === 0) {
            return res.status(400).json({ error: "Aucun item à analyser" });
        }

        const fileBase64 = req.file.buffer.toString('base64');
        console.log("📤 Appel du service Python...");
        
        const result = await analyzePDFWithPython(fileBase64, selectedItems, policies);
        console.log("📥 Résultat Python reçu");
        
        const formattedResults = {};
        
        if (result.detailed_results) {
            for (const [itemId, itemResult] of Object.entries(result.detailed_results)) {
                formattedResults[itemId] = {
                    status: mapStatus(itemResult.status || itemResult.compliance_status),
                    conf: itemResult.compliance_percentage || itemResult.conf || 50,
                    text: itemResult.justification || itemResult.text || "Analyse complétée",
                    risks: Array.isArray(itemResult.risks) ? itemResult.risks : 
                           Array.isArray(itemResult.threats) ? itemResult.threats : [],
                    gaps: Array.isArray(itemResult.gaps) ? itemResult.gaps : [],
                    remediation: itemResult.remediation || ""
                };
            }
        } else if (result.results) {
            for (const [itemId, itemResult] of Object.entries(result.results)) {
                formattedResults[itemId] = {
                    status: mapStatus(itemResult.status),
                    conf: itemResult.compliance_percentage || itemResult.conf || 50,
                    text: itemResult.justification || itemResult.text || "",
                    risks: itemResult.risks || [],
                    gaps: itemResult.gaps || [],
                    remediation: itemResult.remediation || ""
                };
            }
        }
        
        for (const item of selectedItems) {
            const itemId = String(item.id);
            if (!formattedResults[itemId]) {
                console.warn(`⚠️ Item sans résultat: ${itemId} - ${item.title}`);
                formattedResults[itemId] = {
                    status: "Not covered",
                    conf: 0,
                    text: "Non analysé par l'IA",
                    risks: ["Document non conforme"],
                    gaps: ["Item non couvert par le document"],
                    remediation: "Documenter ce contrôle"
                };
            }
        }
        
        console.log(`✅ ${Object.keys(formattedResults).length} résultats formatés`);
        
        const documentPolicies = result.document_policies || [];
        console.log(`📋 ${documentPolicies.length} politiques du document à envoyer`);
        
        res.json({ 
            results: formattedResults,
            global_score: result.global_compliance_percentage || 0,
            document_policies: documentPolicies,
            policy_comparisons: result.policy_comparisons || []
        });

    } catch (error) {
        console.error("❌ Erreur:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ENDPOINT: Importer les risques depuis l'analyse IA
// ============================================================
router.post("/import-risks", async (req, res) => {
    console.log("📥 Appel de /import-risks reçu");
    
    try {
        const { analysisResults, sourceReport, policyId, policyName } = req.body;
        
        console.log(`📊 Analyse results: ${Object.keys(analysisResults || {}).length} items`);
        console.log(`📄 Source report: ${sourceReport}`);
        
        if (!analysisResults || Object.keys(analysisResults).length === 0) {
            return res.status(400).json({ error: "Aucun résultat d'analyse à importer" });
        }
        
        const importedRisks = [];
        
        for (const [itemId, result] of Object.entries(analysisResults)) {
            console.log(`🔄 Traitement item ${itemId}: ${result.status}`);
            
            if (result.status !== "Covered") {
                
                const category = getCategoryFromItemId(itemId);
                const { impact, probability } = calculateRiskLevel(result.conf || 50);
                const title = `[IA] Contrôle ${itemId} - ${result.status}`;
                const description = buildRichDescription(result, itemId, sourceReport || "Rapport de conformité");
                
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (impact >= 3 ? 30 : 90));
                
                console.log(`📝 Création risque: ${title}`);
                
                const riskResponse = await fetch(`http://localhost:3000/api/risks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        intitule: title,
                        categorie: category,
                        source: `IA Audit - ${sourceReport || "Rapport"}`,
                        owner: "Security Team",
                        description: description,
                        dueDate: dueDate.toISOString().split('T')[0],
                        impact: impact,
                        probabilite: probability,
                        threats: result.risks?.map(r => ({ name: r })) || [],
                        vulnerabilities: result.gaps?.map(g => ({ name: g })) || [],
                        MitigationPlan: [result.remediation || "À définir"]
                    })
                });
                
                if (riskResponse.ok) {
                    const riskData = await riskResponse.json();
                    importedRisks.push({
                        id: riskData.id,
                        itemId: itemId,
                        status: result.status,
                        title: title
                    });
                    console.log(`✅ Risque créé: ID ${riskData.id}`);
                } else {
                    const errorText = await riskResponse.text();
                    console.error(`❌ Erreur création risque: ${errorText}`);
                }
            }
        }
        
        console.log(`✅ Import terminé: ${importedRisks.length} risques créés`);
        
        res.json({
            success: true,
            message: `${importedRisks.length} risque(s) importé(s) depuis l'analyse IA`,
            risks: importedRisks
        });
        
    } catch (error) {
        console.error("❌ Erreur import risques IA:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Fonctions utilitaires
// ============================================================

function getCategoryFromItemId(itemId) {
    const categories = {
        "5.1": "Governance",
        "5.2": "Policy",
        "5.3": "Organization",
        "6.1": "Risk Management",
        "6.2": "Objectives",
        "7.1": "Resources",
        "7.2": "Competence",
        "8.1": "Operations",
        "9.1": "Monitoring",
        "9.2": "Internal Audit",
        "9.3": "Management Review",
        "10.1": "Improvement",
        "10.2": "Corrective Action"
    };
    
    for (const [prefix, category] of Object.entries(categories)) {
        if (String(itemId).startsWith(prefix)) {
            return category;
        }
    }
    return "Information Security";
}

function calculateRiskLevel(complianceScore) {
    if (complianceScore < 30) return { impact: 4, probability: 4 };
    if (complianceScore < 60) return { impact: 3, probability: 3 };
    if (complianceScore < 80) return { impact: 2, probability: 2 };
    return { impact: 1, probability: 1 };
}

function buildRichDescription(result, itemId, sourceReport) {
    const parts = [
        `**Analyse de conformité IA**`,
        ``,
        `**Contrôle:** ${itemId}`,
        `**Statut:** ${result.status}`,
        `**Score de confiance:** ${result.conf}%`,
        ``,
        `**Risques identifiés:**`,
        ...(result.risks?.length ? result.risks.map(r => `- ${r}`) : ["- Aucun risque spécifique"]),
        ``,
        `**Écarts (gaps):**`,
        ...(result.gaps?.length ? result.gaps.map(g => `- ${g}`) : ["- Aucun écart"]),
        ``,
        `**Recommandation:**`,
        result.remediation || "À définir",
        ``,
        `**Source:** ${sourceReport}`,
        `**Date analyse:** ${new Date().toLocaleString()}`
    ];
    return parts.join("\n");
}

// ============================================================
// ENDPOINT: Tester la connexion
// ============================================================
router.get("/test", (req, res) => {
    res.json({ message: "Route AI fonctionne" });
});

export default router;