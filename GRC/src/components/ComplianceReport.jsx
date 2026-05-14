import { useRef } from "react";

// ─── Default demo data (valeurs par défaut, seront écrasées par les données réelles) ───
const DEFAULT_DATA = {
  organisation: "Acme Corporation",
  department: "Information Systems Security Department",
  date: "April 25, 2026",
  version: "v1.0",
  classification: "Confidential Report",
  auditor: "ISS Team",
  frameworks: "ISO 27001 · NIST CSF · GDPR",
  scope: "Global information system",
  overallStatus: "partial",
  overallStatusLabel: "Partially compliant",
  global_score: 75, // Valeur par défaut, sera remplacée
  domains: [],
  risks: [],
  mitigations: [],
};

// ─── Fonction pour générer l'executive summary avec le score ─────────────────
const generateExecutiveSummary = (score) => {
  let complianceText = "";
  if (score >= 80) complianceText = "satisfactory";
  else if (score >= 50) complianceText = "partially compliant";
  else complianceText = "non-compliant";
  
  return [
    "This report presents the results of the compliance assessment conducted within the defined scope of the organization. The analysis was carried out in alignment with applicable security frameworks, standards, and industry best practices in information security and risk management.",
    
    `The overall level of compliance is assessed as ${complianceText} (${score}%), indicating that while a number of controls are effectively implemented, several gaps and non-conformities still exist and require remediation.`,
    
    "Key strengths identified during the assessment include the presence of structured security controls, a defined governance framework, and the implementation of several technical and organizational measures that contribute to the organization's security posture.",
    
    "However, the analysis also highlights several areas of concern, particularly in access management, risk treatment, and control monitoring. These deficiencies may expose the organization to operational, regulatory, and security risks if not addressed in a timely manner.",
    
    "A set of prioritized recommendations has been provided to address the identified gaps, strengthen compliance levels, and enhance the overall maturity of the security framework. A remediation roadmap is also proposed to support structured and continuous improvement.",
    
    "This report is intended to serve as a strategic decision-support document for management and security stakeholders, enabling informed actions toward improving the organization's compliance and security posture."
  ];
};

// ─── Tokens ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  compliant:      { label: "Compliant",     bg: "#EAF3DE", color: "#27500A" },
  partial:        { label: "Partial",      bg: "#FAEEDA", color: "#633806" },
  "non-compliant":{ label: "Non-compliant", bg: "#FCEBEB", color: "#791F1F" },
};

const SEVERITY_MAP = {
  critical: { label: "Critical", bg: "#FCEBEB", color: "#791F1F", bar: "#E24B4A" },
  high:     { label: "High",    bg: "#FAEEDA", color: "#633806", bar: "#EF9F27" },
  moderate: { label: "Moderate",   bg: "#EAF3DE", color: "#27500A", bar: "#639922" },
};

const SCORE_COLOR = {
  compliant:       "#3B6D11",
  partial:         "#854F0B",
  "non-compliant": "#A32D2D",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Tag = ({ type }) => {
  const t = STATUS_MAP[type] || SEVERITY_MAP[type] || {};
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px",
      borderRadius: 3, background: t.bg, color: t.color,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
};

const SeverityTag = ({ type }) => {
  const t = SEVERITY_MAP[type] || {};
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px",
      borderRadius: 3, background: t.bg, color: t.color,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
};

const ScoreDisplay = ({ score, status }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 2, minWidth: 60, justifyContent: "flex-end" }}>
    <span style={{ fontSize: 15, fontWeight: 500, color: SCORE_COLOR[status], fontVariantNumeric: "tabular-nums" }}>
      {score}
    </span>
    <span style={{ fontSize: 11, color: "#888", margin: "0 1px" }}>/</span>
    <span style={{ fontSize: 11, color: "#888" }}>100</span>
  </div>
);

const Divider = () => (
  <hr style={{ border: "none", borderTop: "0.5px solid #e2e8f0", margin: "24px 0" }} />
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 500, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#6b7280",
    marginBottom: 16, paddingBottom: 8,
    borderBottom: "0.5px solid #e2e8f0",
  }}>
    {children}
  </div>
);

