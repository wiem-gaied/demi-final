import { useRef } from "react";

// ─── Default data (overridden by real data) ─────────────────────────────────
const DEFAULT_DATA = {
  organisation: "Acme Corporation",
  department: "ISS Department",
  date: "April 25, 2026",
  version: "v1.0",
  classification: "Confidential Report",
  auditor: "ISS Team",
  frameworks: "ISO 27001",
  scope: "Global information system",
  global_score: 0,
  kpis: { analyzed: 0, covered: 0, partial: 0, notCovered: 0, notApplicable: 0, validated: 0 },
  items: [],
  notApplicableItems: [],
  risks: [],
  mitigations: [],
};

// ─── Executive summary ──────────────────────────────────────────────────────
const generateExecutiveSummary = (score) => {
  const complianceText = score >= 80 ? "satisfactory"
                       : score >= 50 ? "partially compliant" : "non-compliant";
  return [
    "This report presents the results of the compliance assessment conducted within the defined scope of the organization. The analysis was carried out in alignment with applicable security frameworks, standards, and industry best practices in information security and risk management.",
    `The overall level of compliance is assessed as ${complianceText} (${score}%), indicating the current maturity of the implemented controls against the reference framework.`,
    "The analysis is item-centric: every imported framework control is evaluated against the policies detected in the uploaded document. For each (control, policy) pair, the report details how the policy addresses the control, the residual risks identified, the gaps observed, and the mitigation actions recommended.",
    "Items not addressed by any policy in the document are excluded from the global score but listed in the annex for completeness.",
    "A prioritized set of recommendations and a consolidated mitigation plan are provided to support structured and continuous improvement.",
    "This document serves as a decision-support tool for the CISO and senior management to direct remediation effort toward the most impactful gaps.",
  ];
};

// ─── Tokens ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  compliant:       { label: "Compliant",     bg: "#EAF3DE", color: "#27500A" },
  partial:         { label: "Partial",       bg: "#FAEEDA", color: "#633806" },
  "non-compliant": { label: "Non-compliant", bg: "#FCEBEB", color: "#791F1F" },
};
const SEVERITY_MAP = {
  critical: { label: "Critical", bg: "#FCEBEB", color: "#791F1F", bar: "#E24B4A" },
  high:     { label: "High",     bg: "#FAEEDA", color: "#633806", bar: "#EF9F27" },
  moderate: { label: "Moderate", bg: "#EAF3DE", color: "#27500A", bar: "#639922" },
};
const SCORE_COLOR = {
  compliant: "#3B6D11", partial: "#854F0B", "non-compliant": "#A32D2D",
};
const ITEM_STATUS_MAP = {
  Covered:          { label: "Covered",        bg: "#EAF3DE", color: "#27500A", bar: "#639922" },
  Partial:          { label: "Partial",        bg: "#FAEEDA", color: "#633806", bar: "#EF9F27" },
  "Not covered":    { label: "Not covered",    bg: "#FCEBEB", color: "#791F1F", bar: "#E24B4A" },
  "Not applicable": { label: "Not applicable", bg: "#F1F5F9", color: "#475569", bar: "#94a3b8" },
};

// ─── Atoms ──────────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 500, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#6b7280",
    marginBottom: 16, paddingBottom: 8, borderBottom: "0.5px solid #e2e8f0",
  }}>{children}</div>
);
const Divider = () => (
  <hr style={{ border: "none", borderTop: "0.5px solid #e2e8f0", margin: "24px 0" }} />
);
const ScoreDisplay = ({ score, statusKey }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 2, minWidth: 60, justifyContent: "flex-end" }}>
    <span style={{ fontSize: 15, fontWeight: 500, color: SCORE_COLOR[statusKey] || "#475569", fontVariantNumeric: "tabular-nums" }}>{score}</span>
    <span style={{ fontSize: 11, color: "#888", margin: "0 1px" }}>/</span>
    <span style={{ fontSize: 11, color: "#888" }}>100</span>
  </div>
);
const SeverityTag = ({ type }) => {
  const t = SEVERITY_MAP[type] || {};
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: t.bg, color: t.color, flexShrink: 0, whiteSpace: "nowrap" }}>
      {t.label}
    </span>
  );
};
const ExecutiveSummary = ({ paragraphs }) => (
  <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6b7280" }}>
    {paragraphs.map((p, i) => <p key={i} style={{ marginBottom: 16 }}>{p}</p>)}
  </div>
);

