import express from "express";
import db from "../db.js";
import pdfExportService from '../services/pdfExportService.js';

const router = express.Router();

router.get("/mitigationplans", async(req, res)=>{
    try{
        const [rows] = await db.query("SELECT * FROM mitigation_plans");
        res.json(rows);
    }catch (err){
        res.status(500).json({ error: "Error" });
    }
});

router.get("/threats", async (req, res) => {
  try {
    // Fetch threats
    const [threats] = await db.query(`
      SELECT id, name
      FROM threats
      ORDER BY id DESC
    `);

    // Fetch vulnerabilities (commentez temporairement si la table n'existe pas)
    let vulnerabilities = [];
    try {
      const [vulnResults] = await db.query(`
        SELECT id, name
        FROM vulnerabilities
        ORDER BY id DESC
      `);
      vulnerabilities = vulnResults;
    } catch (err) {
      console.log("Table vulnerabilities doesn't exist yet, returning empty array");
    }

    res.json({
      threats,
      vulnerabilities
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching threats and vulnerabilities" });
  }
});

// Route spécifique pour le rapport d'audit
router.post('/export-audit-report', async (req, res) => {
  try {
    const { auditData } = req.body;
    
    console.log('Generating Audit Report PDF...');
    
    // Générer le HTML du rapport d'audit
    const htmlContent = pdfExportService.generateAuditReportHTML(auditData || {});
    
    // Générer le PDF
    const pdfBuffer = await pdfExportService.generatePDFFromHTML(htmlContent);
    
    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit_report_${Date.now()}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Audit Report Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate audit report',
      details: error.message 
    });
  }
});

// Route pour les données d'audit
router.get('/audit-data', async (req, res) => {
  try {
    const [auditResults] = await db.query(`
      SELECT ar.*, c.code, c.name, c.category 
      FROM audit_results ar
      JOIN controls c ON ar.control_id = c.id
      WHERE ar.audit_id = ?
      ORDER BY c.category, c.code
    `, [req.query.auditId]);
    
    const sections = [];
    let currentSection = null;
    
    auditResults.forEach(result => {
      if (!currentSection || currentSection.title !== result.category) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: result.category,
          controls: []
        };
      }
      
      currentSection.controls.push({
        code: result.code,
        name: result.name,
        examined: result.examined === 1,
        status: result.status,
        comments: result.comments
      });
    });
    
    if (currentSection) sections.push(currentSection);
    
    res.json({
      projectNumber: 'HU21841/25',
      auditor: req.user?.name || 'Internal Audit Team',
      sections: sections
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit data' });
  }
});

export default router;