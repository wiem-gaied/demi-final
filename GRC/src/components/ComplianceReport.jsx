import { useRef } from "react";

// ─── Default demo data ───────────────────────────────────────────────────────
const DEFAULT_DATA = {
  organisation: "Acme Corporation",
  department: "Direction Sécurité des Systèmes d'Information",
  date: "25 avril 2026",
  version: "v1.0",
  classification: "Rapport confidentiel",
  auditor: "Équipe SSI",
  frameworks: "ISO 27001 · NIST CSF · GDPR",
  scope: "Système d'information global",
  overallStatus: "partial", // "compliant" | "partial" | "non-compliant"
  overallStatusLabel: "Partiellement conforme",
  executiveSummary:
    "L'audit conduit en avril 2026 couvre 142 contrôles répartis sur six domaines de sécurité. Le niveau de conformité global s'établit à 75 %, ce qui reflète une maturité satisfaisante sur les domaines de gestion des actifs et de sécurité physique, mais révèle des lacunes significatives en matière de contrôle d'accès et de réponse aux incidents. Trois non-conformités critiques ont été identifiées et requièrent un plan de remédiation immédiat.",
  domains: [
    {
      name: "Contrôle d'accès",
      ref: "ISO 27001 A.9",
      score: 58,
      // "compliant" | "partial" | "non-compliant"
      status: "non-compliant",
      comment:
        "L'absence de solution PAM et le non-respect du principe du moindre privilège sur 12 comptes de service sont les causes principales. L'authentification multi-facteurs n'est pas généralisée aux comptes administrateurs, en violation directe du contrôle ISO 27001 A.9.2.3.",
    },
    {
      name: "Protection des données",
      ref: "GDPR Art. 25",
      score: 72,
      status: "partial",
      comment:
        "Quatre catégories de données personnelles dépassent les durées légales de conservation sans déclenchement de suppression automatique. La cartographie des traitements est incomplète, limitant la visibilité sur les flux de données transfrontaliers.",
    },
    {
      name: "Réponse aux incidents",
      ref: "NIST CSF — RS",
      score: 67,
      status: "partial",
      comment:
        "Le plan de réponse aux incidents n'a pas été testé depuis le T1 2025. Les playbooks couvrent les scénarios de ransomware mais restent insuffisants pour les fuites de données impliquant des tiers.",
    },
    {
      name: "Gestion des actifs",
      ref: "ISO 27001 A.8",
      score: 89,
      status: "compliant",
      comment:
        "L'inventaire des actifs est tenu à jour et classifié selon les niveaux de sensibilité définis. Un écart mineur subsiste sur la documentation de certains actifs logiciels en fin de support, sans impact critique identifié.",
    },
    {
      name: "Gestion des risques",
      ref: "NIST CSF — ID.RM",
      score: 82,
      status: "compliant",
      comment:
        "Le registre des risques est formalisé et révisé trimestriellement. La marge de progression concerne l'intégration des risques tiers dans le registre central, encore gérés séparément par les équipes achats.",
    },
    {
      name: "Sécurité physique",
      ref: "ISO 27001 A.11",
      score: 95,
      status: "compliant",
      comment:
        "Excellent niveau de conformité. Les contrôles d'accès physiques aux salles serveurs sont effectifs. Le seul point résiduel porte sur la procédure de destruction des supports amovibles dans les sites secondaires.",
    },
  ],
  risks: [
    { title: "Accès privilégiés non contrôlés", severity: "critical" },
    { title: "Rétention de données personnelles hors délai légal", severity: "critical" },
    { title: "Évaluation des fournisseurs tiers incomplète", severity: "high" },
    { title: "Plan de continuité non exercé depuis 12 mois", severity: "high" },
  ],
  mitigations: [
    { title: "Déploiement d'une solution PAM avec MFA obligatoire", priority: "critical" },
    { title: "Automatisation de la gestion du cycle de vie des données", priority: "critical" },
    { title: "Campagne d'évaluation sécurité fournisseurs Tier-1 et Tier-2", priority: "high" },
    { title: "Exercice de simulation de crise (tabletop ransomware)", priority: "high" },
    { title: "Tableau de bord de conformité en temps réel dans la plateforme GRC", priority: "moderate" },
  ],
};

// ─── Tokens ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  compliant:      { label: "Conforme",     bg: "#EAF3DE", color: "#27500A" },
  partial:        { label: "Partiel",      bg: "#FAEEDA", color: "#633806" },
  "non-compliant":{ label: "Non conforme", bg: "#FCEBEB", color: "#791F1F" },
};

const SEVERITY_MAP = {
  critical: { label: "Critique", bg: "#FCEBEB", color: "#791F1F", bar: "#E24B4A" },
  high:     { label: "Élevé",    bg: "#FAEEDA", color: "#633806", bar: "#EF9F27" },
  moderate: { label: "Modéré",   bg: "#EAF3DE", color: "#27500A", bar: "#639922" },
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function ComplianceReport({ data }) {
  const report = { ...DEFAULT_DATA, ...data };

  const overallToken = STATUS_MAP[report.overallStatus] || STATUS_MAP.partial;

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
          Rapport d'analyse de conformité<br />et gestion des risques
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, maxWidth: 480 }}>
          Résultats de l'évaluation des politiques de sécurité de l'information menée par l'équipe
          d'audit interne, à destination du RSSI et de la direction générale.
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          marginTop: 20, paddingTop: 18, borderTop: "0.5px solid #e2e8f0",
        }}>
          {[
            ["Auditeur", report.auditor],
            ["Référentiels", report.frameworks],
            ["Périmètre", report.scope],
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
            {report.overallStatusLabel || overallToken.label}
          </span>
        </div>
      </div>
    
        {/* ── Executive summary ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Synthèse exécutive</SectionTitle>
        <p style={{ fontSize: 13, lineHeight: 1.75, color: "#6b7280" }}>
          {report.executiveSummary}
        </p>
      </div>
    

      

      <Divider />
    

    {/* ── Domains ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Conformité par domaine</SectionTitle>
        {report.domains.map((d) => (
          <div key={d.name} style={{
            border: "0.5px solid #e2e8f0", borderRadius: 8,
            overflow: "hidden", marginBottom: 8,
          }}>
            {/* domain row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{d.ref}</div>
              <ScoreDisplay score={d.score} status={d.status} />
              <Tag type={d.status} />
            </div>
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
        <SectionTitle>Risques identifiés</SectionTitle>
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
        <SectionTitle>Plan de mitigation</SectionTitle>
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
        <span>Document confidentiel — usage exclusif de la Direction SSI de {report.organisation}</span>
        <span>Généré le {report.date} · {report.version}</span>
      </div>

    </div>
  );
}