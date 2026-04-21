import { useState, useRef } from "react";
import PermissionGuard from "../components/PermissionGuard";

const CLASSIFICATION_OPTIONS = [
  { value: "public", label: "Public", color: "#16a34a", bg: "#dcfce7" },
  { value: "interne", label: "Internal", color: "#2563eb", bg: "#dbeafe" },
  { value: "confidentiel", label: "Confidential", color: "#d97706", bg: "#fef3c7" },
  { value: "secret", label: "Secret", color: "#dc2626", bg: "#fee2e2" },
  { value: "tres_secret", label: "Top Secret", color: "#7c3aed", bg: "#ede9fe" },
];
const THEME = {
  colors: {
    primary: "#6366F1",
    primaryDark: "#4F46E5",
    primaryLight: "#818CF8",
    primaryBg: "#EEF2FF",
    textDark: "#0F172A",
    textGray: "#64748B",
    textLight: "#94A3B8",
    white: "#fff",
    background: "#F8FAFC",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEF2F2",
    info: "#3B82F6",
    infoLight: "#EFF6FF",
  },
  gradients: {
    button: "linear-gradient(135deg, #6366F1, #4F46E5)",
    cardHover: "linear-gradient(135deg, rgba(99,102,241,0.02), rgba(139,92,246,0.02))",
  },
  shadows: {
    card: "0 2px 12px rgba(0,0,0,0.04)",
    cardHover: "0 8px 24px rgba(0,0,0,0.08)",
    modal: "0 32px 80px rgba(0,0,0,0.18)",
    button: "0 4px 16px rgba(99,102,241,0.3)",
  },
  animation: {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    staggerContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
  },
};


const REPORT_TYPES = [
  "Compliance Audit",
  "Risk Analysis",
  "Incident Report",
  "Controls Assessment",
  "Policy Review",
  "Vulnerability Report",
];

const MOCK_REPORTS = [
  
];

const STATUS_STYLE = {
  finalized: { color: "#16a34a", bg: "#dcfce7" },
  "in review": { color: "#d97706", bg: "#fef3c7" },
  draft: { color: "#6b7280", bg: "#f3f4f6" },
};

const classificationOf = (val) =>
  CLASSIFICATION_OPTIONS.find((c) => c.value === val) || CLASSIFICATION_OPTIONS[0];

