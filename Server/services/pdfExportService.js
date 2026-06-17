// services/pdfExportService.js
import puppeteer from 'puppeteer';
import auditReportTemplate from './auditReportTemplate.js';

class PDFExportService {

  wrapHTML(fragment, extraStyles = "") {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #ffffff;
      color: #0F172A;
      padding: 24px 28px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${extraStyles}
  </style>
</head>
<body>${fragment}</body>
</html>`;
  }

  async generatePDFFromHTML(htmlContent, options = {}) {
    let browser;

    // ── Auto-wrap si c'est un fragment React (pas un doc complet) ──
    const isFullDoc = htmlContent.trim().toLowerCase().startsWith("<!doctype");
    const fullHTML  = isFullDoc
      ? htmlContent
      : this.wrapHTML(htmlContent, options.styles || "");

    try {
      console.log('Launching browser...');
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();

      // Viewport A4
      await page.setViewport({ width: 1200, height: 1600 });

      await page.setContent(fullHTML, {
        waitUntil: 'networkidle0',
        timeout: 60000,       // 60s pour laisser les fonts charger
      });

      // Attendre que les Google Fonts soient vraiment rendues
      await page.evaluateHandle('document.fonts.ready');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
      });

      console.log('PDF generated successfully');
      return pdf;

    } catch (error) {
      console.error('Puppeteer error:', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  generateAuditReportHTML(data) {
    const auditData = auditReportTemplate.convertToAuditFormat(data);
    return auditReportTemplate.generateAuditReportHTML(auditData);
  }

  generateReportHTML(data) {
    return this.generateAuditReportHTML(data);
  }
}

export default new PDFExportService();