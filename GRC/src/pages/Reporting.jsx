// src/pages/Reporting.jsx — fixed organisation + department display

import { useState, useRef, useEffect } from "react";
import ComplianceReport from "../components/ComplianceReport";

const API_BASE = "http://localhost:3000/api/analyses";

const CLASSIFICATION_OPTIONS = [
  { value: "public",       label: "Public",       color: "#16a34a", bg: "#dcfce7" },
  { value: "interne",      label: "Internal",     color: "#2563eb", bg: "#dbeafe" },
  { value: "confidentiel", label: "Confidential", color: "#d97706", bg: "#fef3c7" },
  { value: "secret",       label: "Secret",       color: "#dc2626", bg: "#fee2e2" },
  { value: "tres_secret",  label: "Top Secret",   color: "#7c3aed", bg: "#ede9fe" },
];
const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  wow: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
  purple: "#6D28D9", purpleLight: "#F5F0FF",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#061585", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  info: "#0891B2", infoLight: "#ECFEFF",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
  shadowMd: "0 4px 12px rgba(15,23,42,0.09)",
  shadowLg: "0 10px 30px rgba(15,23,42,0.13)",
};
C.accent = `linear-gradient(135deg, ${C.wow}, ${C.warning})`;

const REPORT_TYPES = [
  "Compliance Audit", "Risk Analysis", "Incident Report",
  "Controls Assessment", "Policy Review", "Vulnerability Report",
];

const STATUS_PILL = {
  Covered:       { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
  Partial:       { color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  "Not covered": { color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};

const classificationOf = (val) =>
  CLASSIFICATION_OPTIONS.find(c => c.value === val) || CLASSIFICATION_OPTIONS[1];

// ─── helpers ───────────────────────────────────────────────────────────────
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
  if (p === "critical") return "critical";
  if (p === "high")     return "high";
  return "moderate";
}

// ─── Mapper ────────────────────────────────────────────────────────────────
// ✅ FIX: We now read organisation/department from `full.analysis` (the DB row
//         returned by GET /api/analyses/:id) which always has these columns,
//         instead of from the lightweight list row that omits them.
function buildReportDataFromAnalysis({ full, formData }) {
  // `full` is the object returned by GET /api/analyses/:id:
  //   { analysis: {...}, policies: [...], asset_risks: [...], business_risks: [...] }
  const analysisRow = full?.analysis || {};
  const score       = analysisRow.global_score || 0;
  const overall     = statusFromScore(score);

  // ✅ Organisation & department come from the full DB row
  const organisation = analysisRow.created_by_organisation
                    || analysisRow.created_by_organization   // fallback spelling
                    || "—";
  const department   = analysisRow.created_by_department || "—";
  const auditor      = analysisRow.created_by_name        || "—";
  const frameworks   = analysisRow.standard_name          || "—";

  const cls = classificationOf(formData.classification);
  const dt  = analysisRow.created_at
    ? new Date(analysisRow.created_at).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      });

  // Domains
  const domains = (full?.policies || []).map(p => {
    const st          = statusFromScore(p.policy_score || 0);
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
      name:         p.policy_name || "Policy",
      ref:          frameworks,
      score:        p.policy_score || 0,
      status:       st.key,
      comment:      p.policy_summary || fallback,
      gaps:         p.gaps         || p.policy_gaps        || [],
      remediations: p.remediations || p.analysis_remediations || [],
      items:        p.items        || [],
    };
  });

  // Risks (asset + business, deduped by title)
  const allRisks = [
    ...(full?.asset_risks    || []).map(r => ({ ...r, _kind: "asset" })),
    ...(full?.business_risks || []).map(r => ({ ...r, _kind: "business" })),
  ];
  const seenTitles = new Set();
  const risks = [];
  for (const r of allRisks) {
    const title = (r.intitule || r.title || "").trim();
    if (!title || seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());
    risks.push({
      title,
      severity: severityFromImpactProba(r.impact, r.probabilite ?? r.probability),
    });
  }

  // Mitigations
  const seenMit = new Set();
  const mitigations = [];
  for (const p of (full?.policies || [])) {
    for (const r of (p.remediations || [])) {
      const action = (r.action || "").trim();
      if (!action || seenMit.has(action.toLowerCase())) continue;
      seenMit.add(action.toLowerCase());
      mitigations.push({ title: action, priority: priorityToSeverity(r.priority) });
    }
  }
  // Fallback from gaps if no remediations
  if (mitigations.length === 0) {
    for (const p of (full?.policies || [])) {
      for (const g of (p.gaps || [])) {
        const txt = (typeof g === "string" ? g : g.description || "").trim();
        if (!txt) continue;
        mitigations.push({ title: `Combler le gap : ${txt}`, priority: "high" });
      }
    }
  }

  return {
    // ✅ Always populated from the full DB row
    organisation,
    department,
    auditor,
    frameworks,
    date:               dt,
    version:            "v1.0",
    classification:     `Rapport ${cls.label.toLowerCase()}`,
    scope:              formData.scope || analysisRow.document_name || "—",
    overallStatus:      overall.key,
    overallStatusLabel: overall.label,
    global_score:       score,
    domains,
    risks,
    mitigations,
  };
}

