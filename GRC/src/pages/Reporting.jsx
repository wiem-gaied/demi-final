// src/pages/Reporting.jsx
//
// CHANGES vs previous version:
//  ✅ Removed the "Upload Template" step entirely
//  ✅ Reports are ALWAYS generated using the built-in ComplianceReport template
//  ✅ Report content is auto-filled from the selected analysis (policies, items,
//     risks, gaps, remediations, scores)
//  ✅ Added an "Executive Summary" textarea in the form (user writes it)
//  ✅ Added Organisation / Department fields (template requires them)
//  ✅ Generated report is shown in a modal with the existing Export PDF button

import { useState, useRef, useEffect } from "react";
import PermissionGuard from "../components/PermissionGuard";
import ComplianceReport from "../components/ComplianceReport"; // ← the template you provided

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

// ─── Mapper: analysis (full) → ComplianceReport `data` shape ──────────────
//
// The template expects:
//   organisation, department, date, version, classification,
//   auditor, frameworks, scope,
//   overallStatus ("compliant"|"partial"|"non-compliant"), overallStatusLabel,
//   executiveSummary,
//   domains[]: { name, ref, score, status, comment }
//   risks[]:   { title, severity ("critical"|"high"|"moderate") }
//   mitigations[]: { title, priority ("critical"|"high"|"moderate") }
//
function statusFromScore(score) {
  if (score >= 80) return { key: "compliant",     label: "Conforme" };
  if (score >= 50) return { key: "partial",       label: "Partiellement conforme" };
  return                  { key: "non-compliant", label: "Non conforme" };
}

function severityFromImpactProba(impact, proba) {
  const s = (impact || 1) * (proba || 1);
  if (s >= 12) return "critical";
  if (s >= 6)  return "high";
  return "moderate";
}

function priorityToSeverity(priority) {
  const p = String(priority || "").toLowerCase();
  if (p.includes("crit") || p === "high")    return p.includes("crit") ? "critical" : "high";
  if (p.includes("low"))                     return "moderate";
  return "moderate"; // "Medium" → moderate
}