export default function Reporting() {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [showModal, setShowModal] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "",
    classification: "interne",
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("tous");
  const [sortBy, setSortBy] = useState("date");
  const [detailReport, setDetailReport] = useState(null);
  const fileRef = useRef();

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file) setTemplateFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setTemplateDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) setTemplateFile(file);
  };

  const handleGenerate = () => {
    if (!form.name || !form.type || !templateFile) return;
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2200);
  };

  const handleCreate = () => {
    const cls = classificationOf(form.classification);
    const newReport = {
      id: Date.now(),
      name: form.name,
      type: form.type,
      classification: form.classification,
      template: templateFile?.name || "—",
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: "Yassoura A.",
      status: "draft",
      size: `${(Math.random() * 3 + 0.4).toFixed(1)} MB`,
    };
    setReports([newReport, ...reports]);
    setShowModal(false);
    setTemplateFile(null);
    setForm({ name: "", type: "", classification: "interne" });
    setGenerated(false);
  };

  const filteredReports = reports
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q)
      );
    })
    .filter((r) => filterClass === "tous" || r.classification === filterClass)
    .sort((a, b) => {
      if (sortBy === "date") return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === "nom") return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif", padding: "32px 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            
            <h1 style={{ fontSize: "25px", fontWeight: "900", color: THEME.colors.textDark, margin: 0 }}>
              Reports
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Generate and manage your GRC reports from your own templates.
          </p>
        </div>
      <PermissionGuard permission="generate_reports">
        <button
          onClick={() => { setShowModal(true); setGenerated(false); setTemplateFile(null); setForm({ name: "", type: "", classification: "interne" }); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(135deg, #3B6FFF 0%, #6D28D9 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 14px rgba(59,111,255,0.25)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New report
        </button>
      </PermissionGuard>
      </div>

      {/* Filters bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search for a report..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", background: "#fff", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
          />
        </div>

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={{ height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", background: "#fff", padding: "0 12px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}
        >
          <option value="tous">All classifications</option>
          {CLASSIFICATION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", background: "#fff", padding: "0 12px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}
        >
          <option value="date">Sort by date</option>
          <option value="nom">Sort by name</option>
        </select>
      </div>

      {/* Reports grid */}
      {filteredReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p style={{ fontSize: 15, margin: 0 }}>No reports found.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filteredReports.map((report) => {
            const cls = classificationOf(report.classification);
            const st = STATUS_STYLE[report.status] || STATUS_STYLE["draft"];
            return (
              <div
                key={report.id}
                onClick={() => setDetailReport(report)}
                style={{ background: "#fff", border: "1.5px solid #e8eef8", borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "box-shadow 0.18s, border-color 0.18s", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(59,111,255,0.10)"; e.currentTarget.style.borderColor = "#b3c6ff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e8eef8"; }}
              >
                {/* Classification accent */}
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: cls.color, borderRadius: "14px 0 0 14px" }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, paddingLeft: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {report.name}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>{report.type}</p>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: cls.bg, color: cls.color, letterSpacing: "0.3px" }}>
                    {cls.label}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, paddingLeft: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: st.bg, color: st.color }}>{report.status}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{report.createdAt}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); alert(`Downloading "${report.name}"`); }}
                      style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B6FFF" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReports(reports.filter((r) => r.id !== report.id)); }}
                      style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>

                <div style={{ paddingLeft: 8, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{report.template} · {report.size}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New report modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>

            {/* Modal header */}
            <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Fraunces', serif" }}>New report</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>Import your template then configure the report.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: "24px 28px" }}>

              {/* Step 1 – Import template */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: templateFile ? "#dcfce7" : "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {templateFile
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>1</span>
                    }
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Import template</span>
                </div>

                <label
  style={{
    border: `2px dashed ${templateDrag ? "#3B6FFF" : templateFile ? "#16a34a" : "#cbd5e1"}`,
    borderRadius: 12,
    padding: "28px 20px",
    textAlign: "center",
    cursor: "pointer",
    background: templateDrag ? "#f0f4ff" : templateFile ? "#f0fdf4" : "#fafafa",
    transition: "all 0.2s",
    display: "block"
  }}
  onDragOver={(e) => { e.preventDefault(); setTemplateDrag(true); }}
  onDragLeave={() => setTemplateDrag(false)}
  onDrop={handleDrop}
>
  <input
    type="file"
    hidden
    accept=".docx,.pdf,.xlsx,.doc"
    onChange={(e) => handleFileSelect(e.target.files[0])}
  />

  {templateFile ? (
    <div>
      <p style={{ margin: 0 }}>{templateFile.name}</p>
      <p style={{ fontSize: 11 }}>
        {(templateFile.size / 1024).toFixed(0)} KB
      </p>
    </div>
  ) : (
    <div>
      <p>Drag your template here</p>
      <p style={{ fontSize: 11 }}>
        or click to browse your files
      </p>
    </div>
  )}
</label>
              </div>

              {/* Step 2 – Report info */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: !templateFile ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: !templateFile ? "#94a3b8" : "#fff", fontSize: 11, fontWeight: 700 }}>2</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: !templateFile ? "#94a3b8" : "#0f172a" }}>Report information</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: !templateFile ? 0.45 : 1, pointerEvents: !templateFile ? "none" : "auto" }}>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Report name *</label>
                    <input
                      type="text"
                      placeholder="e.g., ISO 27001 Audit – Q2 2025"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0 14px", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Report type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      style={{ width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0 14px", fontSize: 13, color: form.type ? "#0f172a" : "#94a3b8", background: "#fff", outline: "none", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
                    >
                      <option value="" disabled>Select a type...</option>
                      {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>Classification *</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {CLASSIFICATION_OPTIONS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setForm({ ...form, classification: c.value })}
                          style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${form.classification === c.value ? c.color : "#e2e8f0"}`, background: form.classification === c.value ? c.bg : "#fff", color: form.classification === c.value ? c.color : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 – Generation */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: generated ? "#dcfce7" : (!templateFile || !form.name || !form.type) ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {generated
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ color: (!templateFile || !form.name || !form.type) ? "#94a3b8" : "#fff", fontSize: 11, fontWeight: 700 }}>3</span>
                    }
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: (!templateFile || !form.name || !form.type) ? "#94a3b8" : "#0f172a" }}>Generate report</span>
                </div>

                {!generated ? (
                
                  <button
                    onClick={handleGenerate}
                    disabled={!templateFile || !form.name || !form.type || generating}
                    style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: (!templateFile || !form.name || !form.type) ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF 0%,#6D28D9 100%)", color: (!templateFile || !form.name || !form.type) ? "#94a3b8" : "#fff", fontSize: 14, fontWeight: 600, cursor: (!templateFile || !form.name || !form.type) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s" }}
                  >
                    {generating ? (
                      <>
                        <div style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        Generate report
                      </>
                    )}
                  </button>
                  
                ) : (
                  <div style={{ border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "16px 18px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#15803d" }}>Report generated successfully</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#16a34a" }}>Ready to be added to the library</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCreate}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Report detail modal ── */}
      {detailReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
            {(() => {
              const cls = classificationOf(detailReport.classification);
              const st = STATUS_STYLE[detailReport.status] || STATUS_STYLE["draft"];
              return (
                <>
                  <div style={{ padding: "22px 26px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: cls.bg, color: cls.color }}>{cls.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: st.bg, color: st.color }}>{detailReport.status}</span>
                      </div>
                      <h2 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Fraunces', serif" }}>{detailReport.name}</h2>
                    </div>
                    <button onClick={() => setDetailReport(null)} style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div style={{ padding: "18px 26px 24px" }}>
                    {[
                      ["Type", detailReport.type],
                      ["Template", detailReport.template],
                      ["Size", detailReport.size],
                      ["Created by", detailReport.createdBy],
                      ["Creation date", detailReport.createdAt],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f8faff" }}>
                        <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                      <button style={{ flex: 1, height: 40, borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8faff", color: "#3B6FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download
                      </button>
                      <button style={{ flex: 1, height: 40, borderRadius: 9, border: "none", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        Open
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,0.1); }
      `}</style>
    </div>
  );
}