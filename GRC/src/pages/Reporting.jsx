import { useState } from "react";

const SECTIONS = [
  {
    id: "compliance-status",
    label: "Compliance Status",
    description: "Framework adherence rates, open findings, and remediation progress",
    tag: "compliance",
    content: () => (
      <section>
        <SectionHeading index="01" title="Compliance Status" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "ISO 27001 Adherence", value: "87%", delta: "+4%", color: "#059669" },
            { label: "GDPR Compliance", value: "94%", delta: "+2%", color: "#059669" },
            { label: "Open Findings", value: "12", delta: "−5", color: "#D97706" },
            { label: "Overdue Actions", value: "3", delta: "−2", color: "#DC2626" },
          ].map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "ISO 27001", pct: 87 },
            { label: "GDPR", pct: 94 },
            { label: "SOC 2", pct: 72 },
            { label: "DORA", pct: 58 },
          ].map((f) => (
            <ProgressRow key={f.label} {...f} />
          ))}
        </div>
      </section>
    ),
  },
  {
    id: "audit-findings",
    label: "Audit Findings",
    description: "Internal audit results, control gaps, and corrective actions",
    tag: "audit",
    content: () => (
      <section>
        <SectionHeading index="02" title="Audit Findings" />
        <ReportTable
          headers={["Finding", "Severity", "Owner", "Due", "Status"]}
          rows={[
            ["MFA not enforced — legacy apps", "Critical", "IT Security", "Apr 30", "Remediated"],
            ["Incomplete access review Q1", "High", "IAM Team", "May 15", "In progress"],
            ["Missing DR test documentation", "Medium", "IT Ops", "May 20", "Pending"],
            ["Outdated incident response plan", "High", "SecOps", "Apr 12", "Overdue"],
            ["Log retention below policy minimum", "Medium", "SOC", "May 31", "In progress"],
          ]}
          statusCol={4}
        />
      </section>
    ),
  },
  {
    id: "asset-inventory",
    label: "Asset Inventory",
    description: "Critical asset classification, ownership, and risk exposure",
    tag: "assets",
    content: () => (
      <section>
        <SectionHeading index="03" title="Asset Inventory" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Assets", value: "1,284", delta: "+37", color: "#3B6FFF" },
            { label: "Critical Assets", value: "142", delta: "+8", color: "#DC2626" },
            { label: "Unclassified", value: "21", delta: "−14", color: "#D97706" },
          ].map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
        <ReportTable
          headers={["Asset", "Classification", "Owner", "Risk Level"]}
          rows={[
            ["ERP System — SAP", "Critical", "IT Ops", "High"],
            ["Customer database — primary", "Critical", "DBA Team", "Critical"],
            ["Internal VPN gateway", "Sensitive", "Network", "Medium"],
            ["HR information system", "Sensitive", "HR IT", "Medium"],
          ]}
          statusCol={3}
        />
      </section>
    ),
  },
];

const SAVED_REPORTS = [
  
];

const TAG_COLORS = {
  compliance: { bg: "#F0FDF4", text: "#15803D" },
  audit:      { bg: "#FFFBEB", text: "#92400E" },
  assets:     { bg: "#F0F9FF", text: "#0C4A6E" },
};

const PRIORITY_STYLES = {
  Critical: { bg: "#FEF2F2", text: "#B91C1C", dot: "#DC2626" },
  High:     { bg: "#FFFBEB", text: "#92400E", dot: "#D97706" },
  Medium:   { bg: "#EFF6FF", text: "#1E40AF", dot: "#3B82F6" },
  Low:      { bg: "#F0FDF4", text: "#166534", dot: "#22C55E" },
};

const STATUS_STYLES = {
  "Remediated":  { color: "#15803D" },
  "Active":      { color: "#15803D" },
  "Mitigated":   { color: "#15803D" },
  "In progress": { color: "#1D4ED8" },
  "In review":   { color: "#1D4ED8" },
  "Monitoring":  { color: "#1D4ED8" },
  "Pending":     { color: "#92400E" },
  "Open":        { color: "#B91C1C" },
  "Overdue":     { color: "#B91C1C" },
  "Due for review": { color: "#B91C1C" },
  "Critical":    { color: "#B91C1C" },
  "High":        { color: "#92400E" },
  "Medium":      { color: "#1D4ED8" },
};

function SectionHeading({ index, title }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9CA3AF", letterSpacing: "0.08em", minWidth: 24 }}>{index}</span>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>{title}</h2>
    </div>
  );
}