// ─── normalizeAnalysis ──────────────────────────────────────────────────────
function normalizeAnalysis(data) {
  return {
    ...data,
    policies: (data.policies || []).map(p => ({
      ...p,
      gaps:         p.gaps         || p.policy_gaps                 || [],
      remediations: p.remediations || p.actions                     || [],
      items:        p.items        || p.controls                    || [],
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function Reporting() {
  const [tab, setTab] = useState("analyses");

  // analyses tab
  const [analyses, setAnalyses]               = useState([]);
  const [loadingAna, setLoadingAna]           = useState(true);
  const [searchAna, setSearchAna]             = useState("");
  const [detailAnalysis, setDetailAnalysis]   = useState(null);
  const [analysisFull, setAnalysisFull]       = useState(null);

  // reports tab
  const [reports, setReports]                 = useState([]);
  const [search, setSearch]                   = useState("");
  const [filterClass, setFilterClass]         = useState("tous");
  const [sortBy, setSortBy]                   = useState("date");
  const [detailReport, setDetailReport]       = useState(null);

  // generation modal
  const [showModal, setShowModal]             = useState(false);
  const [linkedFull, setLinkedFull]           = useState(null);
  const [linkedAnalysis, setLinkedAnalysis]   = useState(null); // lightweight row (for display)
  const [form, setForm] = useState({
    name: "", type: "Compliance Audit", classification: "interne",
    organisation: "", department: "", scope: "",
  });
  const [generating, setGenerating]           = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  // ── Load lightweight analyses list ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API_BASE, { credentials: "include" });
        const d = await r.json();
        setAnalyses(Array.isArray(d) ? d : []);
      } catch { setAnalyses([]); }
      finally   { setLoadingAna(false); }
    })();
  }, []);

  // ── Open analysis detail ─────────────────────────────────────────────────
  const openAnalysis = async (a) => {
    setDetailAnalysis(a);
    setAnalysisFull(null);
    try {
      const r = await fetch(`${API_BASE}/${a.id}`, { credentials: "include" });
      const d = await r.json();
      setAnalysisFull(normalizeAnalysis(d));
    } catch (e) { console.error("Failed to load analysis detail:", e); }
  };

  // ── Open generation form ─────────────────────────────────────────────────
  // ✅ FIX: We fetch the FULL detail immediately so organisation/department
  //         are available when building the report data.
  const openGenerationForm = async (a) => {
    setLinkedAnalysis(a);
    setLinkedFull(null);
    setGeneratedReport(null);

    // Pre-fill form with lightweight data first
    setForm({
      name:           `${a.title} - Compliance Report`,
      type:           "Compliance Audit",
      classification: "interne",
      organisation:   "",   // will be overwritten once full detail loads
      department:     "",   // will be overwritten once full detail loads
      scope:          a.document_name || "",
    });
    setShowModal(true);

    // ✅ Fetch full detail — this gives us created_by_organisation & created_by_department
    try {
      const r = await fetch(`${API_BASE}/${a.id}`, { credentials: "include" });
      const d = await r.json();
      const normalized = normalizeAnalysis(d);
      setLinkedFull(normalized);

      // ✅ Now update form with real org/dept from the DB row
      const row = normalized.analysis || {};
      setForm(prev => ({
        ...prev,
        organisation: row.created_by_organisation
                   || row.created_by_organization
                   || prev.organisation
                   || "",
        department:   row.created_by_department || prev.department || "",
      }));
    } catch (e) {
      console.error("Failed to load analysis detail for generation:", e);
    }
  };

  // ── Generate report ──────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!linkedFull) {
      alert("Analysis details are still loading. Please wait a moment.");
      return;
    }
    if (!form.name.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      // ✅ Pass linkedFull (which contains full.analysis with org/dept)
      const data = buildReportDataFromAnalysis({ full: linkedFull, formData: form });
      setGeneratedReport(data);
      setGenerating(false);
    }, 400);
  };

  // ── Save report locally ──────────────────────────────────────────────────
  const handleSaveReport = () => {
    if (!generatedReport) return;
    const newReport = {
      id:             Date.now(),
      name:           form.name,
      type:           form.type,
      classification: form.classification,
      createdAt:      new Date().toISOString().slice(0, 10),
      createdBy:      (linkedFull?.analysis || linkedAnalysis)?.created_by_name || "CISO",
      analysis_id:    linkedAnalysis?.id || null,
      data:           generatedReport,
      status:         "draft",
    };
    setReports(prev => [newReport, ...prev]);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setLinkedAnalysis(null);
    setLinkedFull(null);
    setGeneratedReport(null);
    setForm({ name: "", type: "Compliance Audit", classification: "interne", organisation: "", department: "", scope: "" });
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const filteredAnalyses = analyses.filter(a => {
    const q = searchAna.toLowerCase();
    return (a.title || "").toLowerCase().includes(q)
        || (a.created_by_name  || "").toLowerCase().includes(q)
        || (a.standard_name    || "").toLowerCase().includes(q);
  });

  const filteredReports = reports
    .filter(r => {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    })
    .filter(r => filterClass === "tous" || r.classification === filterClass)
    .sort((a, b) => sortBy === "date"
      ? b.createdAt.localeCompare(a.createdAt)
      : a.name.localeCompare(b.name));

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif", padding: "32px 40px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,0.1); outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", margin: 0 }}>Reporting</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
          View finalized compliance analyses and generate reports — auto-filled from your analysis data.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {[{ k: "analyses", l: `Analyses (${analyses.length})` }, { k: "reports", l: `Reports (${reports.length})` }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: "10px 18px", border: "none", background: "transparent",
                     color: tab === t.k ? "#2c2098": "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer",
                     borderBottom: `2px solid ${tab === t.k ? "#3B6FFF" : "transparent"}`,
                     marginBottom: -2, fontFamily: "'DM Sans',sans-serif" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── ANALYSES TAB ── */}
      {tab === "analyses" && (
        <>
          <div style={{ position: "relative", marginBottom: 18, maxWidth: 380 }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search analyses..." value={searchAna} onChange={e => setSearchAna(e.target.value)}
              style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 38,
                       border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13,
                       background: "#fff", outline: "none", boxSizing: "border-box" }} />
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

      {/* ── REPORTS TAB ── */}
      {tab === "reports" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Search for a report..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 38,
                         border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13,
                         background: "#fff", outline: "none", boxSizing: "border-box" }} />
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
                  <div key={r.id} onClick={() => setDetailReport(r)}
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

      {/* ── Modals ── */}
      {detailAnalysis && (
        <AnalysisDetailModal
          analysis={detailAnalysis}
          full={analysisFull}
          onClose={() => { setDetailAnalysis(null); setAnalysisFull(null); }}
          onGenerate={() => { openGenerationForm(detailAnalysis); setDetailAnalysis(null); setAnalysisFull(null); }}
        />
      )}

      {showModal && (
        <GenerationFormModal
          form={form} setForm={setForm}
          linkedAnalysis={linkedAnalysis}
          linkedFull={linkedFull}
          generating={generating}
          generatedReport={generatedReport}
          onGenerate={handleGenerate}
          onSave={handleSaveReport}
          onClose={closeModal}
        />
      )}

      {detailReport && (
        <SavedReportModal report={detailReport} onClose={() => setDetailReport(null)} />
      )}
    </div>
  );
}