function buildReportDataFromAnalysis({ analysis, full, formData }) {
  const score = analysis.global_score || 0;
  const overall = statusFromScore(score);

  // Domains: one block per analysis_policy
  const domains = (full?.policies || []).map(p => {
    const st = statusFromScore(p.policy_score || 0);
    // Build a comment: prefer policy_summary; otherwise enumerate items
    const itemSummary = (p.items || [])
      .filter(it => (it.ciso_status || it.ai_status) !== "Covered")
      .slice(0, 3)
      .map(it => `${it.ref_id || ""} ${it.title}`.trim())
      .filter(Boolean)
      .join(" · ");
    const fallback = itemSummary
      ? `Points d'attention : ${itemSummary}.`
      : "Tous les contrôles évalués sont alignés avec les exigences du référentiel.";
    return {
      name:    p.policy_name || "Policy",
      ref:     analysis.standard_name || "—",
      score:   p.policy_score || 0,
      status:  st.key,
      comment: p.policy_summary || fallback,
    };
  });

  // Risks: merge asset + business risks, dedupe on title
  const allRisks = [
    ...(full?.asset_risks    || []).map(r => ({ ...r, _kind: "asset" })),
    ...(full?.business_risks || []).map(r => ({ ...r, _kind: "business" })),
  ];
  const seenRiskTitles = new Set();
  const risks = [];
  for (const r of allRisks) {
    const title = (r.intitule || r.title || "").trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seenRiskTitles.has(key)) continue;
    seenRiskTitles.add(key);
    const I = r.impact ?? 0;
    const P = r.probabilite ?? r.probability ?? 0;
    risks.push({ title, severity: severityFromImpactProba(I, P) });
  }

  // Mitigations: flatten all policy remediations
  const mitigations = [];
  const seenMit = new Set();
  for (const p of (full?.policies || [])) {
    for (const r of (p.remediations || [])) {
      const action = (r.action || "").trim();
      if (!action) continue;
      const key = action.toLowerCase();
      if (seenMit.has(key)) continue;
      seenMit.add(key);
      mitigations.push({
        title:    action,
        priority: priorityToSeverity(r.priority),
      });
    }
  }
  // Fallback: if no remediations, derive lightweight ones from gaps
  if (mitigations.length === 0) {
    for (const p of (full?.policies || [])) {
      for (const g of (p.gaps || [])) {
        const txt = (g.description || "").trim();
        if (!txt) continue;
        mitigations.push({
          title:    `Combler le gap : ${txt}`,
          priority: "high",
        });
      }
    }
  }

  const cls = classificationOf(formData.classification);
  const dt = analysis.created_at
    ? new Date(analysis.created_at).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return {
    organisation:        formData.organisation || "—",
    department:          formData.department   || "—",
    date:                dt,
    version:             "v1.0",
    classification:      `Rapport ${cls.label.toLowerCase()}`,
    auditor:             analysis.created_by_name || "—",
    frameworks:          analysis.standard_name   || "—",
    scope:               formData.scope || analysis.document_name || "—",
    overallStatus:       overall.key,
    overallStatusLabel:  overall.label,
    executiveSummary:    formData.executiveSummary || "Synthèse non fournie.",
    domains,
    risks,
    mitigations,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function Reporting() {
  const [tab, setTab] = useState("analyses");
  const reportRef = useRef(null);

  // ── ANALYSES ──
  const [analyses, setAnalyses]       = useState([]);
  const [loadingAna, setLoadingAna]   = useState(true);
  const [searchAna, setSearchAna]     = useState("");
  const [detailAnalysis, setDetailAnalysis] = useState(null);
  const [analysisFull, setAnalysisFull]     = useState(null);

  // ── REPORTS ──
  const [reports, setReports]   = useState([]);
  const [search, setSearch]     = useState("");
  const [filterClass, setFilterClass] = useState("tous");
  const [sortBy, setSortBy]     = useState("date");
  const [detailReport, setDetailReport] = useState(null);

  // ── REPORT GENERATION FORM ──
  const [showModal, setShowModal] = useState(false);
  const [linkedAnalysis, setLinkedAnalysis] = useState(null);
  const [linkedFull, setLinkedFull]         = useState(null); // full detail (for filling)
  const [form, setForm] = useState({
    name:             "",
    type:             "Compliance Audit",
    classification:   "interne",
    organisation:     "",
    department:       "",
    scope:            "",
    executiveSummary: "",
  });
  const [generating, setGenerating]       = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null); // the data passed to ComplianceReport

  // ── Load analyses ──
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
 
  // ── View an analysis ──
  const openAnalysis = async (a) => {
    setDetailAnalysis(a);
    setAnalysisFull(null);
    try {
      const r = await fetch(`${API_BASE}/${a.id}`);
      const d = await r.json();
      setAnalysisFull(d);
    } catch (e) { alert("Failed to load analysis: " + e.message); }
  };
  // ── Open the generation form for a specific analysis ──
  const openGenerationForm = async (a) => {
    setLinkedAnalysis(a);
    setLinkedFull(null);
    setGeneratedReport(null);
    setForm({
      name:             `${a.title} - Compliance Report`,
      type:             "Compliance Audit",
      classification:   "interne",
      organisation:     "",
      department:       "",
      scope:            a.document_name || "",
      executiveSummary: "",
    });
    setShowModal(true);
    // pre-fetch full detail so generation is instant
    try {
      const r = await fetch(`${API_BASE}/${a.id}`);
      const d = await r.json();
      setLinkedFull(d);
    } catch (e) {
      console.error("Failed to load analysis detail:", e);
    }
  };

  // ── Generate report ──
  const handleGenerate = () => {
    if (!linkedAnalysis || !linkedFull) {
      alert("Analysis details are still loading. Please wait a moment and try again.");
      return;
    }
    if (!form.name.trim() || !form.executiveSummary.trim()) return;

    setGenerating(true);
    // small artificial delay so the user sees the spinner
    setTimeout(() => {
      const data = buildReportDataFromAnalysis({
        analysis: linkedAnalysis,
        full:     linkedFull,
        formData: form,
      });
      setGeneratedReport(data);
      setGenerating(false);
    }, 400);
  };

  // ── Save the generated report to the local list ──
  const handleSaveReport = () => {
    if (!generatedReport) return;
    const cls = classificationOf(form.classification);
    const newReport = {
      id:             Date.now(),
      name:           form.name,
      type:           form.type,
      classification: form.classification,
      template:       "Built-in Compliance Template",
      createdAt:      new Date().toISOString().slice(0, 10),
      createdBy:      linkedAnalysis?.created_by_name || "CISO",
      analysis_id:    linkedAnalysis?.id || null,
      data:           generatedReport,    // ← keeps the full report data so we can re-display it
      status:         "draft",
      size:           "—",
    };
    setReports([newReport, ...reports]);
    closeGenerationModal();
  };

  const closeGenerationModal = () => {
    setShowModal(false);
    setLinkedAnalysis(null);
    setLinkedFull(null);
    setGeneratedReport(null);
    setForm({
      name: "", type: "Compliance Audit", classification: "interne",
      organisation: "", department: "", scope: "", executiveSummary: "",
    });
  };

  // ── Filters ──
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
        input:focus, select:focus, textarea:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,0.1); outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 900, color: "#0F172A", margin: 0, fontFamily: "'Fraunces',serif" }}>Reports & Analyses</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
            View finalized compliance analyses and generate reports — auto-filled from your analysis data.
          </p>
        </div>
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

      {/* TAB: ANALYSES */}
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
                <AnalysisCard key={a.id} analysis={a}
                  onOpen={() => openAnalysis(a)}
                  onGenerate={() => openGenerationForm(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: REPORTS */}
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
              <p style={{ fontSize: 15 }}>No reports yet. Open an analysis and click "Generate Report".</p>
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

      {/* DETAIL MODAL — Analysis */}
      {detailAnalysis && (
        <AnalysisDetailModal
          analysis={detailAnalysis}
          full={analysisFull}
          onClose={() => { setDetailAnalysis(null); setAnalysisFull(null); }}
          onGenerate={() => { openGenerationForm(detailAnalysis); setDetailAnalysis(null); }}
        />
      )}

      {/* GENERATION FORM MODAL */}
      {showModal && (
        <GenerationFormModal
          form={form} setForm={setForm}
          linkedAnalysis={linkedAnalysis}
          linkedFull={linkedFull}
          generating={generating}
          generatedReport={generatedReport}
          onGenerate={handleGenerate}
          onSave={handleSaveReport}
          onClose={closeGenerationModal}
        />
      )}

      {/* SAVED REPORT MODAL */}
      {detailReport && (
        <SavedReportModal report={detailReport} onClose={() => setDetailReport(null)} />
      )}
    </div>
  );
}