// ─── KPI dashboard ──────────────────────────────────────────────────────────
const KPIDashboard = ({ kpis, globalScore, statusKey }) => (
  <div>
    <div style={{
      display: "flex", alignItems: "center", gap: 16, marginBottom: 14,
      padding: "12px 16px", background: "#fafafa",
      border: "0.5px solid #e2e8f0", borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em" }}>
        Overall compliance (applicable items)
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: SCORE_COLOR[statusKey], fontVariantNumeric: "tabular-nums" }}>
        {globalScore}%
      </div>
      <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${globalScore}%`, height: "100%", background: SCORE_COLOR[statusKey], borderRadius: 3 }} />
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
      {[
        { label: "Items analyzed", value: kpis.analyzed,      color: "#3B6FFF" },
        { label: "Covered",        value: kpis.covered,       color: "#27500A" },
        { label: "Partial",        value: kpis.partial,       color: "#633806" },
        { label: "Not covered",    value: kpis.notCovered,    color: "#791F1F" },
        { label: "Not applicable", value: kpis.notApplicable, color: "#475569" },
        { label: "CISO validated", value: kpis.validated,     color: "#6D28D9" },
      ].map(k => (
        <div key={k.label} style={{
          background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 8,
          padding: "12px 8px", textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
          <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 500, marginTop: 4, textTransform: "uppercase", letterSpacing: ".03em" }}>{k.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Item block (one card per control item) ─────────────────────────────────
const ItemBlock = ({ item }) => {
  const status = ITEM_STATUS_MAP[item.effectiveStatus] || ITEM_STATUS_MAP["Not covered"];
  const statusKey = item.effectiveStatus === "Covered" ? "compliant"
                  : item.effectiveStatus === "Partial" ? "partial" : "non-compliant";
  const typeLabel =
    (item.type || "").startsWith("core")  ? "Core"  :
    (item.type || "").startsWith("annex") ? "Annex" : "";

  return (
    <div style={{
      border: "0.5px solid #e2e8f0", borderRadius: 8,
      overflow: "hidden", marginBottom: 12,
    }} className="avoid-break">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fafafa", borderBottom: "0.5px solid #e2e8f0" }}>
        {item.ref_id && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3, background: "#fff", color: "#64748b", border: "0.5px solid #e2e8f0", whiteSpace: "nowrap" }}>{item.ref_id}</span>
        )}
        {typeLabel && (
          <span style={{ fontSize: 9, color: "#fff", background: "#3B6FFF", padding: "2px 6px", borderRadius: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{typeLabel}</span>
        )}
        <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{item.title}</div>
        <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: status.bg, color: status.color, whiteSpace: "nowrap" }}>
          {item.ciso_status ? `CISO · ${status.label}` : status.label}
        </span>
        <ScoreDisplay score={item.effectiveScore} statusKey={statusKey} />
      </div>

      {/* CISO comment */}
      {item.ciso_comment && (
        <div style={{ padding: "8px 14px", fontSize: 11, color: "#475569", lineHeight: 1.55, fontStyle: "italic", background: "#F5F0FF", borderBottom: "0.5px solid #e2e8f0" }}>
          <strong style={{ color: "#6D28D9", fontStyle: "normal" }}>CISO comment:</strong> {item.ciso_comment}
        </div>
      )}

      {/* Policies */}
      {(item.policies || []).length > 0 && (
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".07em", color: "#9ca3af", marginBottom: 8 }}>
            Relevant policies ({item.policies.length})
          </div>
          {item.policies.map((pa, idx) => <PolicyMiniBlock key={idx} pa={pa} />)}
        </div>
      )}
    </div>
  );
};

// ─── Policy mini-block (nested inside an item) ──────────────────────────────
const PolicyMiniBlock = ({ pa }) => {
  const effStatus = pa.ciso_status || pa.status;
  const status = ITEM_STATUS_MAP[effStatus] || ITEM_STATUS_MAP["Not covered"];

  return (
    <div style={{
      borderLeft: `3px solid ${status.bar}`,
      padding: "8px 12px", marginBottom: 8,
      background: "#fafafa", borderRadius: "0 6px 6px 0",
    }} className="avoid-break">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: "#1a1f36" }}>{pa.policy_name}</span>
        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 3, background: status.bg, color: status.color, fontWeight: 500 }}>
          {pa.ciso_status ? `CISO · ${status.label}` : status.label}
        </span>
        {pa.conf > 0 && (
          <span style={{ fontSize: 10, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{pa.conf}%</span>
        )}
      </div>

      {pa.policy_summary && (
        <div style={{ fontSize: 10.5, color: "#6b7280", lineHeight: 1.5, marginBottom: 6, fontStyle: "italic" }}>
          {pa.policy_summary}
        </div>
      )}

      {pa.comment && (
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.55, marginBottom: 6 }}>
          {pa.comment}
        </div>
      )}

      {(pa.risks || []).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#A32D2D", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>
            Risks ({pa.risks.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#475569", lineHeight: 1.55 }}>
            {pa.risks.map((r, i) => {
              const desc = typeof r === "string" ? r : (r.description || r.intitule || "");
              const impact = r.impact, proba = r.probability || r.probabilite;
              return (
                <li key={i} style={{ marginBottom: 2 }}>
                  {desc || "—"}
                  {(impact || proba) && <span style={{ marginLeft: 6, fontSize: 9.5, color: "#9ca3af" }}>· I:{impact}/P:{proba}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(pa.gaps || []).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#854F0B", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>
            Gaps ({pa.gaps.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#475569", lineHeight: 1.55 }}>
            {pa.gaps.map((g, i) => (
              <li key={i} style={{ marginBottom: 2 }}>{typeof g === "string" ? g : (g.description || "")}</li>
            ))}
          </ul>
        </div>
      )}

      {pa.remediation && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#3B6D11", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>
            Mitigation
          </div>
          <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {pa.remediation}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
export default function ComplianceReport({ data }) {
  const report = { ...DEFAULT_DATA, ...data };
  const globalScore = report.global_score || 0;

  const getStatusKey   = (s) => s >= 80 ? "compliant" : s >= 50 ? "partial" : "non-compliant";
  const getStatusLabel = (s) => s >= 80 ? "Compliant" : s >= 50 ? "Partially compliant" : "Non-compliant";

  const statusKey   = getStatusKey(globalScore);
  const statusLabel = getStatusLabel(globalScore);
  const overallToken = STATUS_MAP[statusKey];
  const summaryParagraphs = generateExecutiveSummary(globalScore);

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif", color: "#1a1f36",
      fontSize: 13, padding: "2px 0 40px", maxWidth: 860, margin: "0 auto",
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
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, maxWidth: 540 }}>
          Item-centric analysis of the information security policies in the assessed document, mapped against the imported framework controls. Intended for the CISO and senior management.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 20, paddingTop: 18, borderTop: "0.5px solid #e2e8f0" }}>
          {[
            ["Auditor", report.auditor],
            ["Frameworks", report.frameworks],
            ["Scope", report.scope],
          ].map(([label, val], i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {i > 0 && <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />}
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {label} <span style={{ color: "#1a1f36", fontWeight: 500 }}>{val}</span>
              </div>
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 3, background: overallToken.bg, color: overallToken.color }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ── Executive summary ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Executive Summary</SectionTitle>
        <ExecutiveSummary paragraphs={summaryParagraphs} />
      </div>

      <Divider />

      {/* ── KPI dashboard ── */}
      <div style={{ marginBottom: 32 }} className="avoid-break">
        <SectionTitle>Key Performance Indicators</SectionTitle>
        <KPIDashboard kpis={report.kpis} globalScore={globalScore} statusKey={statusKey} />
      </div>

      <div className="page-break" />
      <Divider />

      {/* ── Compliance by Control Item ── */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>Compliance by Control Item ({report.items.length})</SectionTitle>
        {report.items.length === 0
          ? <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", padding: "12px 0" }}>No applicable items in this analysis.</div>
          : report.items.map(it => <ItemBlock key={it.item_id} item={it} />)
        }
      </div>

      <div className="page-break" />
      <Divider />

      {/* ── Aggregated risks ── */}
      <div style={{ marginBottom: 32 }} className="avoid-break">
        <SectionTitle>Identified Risks ({report.risks.length})</SectionTitle>
        {report.risks.length === 0
          ? <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", padding: "12px 0" }}>No risk identified during the analysis.</div>
          : report.risks.map((r, i) => {
              const sev = SEVERITY_MAP[r.severity] || SEVERITY_MAP.high;
              return (
                <div key={i} style={{ display: "flex", gap: 0, marginBottom: 8, border: "0.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: 3, flexShrink: 0, background: sev.bar }} />
                  <div style={{ padding: "10px 14px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{r.title}</div>
                      <SeverityTag type={r.severity} />
                    </div>
                    {(r.item || r.policy) && (
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>
                        {r.item && <span>↳ {r.item}</span>}
                        {r.item && r.policy && <span style={{ margin: "0 6px" }}>·</span>}
                        {r.policy && <span>{r.policy}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>

      <div className="page-break" />
      <Divider />

      {/* ── Mitigation plan ── */}
      <div style={{ marginBottom: 32 }} className="avoid-break">
        <SectionTitle>Mitigation Plan ({report.mitigations.length})</SectionTitle>
        {report.mitigations.length === 0
          ? <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", padding: "12px 0" }}>No mitigation action defined.</div>
          : report.mitigations.map((m, i) => {
              const sev = SEVERITY_MAP[m.priority] || SEVERITY_MAP.moderate;
              return (
                <div key={i} style={{ padding: "12px 0", borderBottom: i < report.mitigations.length - 1 ? "0.5px solid #e2e8f0" : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", minWidth: 20, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{m.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: sev.bg, color: sev.color, flexShrink: 0 }}>{sev.label}</span>
                  </div>
                  {(m.item || m.policy) && (
                    <div style={{ fontSize: 10, color: "#9ca3af", paddingLeft: 30 }}>
                      {m.item && <span>↳ {m.item}</span>}
                      {m.item && m.policy && <span style={{ margin: "0 6px" }}>·</span>}
                      {m.policy && <span>{m.policy}</span>}
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>

      {/* ── Annex: Not applicable items ── */}
      {report.notApplicableItems && report.notApplicableItems.length > 0 && (
        <>
          <div className="page-break" />
          <Divider />
          <div style={{ marginBottom: 32 }}>
            <SectionTitle>Annex — Not Applicable Items ({report.notApplicableItems.length})</SectionTitle>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12, fontStyle: "italic" }}>
              These items were not addressed by any policy in the uploaded document and are excluded from the global compliance score.
            </p>
            {report.notApplicableItems.map(it => (
              <div key={it.item_id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", marginBottom: 4,
                border: "0.5px solid #e2e8f0", borderRadius: 6, background: "#fafafa",
              }}>
                {it.ref_id && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3, background: "#fff", color: "#64748b", border: "0.5px solid #e2e8f0" }}>{it.ref_id}</span>
                )}
                <div style={{ fontSize: 12, color: "#475569", flex: 1 }}>{it.title}</div>
                <span style={{ fontSize: 10, color: "#475569", background: "#F1F5F9", padding: "2px 7px", borderRadius: 3, fontWeight: 500 }}>
                  Not applicable
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div style={{
        borderTop: "0.5px solid #e2e8f0", paddingTop: 16, marginTop: 32,
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#9ca3af",
      }}>
        <span>Confidential document — exclusive use of the ISS Department of {report.organisation}</span>
        <span>Generated on {report.date} · {report.version}</span>
      </div>
    </div>
  );
}