function KpiCard({ label, value, delta, color }) {
  const positive = delta.startsWith("+");
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "16px 18px", border: "1px solid #E5E7EB" }}>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 4, fontFamily: "'Fraunces', Georgia, serif" }}>{value}</p>
      <p style={{ fontSize: 12, color: positive ? "#059669" : "#DC2626", fontWeight: 500 }}>
        {delta} vs last period
      </p>
    </div>
  );
}

function ProgressRow({ label, pct }) {
  const color = pct >= 85 ? "#059669" : pct >= 70 ? "#D97706" : "#DC2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 80, fontSize: 13, color: "#374151", fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ width: 36, fontSize: 12, fontWeight: 600, color, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function ReportTable({ headers, rows, statusCol }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              {row.map((cell, ci) => {
                const isStatus = ci === statusCol;
                const style = isStatus ? STATUS_STYLES[cell] : null;
                return (
                  <td key={ci} style={{ padding: "10px 12px", color: isStatus ? (style?.color || "#374151") : "#374151", fontWeight: isStatus ? 500 : 400, fontSize: 13, whiteSpace: ci === 0 ? "normal" : "nowrap" }}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationRow({ priority, text }) {
  const s = PRIORITY_STYLES[priority];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#FAFAFA", border: "1px solid #E5E7EB", borderRadius: 8 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 999, background: s.bg, color: s.text, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
        {priority}
      </span>
      <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

const inputStyle = {
  width: "100%", height: 34, padding: "0 10px",
  background: "#F9FAFB", border: "1px solid #E5E7EB",
  borderRadius: 8, fontSize: 13, color: "#111827",
  fontFamily: "inherit", outline: "none",
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function ReportBuilder() {
  const [step, setStep] = useState("selection");
  const [selected, setSelected] = useState([]);
  const [reportTitle, setReportTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [classification, setClassification] = useState("Confidential");
  const [period, setPeriod] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const toggleSection = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const selectAll = () =>
    setSelected(selected.length === SECTIONS.length ? [] : SECTIONS.map((s) => s.id));

  const tags = ["all", ...Array.from(new Set(SECTIONS.map((s) => s.tag)))];
  const visible = activeFilter === "all" ? SECTIONS : SECTIONS.filter((s) => s.tag === activeFilter);
  const ordered = SECTIONS.filter((s) => selected.includes(s.id));

  // Step 3: View final report
  if (step === "view") {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => setStep("selection")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "1px solid #E5E7EB", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "#374151", fontFamily: "inherit" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to builder
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid #E5E7EB", color: "#6B7280" }}>{classification}</span>
            <button
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#3B6FFF", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "inherit" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export / Print
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 24px 60px" }}>
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ background: "#3B6FFF", padding: "36px 48px 32px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
                <div style={{ textAlign: "right", marginLeft: "auto" }}>
                  <p style={{ color: "#E0E7FF", fontSize: 12, lineHeight: 1.8 }}>Prepared by: {author}</p>
                  <p style={{ color: "#E0E7FF", fontSize: 12, lineHeight: 1.8 }}>Period: {period}</p>
                  <p style={{ color: "#E0E7FF", fontSize: 12, lineHeight: 1.8 }}>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.3 }}>{reportTitle}</h1>
              <p style={{ color: "#E0E7FF", fontSize: 13, marginTop: 8 }}>{ordered.length} section{ordered.length !== 1 ? "s" : ""} included</p>
            </div>

            <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 40 }}>
              {ordered.map((s) => (
                <div key={s.id}>
                  {s.content()}
                </div>
              ))}

              <section>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #E5E7EB" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9CA3AF", letterSpacing: "0.08em" }}>—</span>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>Executive Remarks</h2>
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  style={{ minHeight: 80, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", fontSize: 14, color: "#6B7280", lineHeight: 1.8, outline: "none" }}
                >
                  Click to add executive remarks, observations, or overall assessment for this reporting period...
                </div>
              </section>

              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{reportTitle} — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 10px", border: "1px solid #E5E7EB", borderRadius: 4, color: "#6B7280" }}>{classification}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Configure report details
  if (step === "configure") {
    const canGenerate = reportTitle.trim() && author.trim() && period.trim();

    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, maxWidth: 520, width: "100%", overflow: "hidden" }}>
          <div style={{ background: "#3152ac", padding: "28px 32px" }}>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>Configure Report</h2>
            <p style={{ color: "#E0E7FF", fontSize: 13, marginTop: 6 }}>Fill in the required information to generate your report</p>
          </div>

          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
              <Field label="Report Title *">
                <input
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  placeholder="e.g., Q2 2026 — GRC Compliance Report"
                  style={inputStyle}
                />
              </Field>

              <Field label="Prepared By *">
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="e.g., Security & Compliance Team"
                  style={inputStyle}
                />
              </Field>

              <Field label="Period *">
                <input
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  placeholder="e.g., April 1 – June 30, 2026"
                  style={inputStyle}
                />
              </Field>

              <Field label="Classification">
                <select value={classification} onChange={e => setClassification(e.target.value)} style={inputStyle}>
                  <option>Confidential</option>
                  <option>Internal use only</option>
                  <option>Restricted</option>
                  <option>Public</option>
                </select>
              </Field>
            </div>

            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "16px 18px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Selected Sections</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ordered.map(s => {
                  const tc = TAG_COLORS[s.tag];
                  return (
                    <span key={s.id} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: tc.bg, color: tc.text }}>
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setStep("selection")}
                style={{ flex: 1, padding: "11px 0", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
              >
                Back
              </button>
              <button
                disabled={!canGenerate}
                onClick={() => setStep("view")}
                style={{ flex: 1, padding: "11px 0", background: canGenerate ? "#3B6FFF" : "#E5E7EB", color: canGenerate ? "#fff" : "#9CA3AF", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: canGenerate ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "background 0.2s" }}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Select sections
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "40px 48px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 6px", fontFamily: "'Fraunces', Georgia, serif", letterSpacing: "-0.01em" }}>Create New Report</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Select the sections you want to include in your report</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 20 }}>
          <button onClick={selectAll} style={{ fontSize: 13, color: "#3B6FFF", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
            {selected.length === SECTIONS.length ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {SECTIONS.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <div key={s.id} onClick={() => toggleSection(s.id)}
                style={{ background: "#fff", border: checked ? "2px solid #3B6FFF" : "1px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s",
                  boxShadow: checked ? "0 4px 12px rgba(59, 111, 255, 0.15)" : "none",
                }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <input type="checkbox" checked={checked} onChange={() => {}} onClick={e => e.stopPropagation()}
                    style={{ marginTop: 2, accentColor: "#3B6FFF", flexShrink: 0, width: 18, height: 18, cursor: "pointer" }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>{s.label}</h3>
                    <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{s.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ position: "sticky", bottom: 32, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
          <span style={{ fontSize: 14, color: "#6B7280" }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>{selected.length}</span> of {SECTIONS.length} sections selected
          </span>
          <button
            disabled={selected.length === 0}
            onClick={() => setStep("configure")}
            style={{ padding: "11px 24px", background: selected.length === 0 ? "#E5E7EB" : "#3B6FFF", color: selected.length === 0 ? "#9CA3AF" : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: selected.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
          >
            Continue to Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedReportsView() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "40px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 6px", fontFamily: "'Fraunces', Georgia, serif", letterSpacing: "-0.01em" }}>Saved Reports</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>View and manage previously generated reports</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {SAVED_REPORTS.map((report) => (
            <div key={report.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", transition: "all 0.2s", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>

              <div style={{ background: "#3d61bd", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", marginBottom: 12 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: report.status === "Final" ? "#15803D" : "#6B7280", color: "#fff", fontWeight: 600 }}>
                    {report.status}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.4 }}>{report.title}</h3>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Period</p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{report.period}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Author</p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{report.author}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sections</p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{report.sections} sections included</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#F3F4F6", color: "#6B7280", fontWeight: 500 }}>
                    {report.classification}
                  </span>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ padding: "20px 32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>Reporting</h1>
              
            </div>
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setActiveTab("view")}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "view" ? "2px solid #3B6FFF" : "2px solid transparent",
                color: activeTab === "view" ? "#3B6FFF" : "#6B7280",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              View Reports
            </button>
            <button
              onClick={() => setActiveTab("create")}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "create" ? "2px solid #3B6FFF" : "2px solid transparent",
                color: activeTab === "create" ? "#3B6FFF" : "#6B7280",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              Create Report
            </button>
          </div>
        </div>
      </div>

      {activeTab === "view" ? <SavedReportsView /> : <ReportBuilder />}
    </div>
  );
}