// ─── Analysis Card ─────────────────────────────────────────────────────────
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

// ─── Analysis Detail Modal ─────────────────────────────────────────────────
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

        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <KPI label="Global Score" value={`${score}%`} color={scoreColor} />
          <KPI label="Covered"      value={analysis.covered_count}     color="#16A34A" />
          <KPI label="Partial"      value={analysis.partial_count}     color="#D97706" />
          <KPI label="Not covered"  value={analysis.not_covered_count} color="#DC2626" />
        </div>

        <div style={{ padding: "22px 28px" }}>
          {!full ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading details…</div>
          ) : (
            <>
              {full.policies.map(p => <PolicyDetailBlock key={p.id} policy={p} />)}

              {(full.asset_risks?.length > 0 || full.business_risks?.length > 0) && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12, fontFamily: "'Fraunces',serif" }}>
                    Generated Risks ({(full.asset_risks?.length || 0) + (full.business_risks?.length || 0)})
                  </h3>
                  {(full.asset_risks    || []).map(r => <RiskRow key={`a${r.id}`} risk={r} kind="asset" />)}
                  {(full.business_risks || []).map(r => <RiskRow key={`b${r.id}`} risk={r} kind="business" />)}
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

// ─── Generation Form Modal ─────────────────────────────────────────────────
function GenerationFormModal({
  form, setForm, linkedAnalysis, linkedFull,
  generating, generatedReport, onGenerate, onSave, onClose,
}) {
  const reportRef = useRef(null);
  const formValid = form.name.trim() && form.executiveSummary.trim()
                 && form.organisation.trim() && form.department.trim();

  // ── If a report has been generated, show it full-width inside the modal ──
  if (generatedReport) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980,
                      maxHeight: "92vh", overflow: "hidden",
                      boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
                      display: "flex", flexDirection: "column" }}>
          {/* Sticky header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        flexShrink: 0, background: "#F8FAFF" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a",
                           fontFamily: "'Fraunces',serif" }}>
                ✅ Report generated — Preview
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                {form.name} · Use the Export PDF button below to print/save.
              </p>
            </div>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
                       background: "#fff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
          </div>

          {/* Scrollable body */}
          <div
  ref={reportRef}
  style={{
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
    background: "#fff"
  }}
>
  <ComplianceReport data={generatedReport} />
