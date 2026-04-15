class AuditReportTemplate {
  generateAuditReportHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Audit Report</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            padding: 40px;
            color: #111827;
            background: white;
          }
          
          .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #2563EB;
            padding-bottom: 20px;
          }
          
          .header h1 {
            color: #2563EB;
            font-size: 28px;
            margin-bottom: 10px;
          }
          
          .project-number {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 20px;
          }
          
          .audit-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .audit-table th {
            background: #F3F4F6;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #D1D5DB;
          }
          
          .audit-table td {
            padding: 10px;
            font-size: 11px;
            border: 1px solid #D1D5DB;
            vertical-align: top;
          }
          
          .control-title {
            background: #F9FAFB;
            font-weight: 600;
            font-size: 13px;
          }
          
          .checkbox-cell {
            text-align: center;
            width: 80px;
          }
          
          .checkbox {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid #6B7280;
            border-radius: 4px;
            margin: 0 5px;
            position: relative;
          }
          
          .checkbox.checked::after {
            content: "✓";
            position: absolute;
            top: -2px;
            left: 2px;
            font-size: 14px;
            color: #10B981;
            font-weight: bold;
          }
          
          .comments-section {
            margin-top: 10px;
            line-height: 1.5;
          }
          
          .comments-section p {
            margin-bottom: 5px;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 9px;
            color: #6B7280;
            text-align: center;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
          }
          
          .badge-compliant {
            background: #ECFDF5;
            color: #10B981;
          }
          
          .badge-partial {
            background: #FEF3C7;
            color: #F59E0B;
          }
          
          .badge-noncompliant {
            background: #FEF2F2;
            color: #EF4444;
          }
          
          .summary-box {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563EB;
          }
          
          .summary-box h3 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #2563EB;
          }
          
          .summary-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          
          .stat {
            display: flex;
            align-items: baseline;
            gap: 5px;
          }
          
          .stat-label {
            font-size: 11px;
            color: #6B7280;
          }
          
          .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AUDIT REPORT</h1>
          <div class="project-number">Project number: ${data.projectNumber || 'HU21841/25'}</div>
          <div class="project-number">Audit Date: ${new Date().toLocaleDateString()}</div>
          <div class="project-number">Auditor: ${data.auditor || 'Internal Audit Team'}</div>
        </div>
        
        ${data.summary ? `
          <div class="summary-box">
            <h3>Audit Summary</h3>
            <div class="summary-stats">
              <div class="stat">
                <span class="stat-label">Total Controls Audited:</span>
                <span class="stat-value">${data.summary.totalControls || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Compliant:</span>
                <span class="stat-value" style="color:#10B981">${data.summary.compliant || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Partial:</span>
                <span class="stat-value" style="color:#F59E0B">${data.summary.partial || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Non-Compliant:</span>
                <span class="stat-value" style="color:#EF4444">${data.summary.nonCompliant || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Not Applicable:</span>
                <span class="stat-value">${data.summary.notApplicable || 0}</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${data.sections && data.sections.map((section, index) => `
          <table class="audit-table">
            <tr class="control-title">
              <td colspan="3">
                <strong>${section.title}</strong>
              </td>
            </tr>
            <tr>
              <th style="width: 60%">Controls</th>
              <th style="width: 20%">Examined during current audit</th>
              <th style="width: 20%">Conformity assessment</th>
            </tr>
            ${section.controls && section.controls.map(control => `
              <tr>
                <td>
                  <strong>${control.code || ''}</strong> ${control.name || ''}
                  ${control.comments ? `
                    <div class="comments-section">
                      <p><strong>Comments on the controls:</strong></p>
                      <p>${control.comments}</p>
                    </div>
                  ` : ''}
                </td>
                <td class="checkbox-cell">
                  <span class="checkbox ${control.examined ? 'checked' : ''}"></span> Yes
                  <span class="checkbox ${!control.examined && control.examined !== undefined ? 'checked' : ''}" style="margin-left: 10px;"></span> No
                </td>
                <td class="checkbox-cell">
                  ${control.status ? `<span class="badge badge-${control.status.toLowerCase()}">${control.status}</span>` : '-'}
                </td>
              </tr>
            `).join('')}
          </table>
        `).join('')}
        
        <div class="footer">
          <p>This audit report is confidential and generated automatically by the Compliance Reporting System.</p>
          <p>Page <span class="pageNumber"></span></p>
        </div>
      </body>
      </html>
    `;
  }

  // Convertir les données existantes au format du rapport d'audit
  convertToAuditFormat(data) {
    const sections = [];
    
    // Section A5.24-5.30 Incident management
    sections.push({
      title: 'A5.24-5.30 Incident management',
      controls: [{
        code: 'A5.24-A5.30',
        name: 'Incident Management Controls',
        examined: true,
        status: 'Compliant',
        comments: `Incident Communication Plan. There were no security incidents. Bug Bounty Hunter program, Trello ticket about the valid problems. Only few real weaknesses. BCP - Business Continuity Plan, DRP - Disaster Recovery Plan: It covers the goals and actions. Annually tested.`
      }]
    });
    
    // Section A5.31-5.37 Legal requirements, documentation
    sections.push({
      title: 'A5.31-5.37 Legal requirements, documentation',
      controls: [{
        code: 'A5.31-A5.37',
        name: 'Legal and Documentation Controls',
        examined: true,
        status: 'Partial',
        comments: `Compliance regulation. Possibility for improvement: Taking into account the information security relevant law regulation regarding international clients and financial clients (e.g. DORA).`
      }]
    });
    
    // Section A6.1-6.8 HR processes
    sections.push({
      title: 'A6.1-6.8 HR processes',
      controls: [{
        code: 'A6.1-A6.8',
        name: 'Human Resources Controls',
        examined: true,
        status: 'Compliant',
        comments: `Employee onboarding and offboarding procedure. The NDA is included in the employment contract. Remote working is common.`
      }]
    });
    
    // Section A7.1-7.14 Physical security, controls
    sections.push({
      title: 'A7.1-7.14 Physical security, controls',
      controls: [{
        code: 'A7.1-A7.14',
        name: 'Physical Security Controls',
        examined: false,
        status: 'Not Applicable',
        comments: `A7.1, A7.2, A7.3, A7.4, A7.5, A7.6, A7.11, A7.12, A7.13 controls aren't applicable, because the company does not manage physical assets. Server hosting providers compliant with requirement. Remote working is common.`
      }]
    });
    
    // Section A8.1-8.19 IT
    sections.push({
      title: 'A8.1-8.19 IT',
      controls: [{
        code: 'A8.1-A8.19',
        name: 'IT Controls',
        examined: true,
        status: 'Compliant',
        comments: `Operation regulated by for example the Change management, Virtual Private Servers, Backup Plan, Logging and Monitoring Policy and done, for example Sentry.io, Intruder.io – monthly checks. GitHub, 2 factor authentication. Monitoring: Grafana.`
      }]
    });
    
    // Calculer le résumé
    const summary = {
      totalControls: sections.length,
      compliant: sections.filter(s => s.controls[0]?.status === 'Compliant').length,
      partial: sections.filter(s => s.controls[0]?.status === 'Partial').length,
      nonCompliant: sections.filter(s => s.controls[0]?.status === 'Non-Compliant').length,
      notApplicable: sections.filter(s => s.controls[0]?.status === 'Not Applicable').length
    };
    
    return {
      projectNumber: data.projectNumber || 'HU21841/25',
      auditor: data.auditor || 'Internal Audit Team',
      sections: sections,
      summary: summary
    };
  }
}

export default new AuditReportTemplate();