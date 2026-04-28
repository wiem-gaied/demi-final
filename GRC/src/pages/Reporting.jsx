// src/pages/Reporting.jsx
//
// Garde TOUT le formulaire "New report" existant (template + name + type + classification + generate).
// Ajoute en plus :
//   1. Une liste des analyses finalisées (depuis /api/analyses)
//   2. Une vue détaillée riche (policies, items, gaps, mitigations, risks)
//   3. Un bouton "Generate Report" sur chaque analyse qui réutilise le même formulaire
//
// Style : conserve VOS classes, vos couleurs et la même structure visuelle.

import { useState, useRef, useEffect } from "react";
import PermissionGuard from "../components/PermissionGuard";

const API_BASE = "http://localhost:3000/api/analyses";

const CLASSIFICATION_OPTIONS = [
  { value: "public",        label: "Public",        color: "#16a34a", bg: "#dcfce7" },
  { value: "interne",       label: "Internal",      color: "#2563eb", bg: "#dbeafe" },
  { value: "confidentiel",  label: "Confidential",  color: "#d97706", bg: "#fef3c7" },
  { value: "secret",        label: "Secret",        color: "#dc2626", bg: "#fee2e2" },
  { value: "tres_secret",   label: "Top Secret",    color: "#7c3aed", bg: "#ede9fe" },
];

const REPORT_TYPES = [
  "Compliance Audit", "Risk Analysis", "Incident Report",
  "Controls Assessment", "Policy Review", "Vulnerability Report",
];