</div>

          {/* Sticky footer */}
          <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        flexShrink: 0, background: "#F8FAFF" }}>
            <button onClick={onClose}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0",
                       background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600,
                       cursor: "pointer" }}>
              Discard
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button
    onClick={() => {
      const element = reportRef.current;

      // récupérer le HTML complet
      const content = element.outerHTML;

      // créer un vrai document HTML
      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Compliance Report</title>

          <!-- 🔥 IMPORTANT: styles -->
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap" rel="stylesheet">

          <style>
            body {
              font-family: 'DM Sans', sans-serif;
              background: #ffffff;
              padding: 40px;
            }
          </style>
        </head>

        <body>
          ${content}
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "compliance-report.html";
      a.click();

      URL.revokeObjectURL(url);
    }}
    style={{
      padding: "9px 18px",
      borderRadius: 8,
      border: "none",
      background: "#0c0a63",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer"
    }}
  >
    Export HTML
  </button>

  
  <button
    onClick={async () => {
  const element = reportRef.current;

  // ✅ 1. FIX SCROLL POUR PDF
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;

  element.style.overflow = "visible";
  element.style.height = "auto";

  const html2pdf = (await import("html2pdf.js")).default;

  await html2pdf()
    .from(element)
    .set({
      margin: [10, 10, 10, 10],
      filename: "compliance-report.pdf",

      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },

      // 🔥 LA CLÉ DU PROBLÈME
      pagebreak: {
        mode: ["css", "avoid-all", "legacy"]
      }
    })
    .save();

  // ✅ 2. RESTORE UI
  element.style.overflow = originalOverflow;
  element.style.height = originalHeight;
}}
    style={{
      padding: "9px 18px",
      borderRadius: 8,
      border: "none",
      background: "#0b256d",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer"
    }}
  >
     Export PDF
  </button>

  <button onClick={onSave}
    style={{
      padding: "9px 22px",
      borderRadius: 8,
      border: "none",
      background: "#142f5f",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer"
    }}>
     Save Report
  </button>

</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Otherwise: show the form ─────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 620,
                    maxHeight: "92vh", overflowY: "auto",
                    boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid #f1f5f9",
                      display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a",
                         fontFamily: "'Fraunces',serif" }}>
              Generate Report
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {linkedAnalysis
                ? <>Linked to: <strong>{linkedAnalysis.title}</strong></>
                : "Configure the report content below."}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8,
                                              border: "1px solid #e2e8f0", background: "#f8faff",
                                              cursor: "pointer", color: "#64748b", fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: "22px 28px" }}>

          
          

          {/* Section: Metadata */}
          <SectionLabel n={1}>Report metadata</SectionLabel>
          <FormField label="Report title *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., ISO 27001 Audit – Q2 2026"
              style={inputStyle} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Organisation *">
              <input value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })}
                placeholder="e.g., Acme Corporation"
                style={inputStyle} />
            </FormField>
            <FormField label="Department *">
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                placeholder="e.g., Direction SSI"
                style={inputStyle} />
            </FormField>
          </div>

          <FormField label="Scope (optional)" hint="Defaults to the analyzed document name.">
            <input value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
              placeholder="e.g., Global IT perimeter"
              style={inputStyle} />
          </FormField>

          <FormField label="Report type">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>

          <FormField label="Classification">
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
          </FormField>

          {/* Section: Executive Summary */}
          <SectionLabel n={2}>Executive summary</SectionLabel>
          <FormField label="Executive Summary *"
                     hint="Your high-level narrative: context, key findings, top recommendations.">
            <textarea value={form.executiveSummary}
              onChange={e => setForm({ ...form, executiveSummary: e.target.value })}
              placeholder="L'audit conduit en avril 2026 couvre… Le niveau de conformité global s'établit à… Trois non-conformités critiques requièrent un plan de remédiation immédiat."
              style={{ ...inputStyle, minHeight: 140, padding: "10px 14px",
                       resize: "vertical", lineHeight: 1.55 }} />
          </FormField>

          {/* Status indicator */}
          

          {/* Generate button */}
          <button onClick={onGenerate}
            disabled={!formValid || generating || !linkedFull}
            style={{ width: "100%", marginTop: 22, height: 46, borderRadius: 10, border: "none",
                     background: (!formValid || !linkedFull)
                       ? "#f1f5f9"
                       : "linear-gradient(135deg,#3B6FFF,#6D28D9)",
                     color: (!formValid || !linkedFull) ? "#94a3b8" : "#fff",
                     fontSize: 14, fontWeight: 700,
                     cursor: (!formValid || generating || !linkedFull) ? "not-allowed" : "pointer",
                     display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {generating ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: "50%",
                               border: "2px solid rgba(255,255,255,0.4)",
                               borderTop: "2px solid #fff",
                               animation: "spin 0.8s linear infinite" }} />
                Generating…
              </>
            ) : (
              <> Generate Report</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Report Viewer Modal ─────────────────────────────────────────────
function SavedReportModal({ report, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980,
                    maxHeight: "92vh", overflow: "hidden",
                    boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
                    display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      flexShrink: 0, background: "#F8FAFF" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a",
                         fontFamily: "'Fraunces',serif" }}>
              {report.name}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
              {report.type} · Created {report.createdAt} by {report.createdBy}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
                     background: "#fff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#fff" }}>
          {report.data
            ? <ComplianceReport data={report.data} />
            : <p style={{ color: "#94a3b8", textAlign: "center" }}>No report data available.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Form helpers ──────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "0 14px", fontSize: 13, background: "#fff",
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif",
  color: "#0f172a",
};

function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569",
                      display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

function SectionLabel({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                  marginTop: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6,
                    background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{n}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{children}</span>
    </div>
  );
}