// ─── Analysis Card ─────────────────────────────────────────────────────────
function AnalysisCard({ analysis, onOpen, onGenerate }) {
  const score      = analysis.global_score || 0;
  const scoreColor = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";
  const dt         = analysis.created_at ? new Date(analysis.created_at).toLocaleDateString("en-GB") : "";

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef8", borderRadius: 14,
                  padding: "18px 20px", position: "relative", overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: scoreColor }} />
      <div style={{ paddingLeft: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>{analysis.title}</p>
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
            <button onClick={e => { e.stopPropagation(); onOpen(); }}
              style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8faff", color: "#3B6FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              View
            </button>
            <button onClick={e => { e.stopPropagation(); onGenerate(); }}
              style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: `linear-gradient(135deg, ${C.wow}, ${C.warning})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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
  const score      = analysis.global_score || 0;
  const scoreColor = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  // ✅ Show org/dept from full.analysis if available, else from lightweight row
  const row = full?.analysis || analysis;
  const org  = row.created_by_organisation || row.created_by_organization || "—";
  const dept = row.created_by_department || "—";

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
               display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 900,
                 maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>

        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>
              {analysis.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {analysis.standard_name} · By <strong>{analysis.created_by_name}</strong>
              {org !== "—" && <> · 🏢 {org}</>}
              {dept !== "—" && <> · {dept}</>}
              &nbsp;· {new Date(analysis.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <KPI label="Global Score" value={`${score}%`}            color={scoreColor} />
          <KPI label="Covered"      value={analysis.covered_count}     color="#16A34A" />
          <KPI label="Partial"      value={analysis.partial_count}     color="#D97706" />
          <KPI label="Not covered"  value={analysis.not_covered_count} color="#DC2626" />
        </div>

        <div style={{ padding: "22px 28px" }}>
          {!full ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E2E8F0", borderTop: "3px solid #3B6FFF", animation: "spin .8s linear infinite", margin: "0 auto 10px" }} />
              Loading details…
            </div>
          ) : (
            <>
              {(full.policies || []).map(p => <PolicyDetailBlock key={p.id} policy={p} />)}
              {((full.asset_risks?.length || 0) + (full.business_risks?.length || 0)) > 0 && (
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
                     background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Generate Report from this Analysis
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
  const meta            = STATUS_PILL[policy.status] || STATUS_PILL["Not covered"];
  const gapsList        = policy.gaps        || policy.policy_gaps || [];
  const remediationsList= policy.remediations|| [];

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
        {gapsList.length > 0 ? (
          <DetailSection title="Identified Gaps" color="#DC2626" bg="#FEF2F2">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {gapsList.map((gap, idx) => (
                <li key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                  {typeof gap === "string" ? gap : (gap.description || gap.title || "")}
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : (
          (policy.items || []).filter(it => (it.ciso_status || it.ai_status) === "Not covered").length > 0 && (
            <DetailSection title="Non-conformity Points" color="#DC2626" bg="#FEF2F2">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {policy.items.filter(it => (it.ciso_status || it.ai_status) === "Not covered").map(it => (
                  <li key={it.id} style={{ fontSize: 12, marginBottom: 4 }}>
                    {it.ref_id && <strong>{it.ref_id} </strong>}{it.title}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )
        )}

        {remediationsList.length > 0 && (
          <DetailSection title="Remediation Plan" color="#16A34A" bg="#F0FDF4">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {remediationsList.map((rem, idx) => (
                <li key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                  {rem.action || rem.description || rem}
                  {rem.priority && <span style={{ marginLeft: 8, fontSize: 10, color: "#94a3b8" }}>({rem.priority})</span>}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {(policy.items || []).length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569" }}>
              {policy.items.length} evaluated controls
            </summary>
            <div style={{ marginTop: 8 }}>
              {policy.items.map(it => {
                const m = STATUS_PILL[it.ciso_status || it.ai_status] || STATUS_PILL["Not covered"];
                return (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 4, background: "#fff" }}>
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
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 6, background: "#fff" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{title}</div>
        {risk.description && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {risk.description.slice(0, 120)}{risk.description.length > 120 && "…"}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                       background: kind === "business" ? "#F5F3FF" : "#EEF4FF",
                       color: kind === "business" ? "#6D28D9" : "#3B6FFF" }}>
          {kind === "business" ? "Business" : "Asset"}
        </span>
        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
          I:{risk.impact || 0}/P:{risk.probabilite || risk.probability || 0}
        </span>
      </div>
    </div>
  );
}

// ─── Generation Form Modal ─────────────────────────────────────────────────
function GenerationFormModal({ form, setForm, linkedAnalysis, linkedFull, generating, generatedReport, onGenerate, onSave, onClose }) {
  const reportRef = useRef(null);

  // ✅ Show the org/dept that will appear in the report (read from full DB row)
  const row        = linkedFull?.analysis || {};
  const orgDisplay = row.created_by_organisation || row.created_by_organization || form.organisation || "—";
  const deptDisplay= row.created_by_department   || form.department || "—";

  if (generatedReport) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980, maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#F8FAFF" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>✅ Report generated — Preview</h2>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{form.name} · {orgDisplay} · {deptDisplay}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
          </div>

          <div ref={reportRef} style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#fff" }}>
            <ComplianceReport data={generatedReport} />
          </div>

          <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#F8FAFF" }}>
            <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Discard</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => {
                const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Compliance Report</title>
                  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap" rel="stylesheet">
                  <style>body{font-family:'DM Sans',sans-serif;background:#fff;padding:40px}</style></head><body>${reportRef.current?.outerHTML || ""}</body></html>`;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
                a.download = "compliance-report.html";
                a.click();
              }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0c0a63", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Export HTML
              </button>
              <button onClick={async () => {
                const el = reportRef.current;
                const origOverflow = el.style.overflow; const origHeight = el.style.height;
                el.style.overflow = "visible"; el.style.height = "auto";
                const html2pdf = (await import("html2pdf.js")).default;
                await html2pdf().from(el).set({ margin: [10,10,10,10], filename: "compliance-report.pdf", html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css","avoid-all","legacy"] } }).save();
                el.style.overflow = origOverflow; el.style.height = origHeight;
              }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0b256d", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Export PDF
              </button>
              <button onClick={onSave} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#142f5f", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Save Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ──
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>Generate Report</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {linkedAnalysis ? <>Linked to: <strong>{linkedAnalysis.title}</strong></> : "Configure the report content below."}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", color: "#64748b", fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: "22px 28px" }}>
          <SectionLabel n={1}>Report metadata</SectionLabel>

          <FormField label="Report title *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., ISO 27001 Audit – Q2 2026" style={inputStyle} />
          </FormField>

          {/* ✅ Show org/dept read-only — sourced from DB, user cannot change */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <FormField label="Organisation (from analysis)">
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#F8FAFF", color: orgDisplay === "—" ? "#94a3b8" : "#0f172a", border: "1.5px solid #e2e8f0", borderRadius: 8, height: 40, padding: "0 14px", fontSize: 13 }}>
                {!linkedFull
                  ? <span style={{ color: "#94a3b8", fontSize: 12 }}>Loading…</span>
                  : orgDisplay}
              </div>
            </FormField>
            <FormField label="Department (from analysis)">
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#F8FAFF", color: deptDisplay === "—" ? "#94a3b8" : "#0f172a", border: "1.5px solid #e2e8f0", borderRadius: 8, height: 40, padding: "0 14px", fontSize: 13 }}>
                {!linkedFull
                  ? <span style={{ color: "#94a3b8", fontSize: 12 }}>Loading…</span>
                  : deptDisplay}
              </div>
            </FormField>
          </div>

          <FormField label="Scope (optional)" hint="Defaults to the analyzed document name.">
            <input value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
              placeholder="e.g., Global IT perimeter" style={inputStyle} />
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

          <button onClick={onGenerate}
            disabled={!form.name.trim() || generating || !linkedFull}
            style={{ width: "100%", marginTop: 22, height: 46, borderRadius: 10, border: "none",
                     background: (!form.name.trim() || !linkedFull) ? "#f1f5f9" : "linear-gradient(135deg,#3B6FFF,#6D28D9)",
                     color: (!form.name.trim() || !linkedFull) ? "#94a3b8" : "#fff",
                     fontSize: 14, fontWeight: 700,
                     cursor: (!form.name.trim() || generating || !linkedFull) ? "not-allowed" : "pointer",
                     display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {generating ? (
              <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />Generating…</>
            ) : !linkedFull ? (
              <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #94a3b8", borderTop: "2px solid #3B6FFF", animation: "spin 0.8s linear infinite" }} />Loading analysis…</>
            ) : (
              <>Generate Report</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Report Viewer ───────────────────────────────────────────────────
function SavedReportModal({ report, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980, maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#F8FAFF" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>{report.name}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{report.type} · {report.createdAt} · {report.createdBy}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#fff" }}>
          {report.data ? <ComplianceReport data={report.data} /> : <p style={{ color: "#94a3b8", textAlign: "center" }}>No report data available.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Shared form helpers ───────────────────────────────────────────────────
const inputStyle = {
  width: "100%", height: 40, border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "0 14px", fontSize: 13, background: "#fff",
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", color: "#0f172a",
};

function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SectionLabel({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{n}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{children}</span>
    </div>
  );
}