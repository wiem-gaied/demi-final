// services/pdfExportService.js
import puppeteer from 'puppeteer';
import auditReportTemplate from './auditReportTemplate.js';

class PDFExportService {
  async generatePDFFromHTML(htmlContent) {
    let browser;
    try {
      console.log('Launching browser...');
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '40px',
          left: '20px',
          right: '20px'
        }
      });
      
      console.log('PDF generated successfully');
      return pdf;
      
    } catch (error) {
      console.error('Puppeteer error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  generateAuditReportHTML(data) {
    const auditData = auditReportTemplate.convertToAuditFormat(data);
    return auditReportTemplate.generateAuditReportHTML(auditData);
  }

  // Garder l'ancienne méthode pour compatibilité
  generateReportHTML(data) {
    return this.generateAuditReportHTML(data);
  }
}

export default new PDFExportService();