// ─── Executive Summary Component ─────────────────────────────────────────────
const ExecutiveSummary = ({ paragraphs }) => {
  if (!paragraphs || paragraphs.length === 0) return null;
  
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6b7280" }}>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} style={{ marginBottom: 16 }}>
          {paragraph}
        </p>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function ComplianceReport({ data }) {
  // Fusionner les données par défaut avec les données reçues
  const report = {
    ...DEFAULT_DATA,
    ...data,
    domains: data?.domains || DEFAULT_DATA.domains,
    risks: data?.risks || DEFAULT_DATA.risks,
    mitigations: data?.mitigations || DEFAULT_DATA.mitigations,
    policies: data?.policies?.map(p => ({
      ...p,
      gaps: Array.isArray(p.gaps) ? p.gaps : []
    })) || [],
  };

  // 🔥 Utiliser le score réel de l'analyse passé dans les données
  // Ce score vient de l'API (analysis.global_score)
  const globalScore = report.global_score || 0;
  
  // 🔥 Déterminer le status en fonction du score réel
  const getStatusFromScore = (score) => {
    if (score >= 80) return "compliant";
    if (score >= 50) return "partial";
    return "non-compliant";
  };
  
  const getStatusLabelFromScore = (score) => {
    if (score >= 80) return "Compliant";
    if (score >= 50) return "Partially compliant";
    return "Non-compliant";
  };
  
  const actualStatus = getStatusFromScore(globalScore);
  const actualStatusLabel = getStatusLabelFromScore(globalScore);
  const overallToken = STATUS_MAP[actualStatus] || STATUS_MAP.partial;
  
  // 🔥 Générer l'executive summary avec le score réel de l'analyse
  const executiveSummaryParagraphs = generateExecutiveSummary(globalScore);

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      color: "#1a1f36",
      fontSize: 13,
      padding: "2px 0 40px",
      maxWidth: 860,
      margin: "0 auto",
    }}>
      {/* ── Cover ── */}
      <div style={{ borderBottom: "0.5px solid #e2e8f0", paddingBottom: 28, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {report.organisation} — {report.department}
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
            <div>{report.date}</div>
            <div>{report.classification} — {report.version}</div>
          </div>
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.3, marginBottom: 8 }}>
          Compliance Analysis and Risk Management Report
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, maxWidth: 480 }}>
          Results of the information security policy assessment conducted by the internal audit team,
          intended for the CISO and general management.
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          marginTop: 20, paddingTop: 18, borderTop: "0.5px solid #e2e8f0",
        }}>
          {[
            ["Auditor", report.auditor],
            ["Frameworks", report.frameworks],
            ["Scope", report.scope],
          ].map(([label, val], i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {i > 0 && <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />}
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {label}{" "}
                <span style={{ color: "#1a1f36", fontWeight: 500 }}>{val}</span>
              </div>
            </div>
          ))}
          <span style={{
            marginLeft: "auto", fontSize: 11, fontWeight: 500, padding: "3px 10px",
            borderRadius: 3, background: overallToken.bg, color: overallToken.color,
          }}>
            {actualStatusLabel}
          </span>
        </div>
      </div>
    
      {/* ── Executive summary ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Executive Summary</SectionTitle>
        <ExecutiveSummary paragraphs={executiveSummaryParagraphs} />
      </div>

      <Divider />

      {/* ── Domains ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Compliance by Domain</SectionTitle>
        {report.domains.map((d) => (
          <div key={d.name} style={{
            border: "0.5px solid #e2e8f0", borderRadius: 8,
            overflow: "hidden", marginBottom: 8,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{d.ref}</div>
              <ScoreDisplay score={d.score} status={d.status} />
              <Tag type={d.status} />
            </div>
            
            {/* Gaps */}
            {d.gaps && d.gaps.length > 0 && (
              <div style={{
                padding: "10px 16px 13px",
                borderTop: "0.5px solid #e2e8f0",
                background: "#fafafa",
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "#9ca3af",
                  marginBottom: 8,
                }}>
                  Identified Gaps
                </div>
                {d.gaps.map((gap, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12,
                    color: "#6b7280",
                    lineHeight: 1.55,
                    marginBottom: i < d.gaps.length - 1 ? 5 : 0,
                  }}>
                    <span style={{
                      marginTop: 5,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: SCORE_COLOR[d.status],
                      flexShrink: 0,
                    }} />
                    {typeof gap === 'string' ? gap : gap.description || JSON.stringify(gap)}
                  </div>
                ))}
              </div>
            )}
            
            {/* comment */}
            {d.comment && (
              <div style={{
                padding: "10px 16px 13px",
                fontSize: 12, color: "#6b7280", lineHeight: 1.65,
                borderTop: "0.5px solid #e2e8f0",
              }}>
                {d.comment}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="page-break" />

      <Divider />
      
      <div className="avoid-break">
        {/* ── Risks ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionTitle>Identified Risks</SectionTitle>
          {report.risks.map((r, i) => {
            const sev = SEVERITY_MAP[r.severity] || SEVERITY_MAP.high;
            return (
              <div key={i} style={{
                display: "flex", gap: 0, marginBottom: 8,
                border: "0.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden",
              }}>
                <div style={{ width: 3, flexShrink: 0, background: sev.bar }} />
                <div style={{
                  padding: "12px 14px", flex: 1,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{r.title}</div>
                  <SeverityTag type={r.severity} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="page-break" />

      <Divider />
      
      <div className="avoid-break">
        {/* ── Mitigations ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionTitle>Mitigation Plan</SectionTitle>
          {report.mitigations.map((m, i) => {
            const sev = SEVERITY_MAP[m.priority] || SEVERITY_MAP.moderate;
            return (
              <div key={i} style={{
                padding: "12px 0",
                borderBottom: i < report.mitigations.length - 1 ? "0.5px solid #e2e8f0" : "none",
                display: "flex", alignItems: "baseline", gap: 10,
              }}>
                <div style={{ fontSize: 11, color: "#6b7280", minWidth: 20 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{m.title}</div>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "2px 8px",
                  borderRadius: 3, background: sev.bg, color: sev.color,
                  flexShrink: 0,
                }}>
                  {sev.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "0.5px solid #e2e8f0", paddingTop: 16,
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#9ca3af",
      }}>
        <span>Confidential document — exclusive use of the ISS Department of {report.organisation}</span>
        <span>Generated on {report.date} · {report.version}</span>
      </div>
    </div>
  );
}