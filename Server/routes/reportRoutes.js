// routes/reportRoutes.js
import express from 'express';
import pdfExportService from '../services/pdfExportService.js';
import db from '../db.js';

const router = express.Router();

// Endpoint pour générer un rapport PDF
router.post('/export-pdf', async (req, res) => {
  try {
    const { reportData, reportType } = req.body;
    
    console.log('Generating PDF for:', reportType);
    
    // Préparer les données pour le rapport
    const pdfData = {
      reportType: reportType || 'Complete Report',
      totalRequirements: reportData.totalRequirements || 0,
      complianceRate: reportData.complianceRate || 0,
      nonConformitiesCount: reportData.nonConformitiesCount || 0,
      openActionsCount: reportData.openActionsCount || 0,
      complianceDetails: reportData.complianceDetails || [],
      nonConformities: reportData.nonConformities || [],
      threats: reportData.threats || [],
      vulnerabilities: reportData.vulnerabilities || [],
      actionPlan: reportData.actionPlan || []
    };
    
    // Générer le HTML
    const htmlContent = pdfExportService.generateReportHTML(pdfData);
    
    // Générer le PDF
    const pdfBuffer = await pdfExportService.generatePDFFromHTML(htmlContent);
    
    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=compliance_report_${Date.now()}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF report',
      details: error.message 
    });
  }
});
// Endpoint pour exporter avec React-PDF
router.post('/export-react-pdf', async (req, res) => {
  try {
    const { reportData } = req.body;
    
    // Cette route attend les données déjà formatées depuis le frontend
    const pdfBuffer = await pdfExportService.generatePDFFromHTML(
      pdfExportService.generateStyledHTML(reportData)
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

export default router;