const STATUS_PILL = {
  Covered:        { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
  Partial:        { color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  "Not covered":  { color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};
const classificationOf = (val) =>
  CLASSIFICATION_OPTIONS.find(c => c.value === val) || CLASSIFICATION_OPTIONS[1];

export default function Reporting() {
  // tab: "analyses" or "reports"
  const [tab, setTab] = useState("analyses");

  // ── ANALYSES ──
  const [analyses, setAnalyses]       = useState([]);
  const [loadingAna, setLoadingAna]   = useState(true);
  const [searchAna, setSearchAna]     = useState("");
  const [detailAnalysis, setDetailAnalysis] = useState(null);
  const [analysisFull, setAnalysisFull]     = useState(null);

  // ── REPORTS (legacy form) ──
  const [reports, setReports]         = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [linkedAnalysis, setLinkedAnalysis] = useState(null); // pre-fill when launched from an analysis
  const [templateFile, setTemplateFile] = useState(null);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Compliance Audit", classification: "interne" });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(false);
  const [search, setSearch]         = useState("");
  const [filterClass, setFilterClass] = useState("tous");
  const [sortBy, setSortBy]         = useState("date");
  const [detailReport, setDetailReport] = useState(null);
  const fileRef = useRef();

  // load analyses on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API_BASE);
        const d = await r.json();
        setAnalyses(Array.isArray(d) ? d : []);
      } catch { setAnalyses([]); }
      finally { setLoadingAna(false); }
    })();
  }, []);

  // when user clicks "View" on an analysis → fetch full detail
  const openAnalysis = async (a) => {
    setDetailAnalysis(a);
    setAnalysisFull(null);
    try {
      const r = await fetch(`${API_BASE}/${a.id}`);
      const d = await r.json();
      setAnalysisFull(d);
    } catch (e) { alert("Failed to load analysis: " + e.message); }
  };

  // Open the "Generate Report" form linked to a specific analysis
  const generateFromAnalysis = (a) => {
    setLinkedAnalysis(a);
    setForm({
      name: `${a.title} - Compliance Report`,
      type: "Compliance Audit",
      classification: "interne",
    });
    setTemplateFile(null);
    setGenerated(false);
    setShowModal(true);
  };

  const handleFileSelect = (file) => { if (file) setTemplateFile(file); };
  const handleDrop = (e) => { e.preventDefault(); setTemplateDrag(false); const f = e.dataTransfer.files[0]; if (f) setTemplateFile(f); };
  const handleGenerate = () => {
    if (!form.name || !form.type || !templateFile) return;
    setGenerating(true); setGenerated(false);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
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
      createdBy: linkedAnalysis?.created_by_name || "CISO",
      analysis_id: linkedAnalysis?.id || null,
      status: "draft",
      size: `${(Math.random() * 3 + 0.4).toFixed(1)} MB`,
    };
    setReports([newReport, ...reports]);
    setShowModal(false);
    setLinkedAnalysis(null);
    setTemplateFile(null);
    setForm({ name: "", type: "Compliance Audit", classification: "interne" });
    setGenerated(false);
  };

  // filter/sort
  const filteredReports = reports
    .filter(r => {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    })
    .filter(r => filterClass === "tous" || r.classification === filterClass)
    .sort((a, b) => sortBy === "date" ? b.createdAt.localeCompare(a.createdAt) : a.name.localeCompare(b.name));

  const filteredAnalyses = analyses.filter(a => {
    const q = searchAna.toLowerCase();
    return (a.title || "").toLowerCase().includes(q) ||
           (a.created_by_name || "").toLowerCase().includes(q) ||
           (a.standard_name || "").toLowerCase().includes(q);
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif", padding: "32px 40px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 900, color: "#0F172A", margin: 0, fontFamily: "'Fraunces',serif" }}>Reports & Analyses</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
            View finalized compliance analyses and generate reports from your templates.
          </p>
        </div>
        <PermissionGuard permission="generate_reports">
          <button onClick={() => { setLinkedAnalysis(null); setShowModal(true); setGenerated(false); setTemplateFile(null); setForm({ name: "", type: "Compliance Audit", classification: "interne" }); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                     background: "linear-gradient(135deg,#3B6FFF 0%,#6D28D9 100%)",
                     color: "#fff", border: "none", borderRadius: 10,
                     fontSize: 14, fontWeight: 600, cursor: "pointer",
                     boxShadow: "0 4px 14px rgba(59,111,255,0.25)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New report
          </button>
        </PermissionGuard>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {[
          { k: "analyses", l: `Analyses (${analyses.length})` },
          { k: "reports",  l: `Reports (${reports.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: "10px 18px", border: "none", background: "transparent",
                     color: tab === t.k ? "#3B6FFF" : "#64748B",
                     fontSize: 13, fontWeight: 700, cursor: "pointer",
                     borderBottom: `2px solid ${tab === t.k ? "#3B6FFF" : "transparent"}`,
                     marginBottom: -2, fontFamily: "'DM Sans',sans-serif" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ───────────── TAB: ANALYSES ───────────── */}
      {tab === "analyses" && (
        <>
          <div style={{ position: "relative", marginBottom: 18, maxWidth: 380 }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search analyses..." value={searchAna} onChange={e => setSearchAna(e.target.value)}
              style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 38,
                       border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13,
                       background: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {loadingAna ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading…</div>
          ) : filteredAnalyses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <p style={{ fontSize: 15 }}>No analyses found. Run one from the GRC Compliance page.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
              {filteredAnalyses.map(a => (
                <AnalysisCard key={a.id} analysis={a} onOpen={() => openAnalysis(a)} onGenerate={() => generateFromAnalysis(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ───────────── TAB: REPORTS (existing list — unchanged style) ───────────── */}
      {tab === "reports" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search for a report..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              style={{ height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", padding: "0 12px", cursor: "pointer", outline: "none" }}>
              <option value="tous">All classifications</option>
              {CLASSIFICATION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ height: 38, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff", padding: "0 12px", cursor: "pointer", outline: "none" }}>
              <option value="date">Sort by date</option>
              <option value="nom">Sort by name</option>
            </select>
          </div>

          {filteredReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
              <p style={{ fontSize: 15 }}>No reports yet. Click "New report" or generate one from an analysis.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
              {filteredReports.map(r => {
                const cls = classificationOf(r.classification);
                return (
                  <div key={r.id}
                    onClick={() => setDetailReport(r)}
                    style={{ background: "#fff", border: "1.5px solid #e8eef8", borderRadius: 14,
                             padding: "20px 22px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: cls.color }} />
                    <div style={{ paddingLeft: 8 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{r.name}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>{r.type}</p>
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: cls.bg, color: cls.color }}>{cls.label}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.createdAt}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ───────────── DETAIL MODAL — Analysis ───────────── */}
      {detailAnalysis && (
        <AnalysisDetailModal
          analysis={detailAnalysis}
          full={analysisFull}
          onClose={() => { setDetailAnalysis(null); setAnalysisFull(null); }}
          onGenerate={() => { generateFromAnalysis(detailAnalysis); setDetailAnalysis(null); }}
        />
      )}

      {/* ───────────── New Report MODAL (legacy, kept identical) ───────────── */}
      {showModal && (
        <NewReportModal
          form={form} setForm={setForm}
          templateFile={templateFile} setTemplateFile={setTemplateFile}
          templateDrag={templateDrag} setTemplateDrag={setTemplateDrag}
          generating={generating} generated={generated}
          handleFileSelect={handleFileSelect} handleDrop={handleDrop}
          handleGenerate={handleGenerate} handleCreate={handleCreate}
          linkedAnalysis={linkedAnalysis}
          onClose={() => { setShowModal(false); setLinkedAnalysis(null); }}
        />
      )}
    </div>
  );
}

// ─── Analysis Card ──────────────────────────────────────────────────────────
function AnalysisCard({ analysis, onOpen, onGenerate }) {
  const score = analysis.global_score || 0;
  const scoreColor = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";
  const dt = analysis.created_at ? new Date(analysis.created_at).toLocaleDateString("en-GB") : "";

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef8", borderRadius: 14,
                  padding: "18px 20px", position: "relative", overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: scoreColor }} />

      <div style={{ paddingLeft: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
          {analysis.title}
        </p>
        <p style={{ margin: "3px 0 8px", fontSize: 12, color: "#94a3b8" }}>
          {analysis.standard_name || "—"} · {analysis.document_name || "no doc"}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor, fontFamily: "'Fraunces',serif" }}>{score}%</span>
          <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${score}%`, height: "100%", background: scoreColor, borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#dcfce7", color: "#16a34a", fontWeight: 600 }}>✓ {analysis.covered_count} covered</span>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#fef3c7", color: "#d97706", fontWeight: 600 }}>~ {analysis.partial_count} partial</span>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#fee2e2", color: "#dc2626", fontWeight: 600 }}>✕ {analysis.not_covered_count} not</span>
        </div>

        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            By <strong style={{ color: "#475569" }}>{analysis.created_by_name || "—"}</strong> · {dt}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onOpen}
              style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0",
                       background: "#f8faff", color: "#3B6FFF", fontSize: 11, fontWeight: 700,
                       cursor: "pointer" }}>
              View
            </button>
            <button onClick={onGenerate}
              style={{ padding: "6px 12px", borderRadius: 7, border: "none",
                       background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff",
                       fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analysis Detail Modal ──────────────────────────────────────────────────
function AnalysisDetailModal({ analysis, full, onClose, onGenerate }) {
  const score = analysis.global_score || 0;
  const scoreColor = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
               display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 900,
                 maxHeight: "90vh", overflowY: "auto",
                 boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid #f1f5f9",
                      display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>
              {analysis.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {analysis.standard_name} · By {analysis.created_by_name} · {new Date(analysis.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
                     background: "#f8faff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
        </div>

        {/* KPIs */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <KPI label="Global Score" value={`${score}%`}     color={scoreColor} />
          <KPI label="Covered"      value={analysis.covered_count}     color="#16A34A" />
          <KPI label="Partial"      value={analysis.partial_count}     color="#D97706" />
          <KPI label="Not covered"  value={analysis.not_covered_count} color="#DC2626" />
        </div>

        {/* Body */}
        <div style={{ padding: "22px 28px" }}>
          {!full ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading details…</div>
          ) : (
            <>
              {full.policies.map(p => (
                <PolicyDetailBlock key={p.id} policy={p} />
              ))}

              {(full.asset_risks?.length > 0 || full.business_risks?.length > 0) && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12, fontFamily: "'Fraunces',serif" }}>
                    Generated Risks ({(full.asset_risks?.length || 0) + (full.business_risks?.length || 0)})
                  </h3>
                  {(full.asset_risks || []).map(r => (
                    <RiskRow key={`a${r.id}`} risk={r} kind="asset" />
                  ))}
                  {(full.business_risks || []).map(r => (
                    <RiskRow key={`b${r.id}`} risk={r} kind="business" />
                  ))}
                </div>
              )}
            </>
          )}

          <button onClick={onGenerate}
            style={{ marginTop: 24, width: "100%", padding: 12, borderRadius: 10, border: "none",
                     background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff",
                     fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📄 Generate Report from this Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div style={{ background: "#F8FAFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Fraunces',serif", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function PolicyDetailBlock({ policy }) {
  const meta = STATUS_PILL[policy.status] || STATUS_PILL["Not covered"];
  return (
    <div style={{ marginBottom: 18, border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: meta.bg, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", fontFamily: "'Fraunces',serif" }}>{policy.policy_name}</div>
          {policy.policy_summary && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{policy.policy_summary}</div>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{policy.policy_score}%</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {policy.gaps?.length > 0 && (
          <DetailSection title="Gaps" color="#D97706" bg="#FFFBEB">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {policy.gaps.map(g => <li key={g.id} style={{ fontSize: 12, marginBottom: 3 }}>{g.description}</li>)}
            </ul>
          </DetailSection>
        )}
        {policy.remediations?.length > 0 && (
          <DetailSection title="Mitigation Plan" color="#16A34A" bg="#F0FDF4">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {policy.remediations.map(r => (
                <li key={r.id} style={{ fontSize: 12, marginBottom: 3 }}>
                  {r.action} <span style={{ color: "#94a3b8", fontSize: 10 }}>· {r.priority}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}
        {policy.items?.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569" }}>
              {policy.items.length} item-level results
            </summary>
            <div style={{ marginTop: 8 }}>
              {policy.items.map(it => {
                const m = STATUS_PILL[it.ciso_status || it.ai_status] || STATUS_PILL["Not covered"];
                return (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px",
                                            border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 4, background: "#fff" }}>
                    <span style={{ fontSize: 12, color: "#0F172A" }}>{m.icon} {it.ref_id} · {it.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{it.score}%</span>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, color, bg, children }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: "10px 12px", marginBottom: 8, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 5 }}>{title}</div>
      <div style={{ color: "#475569" }}>{children}</div>
    </div>
  );
}

function RiskRow({ risk, kind }) {
  const title = risk.intitule || risk.title;
  const I = risk.impact || 0;
  const P = risk.probabilite || risk.probability || 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 6, background: "#fff" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{title}</div>
        {risk.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{risk.description.slice(0, 120)}{risk.description.length > 120 && "…"}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: kind === "business" ? "#F5F3FF" : "#EEF4FF", color: kind === "business" ? "#6D28D9" : "#3B6FFF", fontWeight: 700 }}>
          {kind === "business" ? "Business" : "Asset"}
        </span>
        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>I:{I}/P:{P}</span>
      </div>
    </div>
  );
}

// ─── New Report Modal (kept) ────────────────────────────────────────────────
function NewReportModal({
  form, setForm, templateFile, setTemplateFile, templateDrag, setTemplateDrag,
  generating, generated, handleFileSelect, handleDrop, handleGenerate, handleCreate,
  linkedAnalysis, onClose,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>
              {linkedAnalysis ? "Generate Report from Analysis" : "New report"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {linkedAnalysis ? `Linked to: ${linkedAnalysis.title}` : "Import your template then configure the report."}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", color: "#64748b", fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {/* Step 1 - Template */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: templateFile ? "#dcfce7" : "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {templateFile
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>1</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Import template</span>
            </div>
            <label style={{
              border: `2px dashed ${templateDrag ? "#3B6FFF" : templateFile ? "#16a34a" : "#cbd5e1"}`,
              borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer",
              background: templateDrag ? "#f0f4ff" : templateFile ? "#f0fdf4" : "#fafafa", display: "block"
            }}
              onDragOver={e => { e.preventDefault(); setTemplateDrag(true); }}
              onDragLeave={() => setTemplateDrag(false)} onDrop={handleDrop}>
              <input type="file" hidden accept=".docx,.pdf,.xlsx,.doc"
                onChange={e => handleFileSelect(e.target.files[0])} />
              {templateFile ? (
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{templateFile.name}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>{(templateFile.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>Drag your template here</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>or click to browse · DOCX, PDF, XLSX</p>
                </div>
              )}
            </label>
          </div>

          {/* Step 2 - Info */}
          <div style={{ marginBottom: 24, opacity: !templateFile ? 0.45 : 1, pointerEvents: !templateFile ? "none" : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>2</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Report information</span>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Report name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., ISO 27001 Audit – Q2 2026"
              style={{ width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0 14px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Report type *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              style={{ width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0 14px", fontSize: 13, background: "#fff", outline: "none", cursor: "pointer", marginBottom: 14 }}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>Classification *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CLASSIFICATION_OPTIONS.map(c => (
                <button key={c.value} onClick={() => setForm({ ...form, classification: c.value })}
                  style={{ padding: "6px 14px", borderRadius: 8,
                           border: `2px solid ${form.classification === c.value ? c.color : "#e2e8f0"}`,
                           background: form.classification === c.value ? c.bg : "#fff",
                           color: form.classification === c.value ? c.color : "#64748b",
                           fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 - Generate */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: generated ? "#dcfce7" : (!templateFile || !form.name) ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {generated
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ color: (!templateFile || !form.name) ? "#94a3b8" : "#fff", fontSize: 11, fontWeight: 700 }}>3</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Generate report</span>
            </div>
            {!generated ? (
              <button onClick={handleGenerate} disabled={!templateFile || !form.name || generating}
                style={{ width: "100%", height: 44, borderRadius: 10, border: "none",
                         background: (!templateFile || !form.name) ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF,#6D28D9)",
                         color: (!templateFile || !form.name) ? "#94a3b8" : "#fff",
                         fontSize: 14, fontWeight: 600,
                         cursor: (!templateFile || !form.name) ? "not-allowed" : "pointer",
                         display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {generating ? "Generating…" : "⚡ Generate report"}
              </button>
            ) : (
              <div style={{ border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "14px 18px", background: "#f0fdf4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#15803d" }}>✅ Report generated</p>
                <button onClick={handleCreate}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}