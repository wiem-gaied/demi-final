// src/pages/Reporting.jsx — fixed organisation + department display + risks aggregation

import { useState, useRef, useEffect } from "react";
import ComplianceReport from "../components/ComplianceReport";

// ─── Conformity-aligned constants ──────────────────────────────────────────
const STATUS_META_V2 = {
  Covered:          { label: "Covered",        color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", score: 100 },
  Partial:          { label: "Partial",        color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", score: 50 },
  "Not covered":    { label: "Not covered",    color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", score: 0 },
  "Not applicable": { label: "Not applicable", color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1", score: null },
};
const statusFromScoreV2 = (s) => s >= 80 ? "Covered" : s >= 30 ? "Partial" : "Not covered";

// Build item-centric data from `full` (handles both formats from backend)
function getItemCentricData(full) {
  if (Array.isArray(full?.items) && full.items.length > 0) return full.items;

  const map = new Map();
  for (const p of (full?.policies || [])) {
    for (const it of (p.items || [])) {
      if (!map.has(it.id || it.item_id)) {
        map.set(it.id || it.item_id, {
          item_id:       it.id || it.item_id,
          ref_id:        it.ref_id,
          title:         it.title,
          type:          it.type,
          is_applicable: it.is_applicable !== false,
          ai_status:     it.ai_status || it.status,
          ai_confidence: it.score || it.ai_confidence || 0,
          ciso_status:   it.ciso_status,
          ciso_comment:  it.ciso_comment,
          ciso_promoted: it.ciso_promoted || false,
          policy_assessments: [],
        });
      }
      const target = map.get(it.id || it.item_id);
      target.policy_assessments.push({
        policy_name:    p.policy_name,
        policy_summary: p.policy_summary || "",
        status:         it.ai_status || it.status,
        ciso_status:    it.ciso_status,
        conf:           it.score || 0,
        comment:        it.comment || "",
        risks:          it.risks || [],
        gaps:           it.gaps || [],
        remediation:    it.remediation || "",
      });
    }
  }
  return Array.from(map.values());
}

// Compute KPIs exactly like Conformity does
function computeKPIsFromItems(items) {
  let covered = 0, partial = 0, notCovered = 0, notApplicable = 0;
  let scoreSum = 0, scoredCount = 0, cisoValidations = 0;

  for (const it of items) {
    const cisoOverride = it.ciso_status;
    const aiNA = !it.is_applicable || it.ai_status === "Not applicable";
    const promotedByCiso = aiNA && cisoOverride && cisoOverride !== "Not applicable";
    const isApplicable = (!aiNA && cisoOverride !== "Not applicable") || promotedByCiso;

    if (!isApplicable) { notApplicable++; continue; }

    let itemScore;
    if (cisoOverride) {
      itemScore = STATUS_META_V2[cisoOverride]?.score ?? 0;
      cisoValidations++;
    } else {
      itemScore = it.ai_confidence ?? STATUS_META_V2[it.ai_status]?.score ?? 0;
    }
    const effStatus = statusFromScoreV2(itemScore);
    scoredCount++;
    scoreSum += itemScore;
    if (effStatus === "Covered")      covered++;
    else if (effStatus === "Partial") partial++;
    else                              notCovered++;
  }

  for (const it of items) {
    for (const pa of (it.policy_assessments || [])) {
      if (pa.risks?.length)                  cisoValidations++;
      if (pa.gaps?.length)                   cisoValidations++;
      if ((pa.remediation || "").trim())     cisoValidations++;
    }
  }

  const globalScore = scoredCount ? Math.round(scoreSum / scoredCount) : 0;
  return {
    analyzed: scoredCount,
    covered, partial, notCovered, notApplicable,
    validated: cisoValidations,
    globalScore,
    globalStatus: statusFromScoreV2(globalScore),
  };
}

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
function buildReportDataFromAnalysis({ full, formData }) {
  const analysisRow = full?.analysis || {};
  const cls = classificationOf(formData.classification);
  const dt = analysisRow.created_at
    ? new Date(analysisRow.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const organisation = analysisRow.created_by_organisation
                    || analysisRow.created_by_organization || "—";
  const department   = analysisRow.created_by_department || "—";
  const auditor      = analysisRow.created_by_name || "—";
  const frameworks   = analysisRow.standard_name || "—";

  // 1. Item-centric items
  const allItems = getItemCentricData(full);

  // 2. Split applicable vs not-applicable
  const applicableItems = [];
  const notApplicableItems = [];

  for (const it of allItems) {
    const cisoOverride = it.ciso_status;
    const aiNA = !it.is_applicable || it.ai_status === "Not applicable";
    const promotedByCiso = aiNA && cisoOverride && cisoOverride !== "Not applicable";
    const isApplicable = (!aiNA && cisoOverride !== "Not applicable") || promotedByCiso;

    if (isApplicable) {
      let score;
      if (cisoOverride) {
        score = STATUS_META_V2[cisoOverride]?.score ?? 0;
      } else {
        score = it.ai_confidence ?? STATUS_META_V2[it.ai_status]?.score ?? 0;
      }
      const effStatus = statusFromScoreV2(score);
      applicableItems.push({
        ...it,
        effectiveStatus: effStatus,
        effectiveScore: Math.round(score),
        policies: it.policy_assessments || [],
      });
    } else {
      notApplicableItems.push(it);
    }
  }

  // 3. KPIs — use stored values from BDD (same as analysis card)
  // 3. KPIs — toujours recalcul depuis les items (qui contiennent ciso_status à jour)
const computedKpis = computeKPIsFromItems(allItems);
const kpis = {
  analyzed:      computedKpis.analyzed,
  covered:       computedKpis.covered,
  partial:       computedKpis.partial,
  notCovered:    computedKpis.notCovered,
  notApplicable: computedKpis.notApplicable,
  validated:     computedKpis.validated,
  globalScore:   computedKpis.globalScore,
  globalStatus:  computedKpis.globalStatus,
};

  // 4. Aggregate risks — use top-level asset_risks / business_risks
  //    (your backend stores them here with item_id traceability)
  const itemById = {};
  for (const it of allItems) itemById[it.item_id] = it;

  const seenRisks = new Set();
  const aggregatedRisks = [];

  const pushRisk = (r) => {
    if (!r) return;
    const title = (r.intitule || r.description || r.title || "").trim();
    if (!title) return;
    const key = title.toLowerCase();
    if (seenRisks.has(key)) return;
    seenRisks.add(key);

    const linkedItem = r.item_id ? itemById[r.item_id] : null;
    const itemLabel = linkedItem
      ? `${linkedItem.ref_id || ""} ${linkedItem.title}`.trim()
      : "";

    aggregatedRisks.push({
      title,
      description: r.description || "",
      severity: severityFromImpactProba(r.impact, r.probabilite ?? r.probability),
      impact:  r.impact,
      proba:   r.probabilite ?? r.probability,
      item:    itemLabel,
      policy:  r.policy_name || "",
      risk_class: r.risk_class || r.riskClass || "asset",
      owner:   r.owner  || "",
      statut:  r.statut || "",
    });
  };

  for (const r of (full?.asset_risks    || [])) pushRisk(r);
  for (const r of (full?.business_risks || [])) pushRisk(r);

  // Also try nested locations (in case backend ever returns them embedded)
  for (const it of applicableItems) {
    for (const pa of (it.policies || [])) {
      for (const r of (pa.risks || [])) pushRisk({
        ...r,
        item_id: it.item_id,
        policy_name: pa.policy_name,
      });
    }
  }

  // 5. Aggregate mitigations
  const seenMit = new Set();
  const aggregatedMitigations = [];

  const pushMit = (text, priority, ctx) => {
    const lines = (text || "").split("\n").map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      const key = line.toLowerCase();
      if (seenMit.has(key)) continue;
      seenMit.add(key);
      aggregatedMitigations.push({
        title: line,
        priority: priority || "moderate",
        item:   ctx?.item   || "",
        policy: ctx?.policy || "",
      });
    }
  };

  for (const it of applicableItems) {
    for (const pa of (it.policies || [])) {
      pushMit(pa.remediation || pa.mitigation || "", "moderate", {
        item:   `${it.ref_id || ""} ${it.title}`.trim(),
        policy: pa.policy_name,
      });
    }
  }
  for (const p of (full?.policies || [])) {
    for (const r of (p.remediations || [])) {
      const text     = typeof r === "string" ? r : (r.action || r.description || "");
      const priority = priorityToSeverity(r.priority);
      pushMit(text, priority, { policy: p.policy_name });
    }
  }

  const overallStatusKey = kpis.globalStatus === "Covered"  ? "compliant"
                         : kpis.globalStatus === "Partial"  ? "partial"
                         : "non-compliant";
  const overallStatusLabel = kpis.globalStatus === "Covered"  ? "Compliant"
                           : kpis.globalStatus === "Partial"  ? "Partially compliant"
                           : "Non-compliant";

  return {
    organisation, department, auditor, frameworks,
    date: dt,
    version: "v1.0",
    classification: `${cls.label} Report`,
    scope: formData.scope || analysisRow.document_name || "—",

    global_score: kpis.globalScore,
    overallStatus: overallStatusKey,
    overallStatusLabel,

    kpis,
    items: applicableItems,
    notApplicableItems,

    risks: aggregatedRisks,
    mitigations: aggregatedMitigations,
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

  const [analyses, setAnalyses]               = useState([]);
  const [loadingAna, setLoadingAna]           = useState(true);
  const [searchAna, setSearchAna]             = useState("");
  const [detailAnalysis, setDetailAnalysis]   = useState(null);
  const [analysisFull, setAnalysisFull]       = useState(null);

  const [reports, setReports]                 = useState([]);
  const [search, setSearch]                   = useState("");
  const [filterClass, setFilterClass]         = useState("tous");
  const [sortBy, setSortBy]                   = useState("date");
  const [detailReport, setDetailReport]       = useState(null);

  const [showModal, setShowModal]             = useState(false);
  const [linkedFull, setLinkedFull]           = useState(null);
  const [linkedAnalysis, setLinkedAnalysis]   = useState(null);
  const [form, setForm] = useState({
    name: "", type: "Compliance Audit", classification: "interne",
    organisation: "", department: "", scope: "",
  });
  const [generating, setGenerating]           = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

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

  const openAnalysis = async (a) => {
    setDetailAnalysis(a);
    setAnalysisFull(null);
    try {
      const r = await fetch(`${API_BASE}/${a.id}`, { credentials: "include" });
      const d = await r.json();
      setAnalysisFull(normalizeAnalysis(d));
    } catch (e) {
      console.error("Failed to load analysis detail:", e);
    }
  };

  const openGenerationForm = async (a) => {
    setLinkedAnalysis(a);
    setLinkedFull(null);
    setGeneratedReport(null);

    setForm({
      name:           `${a.title} - Compliance Report`,
      type:           "Compliance Audit",
      classification: "interne",
      organisation:   "",
      department:     "",
      scope:          a.document_name || "",
    });
    setShowModal(true);

    try {
      const r = await fetch(`${API_BASE}/${a.id}`, { credentials: "include" });
      const d = await r.json();
      const normalized = normalizeAnalysis(d);
      setLinkedFull(normalized);

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

  const handleGenerate = () => {
    if (!linkedFull) {
      alert("Analysis details are still loading. Please wait a moment.");
      return;
    }
    if (!form.name.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const data = buildReportDataFromAnalysis({ full: linkedFull, formData: form });
      setGeneratedReport(data);
      setGenerating(false);
    }, 400);
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif", padding: "32px 40px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,0.1); outline: none; }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", margin: 0 }}>Reporting</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
          View finalized compliance analyses and generate reports — auto-filled from your analysis data.
        </p>
      </div>

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
  const rawItems = getItemCentricData(full);

  // Attach top-level risks to their items via item_id
  const allFlatRisks = [
    ...(full?.asset_risks    || []),
    ...(full?.business_risks || []),
  ];
  const risksByItemId = {};
  for (const r of allFlatRisks) {
    if (!r.item_id) continue;
    if (!risksByItemId[r.item_id]) risksByItemId[r.item_id] = [];
    risksByItemId[r.item_id].push(r);
  }
  const items = rawItems.map(it => ({
    ...it,
    itemRisks: risksByItemId[it.item_id] || [],
  }));

  const computedKpis = computeKPIsFromItems(items);

  // Use the stored values from the analysis row (same as card)
  const row = full?.analysis || analysis || {};
  const kpis = {
  analyzed:      computedKpis.analyzed,
  covered:       computedKpis.covered,
  partial:       computedKpis.partial,
  notCovered:    computedKpis.notCovered,
  notApplicable: computedKpis.notApplicable,
  validated:     computedKpis.validated,
  globalScore:   computedKpis.globalScore,
  globalStatus:  computedKpis.globalStatus,
};

  const org  = row.created_by_organisation || row.created_by_organization || "—";
  const dept = row.created_by_department || "—";

  const applicableItems = items.filter(it => {
    const aiNA = !it.is_applicable || it.ai_status === "Not applicable";
    const promoted = aiNA && it.ciso_status && it.ciso_status !== "Not applicable";
    return (!aiNA && it.ciso_status !== "Not applicable") || promoted;
  });
  const notApplicableItems = items.filter(it => !applicableItems.includes(it));

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
               display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 1100,
                 maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>

        <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 16, position: "sticky", top: 0, background: "#fff", zIndex: 5 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>
              {analysis.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              {analysis.standard_name} · By <strong>{analysis.created_by_name}</strong>
              {org !== "—"  && <> · 🏢 {org}</>}
              {dept !== "—" && <> · {dept}</>}
              &nbsp;· {new Date(analysis.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8faff", cursor: "pointer", color: "#64748b", fontSize: 18 }}>×</button>
        </div>

        {!full ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E2E8F0", borderTop: "3px solid #3B6FFF", animation: "spin .8s linear infinite", margin: "0 auto 10px" }} />
            Loading details…
          </div>
        ) : (
          <div style={{ padding: "20px 28px" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Overall Compliance (applicable items)</span>
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: STATUS_META_V2[kpis.globalStatus].color }}>{kpis.globalScore}%</span>
                <div style={{ width: 120, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${kpis.globalScore}%`, height: "100%", background: STATUS_META_V2[kpis.globalStatus].color, borderRadius: 3, transition: "width .4s ease" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Items analyzed", value: kpis.analyzed,      color: "#3B6FFF" },
                { label: "Covered",        value: kpis.covered,       color: "#16A34A" },
                { label: "Partial",        value: kpis.partial,       color: "#061585" },
                { label: "Not covered",    value: kpis.notCovered,    color: "#DC2626" },
                { label: "Not applicable", value: kpis.notApplicable, color: "#64748B" },
              ].map(k => (
                <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 12px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {applicableItems.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                No applicable items in this analysis.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {applicableItems.map(it => (
                  <ItemCardRO key={it.item_id} item={it} />
                ))}
              </div>
            )}

            {notApplicableItems.length > 0 && (
              <NotApplicableSectionRO items={notApplicableItems} />
            )}

            <button onClick={onGenerate}
              style={{ marginTop: 24, width: "100%", padding: 12, borderRadius: 10, border: "none",
                       background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Generate Report from this Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Read-only Status Pill ─────────────────────────────────────────────────
function StatusPillRO({ status, decision, big }) {
  const eff = decision || status;
  const s   = STATUS_META_V2[eff];
  if (!s) return null;
  const label = decision ? `CISO · ${decision}` : s.label;
  return (
    <span style={{
      fontSize: big ? 12 : 10, padding: big ? "3px 10px" : "2px 8px",
      borderRadius: 20, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border || s.color}`,
      display: "inline-block", fontFamily: "'DM Sans',sans-serif",
    }}>{label}</span>
  );
}

// ─── Read-only ItemCard (collapsible) ──────────────────────────────────────
function ItemCardRO({ item }) {
  const [open, setOpen] = useState(false);
  const effectiveStatus = item.ciso_status || item.ai_status;
  const meta = STATUS_META_V2[effectiveStatus] || STATUS_META_V2["Not covered"];

  const cisoPromoted = !item.is_applicable && item.ciso_status && item.ciso_status !== "Not applicable";
  const isNA = (!item.is_applicable && !cisoPromoted) || effectiveStatus === "Not applicable";

  const policyAssessments = item.policy_assessments || [];
  const typeLabel =
    (item.type || "").startsWith("core")  ? "Core"  :
    (item.type || "").startsWith("annex") ? "Annex" : "";

  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${open ? `${meta.color}55` : "#E2E8F8"}`, background: "#fff", overflow: "hidden", boxShadow: open ? `0 4px 16px ${meta.color}15` : "0 1px 6px rgba(0,0,0,0.05)" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: open ? `linear-gradient(to right,${meta.bg},transparent)` : "#F0F4FF", border: "none", cursor: "pointer", textAlign: "left", borderBottom: open ? "1px solid #E2E8F8" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            {item.ref_id && (
              <span style={{ fontSize: 10, color: "#94a3b8", background: "#fff", padding: "1px 7px", borderRadius: 4, fontWeight: 700, border: "1px solid #E2E8F8" }}>{item.ref_id}</span>
            )}
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{item.title}</span>
            {typeLabel && (
              <span style={{ fontSize: 9, color: "#fff", background: "#3B6FFF", padding: "2px 7px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{typeLabel}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
            <StatusPillRO status={item.ai_status} decision={item.ciso_status} />
            {isNA
              ? <span>Not addressed by any policy in the uploaded document</span>
              : <span>
                  {policyAssessments.length} relevant {policyAssessments.length === 1 ? "policy" : "policies"}
                  {cisoPromoted && <span style={{ marginLeft: 6, color: "#16A34A", fontWeight: 700 }}>(CISO validated)</span>}
                </span>}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "12px 16px" }}>
          {isNA ? (
            <div style={{ padding: "16px 12px", textAlign: "center", color: "#64748B", fontSize: 12, fontStyle: "italic" }}>
              No policy in the uploaded document is relevant to this control. This item is marked Not applicable and ignored in the global score.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Relevant policies ({policyAssessments.length})
              </div>
              {policyAssessments.map((pa, idx) => <PolicyBlockRO key={pa.policy_name + idx} pa={pa} />)}

              {(item.itemRisks || []).length > 0 && (
                <div style={{
                  marginTop: 10, padding: "10px 12px",
                  background: "#FEF2F2", border: "1px solid #FCA5A5",
                  borderRadius: 8, borderLeft: "3px solid #DC2626",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Identified risks ({item.itemRisks.length})
                  </div>
                  {item.itemRisks.map((r, i) => (
                    <div key={r.id || i} style={{
                      padding: "8px 10px", marginBottom: 6, background: "#fff",
                      border: "1px solid #FECACA", borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>
                        {r.intitule || r.description || "—"}
                      </div>
                      {r.description && r.description !== r.intitule && (
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 3, lineHeight: 1.5 }}>
                          {r.description}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
                          I:{r.impact || 0} · P:{r.probabilite || 0}
                        </span>
                        {r.risk_class && (
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: r.risk_class === "business" ? "#F5F3FF" : "#EEF4FF", color: r.risk_class === "business" ? "#6D28D9" : "#3B6FFF", fontWeight: 600 }}>
                            {r.risk_class}
                          </span>
                        )}
                        {r.statut && (
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: "#F1F5F9", color: "#475569", fontWeight: 600 }}>
                            {r.statut}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Read-only Policy Block ────────────────────────────────────────────────
function PolicyBlockRO({ pa }) {
  const eff  = pa.ciso_status || pa.status;
  const meta = STATUS_META_V2[eff] || STATUS_META_V2["Not covered"];
  const risks       = pa.risks || [];
  const gaps        = pa.gaps  || [];
  const remediation = pa.remediation || "";
  const comment     = pa.comment || "";

  return (
    <div style={{ border: `1px solid ${meta.border}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: `${meta.bg}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{pa.policy_name}</span>
        <StatusPillRO status={pa.status} decision={pa.ciso_status} />
        {pa.conf > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 70, height: 5, background: "#E2E8F8", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pa.conf}%`, background: meta.color, borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{pa.conf}%</span>
          </div>
        )}
      </div>

      {pa.policy_summary && (
        <div style={{ marginTop: 4, padding: "6px 10px", background: "#EEF2FF", border: "1px solid #3B6FFF25", borderRadius: 6, fontSize: 11.5, color: "#475569", lineHeight: 1.5 }}>
          <span style={{ color: "#0F172A", fontWeight: 700 }}>Policy description:</span> {pa.policy_summary}
        </div>
      )}

      {comment && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff", border: "1px solid #E2E8F8", borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>How this policy addresses the item</div>
          <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.5 }}>{comment}</div>
        </div>
      )}

      {risks.length > 0 && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>Risks ({risks.length})</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#475569" }}>
            {risks.map((r, i) => {
              const desc = typeof r === "string" ? r : (r.description || r.intitule || "");
              return (
                <li key={r.id || i} style={{ marginBottom: 3 }}>
                  {desc || <em>(empty)</em>}
                  {(r.impact || r.probability || r.probabilite) && (
                    <span style={{ marginLeft: 6, fontSize: 9.5, color: "#94a3b8" }}>
                      · I:{r.impact}/P:{r.probability || r.probabilite}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div style={{ marginTop: 6, padding: "8px 10px", background: "#FFFBEB", borderRadius: 8, borderLeft: "3px solid #061585" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#061585", marginBottom: 4 }}>Gaps ({gaps.length})</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#475569" }}>
            {gaps.map((g, i) => <li key={i}>{typeof g === "string" ? g : (g.description || "")}</li>)}
          </ul>
        </div>
      )}

      {remediation && (
        <div style={{ marginTop: 6, padding: "8px 10px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>Mitigation Plan</div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 11.5, color: "#475569", lineHeight: 1.5 }}>{remediation}</div>
        </div>
      )}
    </div>
  );
}

// ─── Read-only Not-Applicable Section ──────────────────────────────────────
function NotApplicableSectionRO({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 28, borderRadius: 12, border: "1.5px dashed #C7D2F0", background: "#F1F5F9", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontWeight: 800, color: "#64748B", marginBottom: 2 }}>
            {items.length} item{items.length === 1 ? "" : "s"} not applicable
          </div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            These items are not addressed by any policy detected in the document and are excluded from the global compliance score.
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: "4px 14px 14px", borderTop: "1px solid #E2E8F8", background: "#fff" }}>
          {items.map(it => {
            const typeLabel =
              (it.type || "").startsWith("core")  ? "Core"  :
              (it.type || "").startsWith("annex") ? "Annex" : "";
            return (
              <div key={it.item_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderBottom: "1px solid #E2E8F8" }}>
                {it.ref_id && (
                  <span style={{ fontSize: 10, color: "#94a3b8", background: "#F0F4FF", padding: "1px 7px", borderRadius: 4, fontWeight: 700, border: "1px solid #E2E8F8" }}>{it.ref_id}</span>
                )}
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 12.5, fontWeight: 700, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                {typeLabel && (
                  <span style={{ fontSize: 9, color: "#fff", background: "#3B6FFF", padding: "2px 7px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{typeLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Generation Form Modal ─────────────────────────────────────────────────
function GenerationFormModal({ form, setForm, linkedAnalysis, linkedFull, generating, generatedReport, onGenerate, onSave, onClose }) {
  const reportRef = useRef(null);

  const row        = linkedFull?.analysis || {};
  const orgDisplay = row.created_by_organisation || row.created_by_organization || form.organisation || "—";
  const deptDisplay= row.created_by_department   || form.department || "—";

  if (generatedReport) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980, maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#F8FAFF" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'Fraunces',serif" }}>Report generated — Preview</h2>
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
  if (!el) return;

  try {
    const res = await fetch("http://localhost:3000/api/reporting/export-compliance-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        html: el.innerHTML,
        filename: form.name || "compliance-report",
      }),
    });

    // ── Vérification correcte : ne pas appeler .json() sur un PDF ──
    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      const errMsg = contentType.includes("application/json")
        ? (await res.json()).details || "PDF generation failed"
        : `Server error ${res.status}`;
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${form.name || "compliance-report"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Export PDF error:", err);
    alert(`PDF export failed: ${err.message}`);
  }
}} style={{
  padding: "9px 18px", borderRadius: 8, border: "none",
  background: "#0b256d", color: "#fff", fontSize: 13,
  fontWeight: 700, cursor: "pointer"
}}>
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