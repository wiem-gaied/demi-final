import { useState, useMemo, useEffect} from "react";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — same palette as your GRC platform
// ─────────────────────────────────────────────────────────────────
const C = {
  primary:  "#3B6FFF",
  purple:   "#6D28D9",
  bg:       "#F8FAFF",
  surface:  "#FFFFFF",
  border:   "#E4EAF8",
  borderLight: "#EFF3FC",
  text:     "#0F1A3E",
  muted:    "#64748B",
  danger:   "#EF4444",
  warning:  "#F97316",
  amber:    "#F59E0B",
  success:  "#10B981",
  teal:     "#0D9488",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
};

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────
const RISK_LEVELS = {
  critical: { label: "Critical", color: "#EF4444", bg: "#FEF2F2", border: "#FCA5A5" },
  high:     { label: "High",     color: "#F97316", bg: "#FFF7ED", border: "#FDBA74" },
  medium:   { label: "Medium",   color: "#F59E0B", bg: "#FFFBEB", border: "#FCD34D" },
  low:      { label: "Low",      color: "#10B981", bg: "#F0FDF4", border: "#6EE7B7" },
};

const CATEGORIES = [
];

const DEPARTMENTS = [
  "Finance", "IT", "Legal & Compliance", "HR", "Operations",
  "Marketing", "Sales", "Executive", "R&D",
];

const TREATMENT_OPTIONS = ["Accept", "Mitigate", "Transfer", "Avoid"];

const getRiskLevel = (p, i) => {
  const s = p * i;
  if (s >= 16) return "critical";
  if (s >= 9)  return "high";
  if (s >= 4)  return "medium";
  return "low";
};

const RiskBadge = ({ level }) => {
  const cfg = RISK_LEVELS[level];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      padding: "2px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    "open": { label: "Open", color: C.warning, bg: "#FFF7ED"  },
    "in-progress": { label: "In Progress", color: C.primary, bg: "#EFF6FF" },
    "closed": { label: "Closed", color: C.success, bg: "#ECFDF5" },
  };
    
  
  const cfg = statusConfig[status];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const CatBadge = ({ catId }) => {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
      background: cat.color + "18", color: cat.color,
      border: `1px solid ${cat.color}33`,
      fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
    }}>
       {cat.label}
    </span>
  );
};

const ScoreCircle = ({ probability, impact }) => {
  const score = probability * impact;
  const level = getRiskLevel(probability, impact);
  const cfg = RISK_LEVELS[level];
  return (
    <div style={{
      width: 52, height: 52, borderRadius: "50%",
      background: cfg.bg, border: `2.5px solid ${cfg.color}`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 9, color: cfg.color, fontWeight: 600, opacity: 0.8 }}>/ 25</div>
    </div>
  );
};

const Chip = ({ label, color = C.primary, bg = C.borderLight }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
    background: bg, color, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
  }}>
    {label}
  </span>
);

// ─────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(15,26,62,0.5)", backdropFilter: "blur(5px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div style={{
      background: C.surface, borderRadius: 16,
      width: wide ? "min(760px,97vw)" : "min(600px,95vw)",
      maxHeight: "92vh", overflowY: "auto",
      boxShadow: "0 24px 64px rgba(59,111,255,0.18)",
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        padding: "18px 26px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, background: C.surface, zIndex: 1,
      }}>
        <h2 style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 19, color: C.text, fontWeight: 700 }}>
          {title}
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted }}>×</button>
      </div>
      <div style={{ padding: 26 }}>{children}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// BLANK FORM
// ─────────────────────────────────────────────────────────────────
const blankRisk = () => ({
  title: "", description: "",
  category: "operational", department: "IT",
  owner: "", dueDate: "",
  probability: 3, impact: 3,
  status: "open", treatment: "Mitigate",
  mitigationPlan: "",
  createdAt: new Date().toISOString().split("T")[0],
});

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function BusinessRisks() {
  const [risks, setRisks] = useState([]);
  const [openRiskId, setOpenRiskId] = useState();
  const [modal, setModal] = useState();
  const [form, setForm] = useState(blankRisk());
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc");

  // ── derived
  const filteredRisks = useMemo(() => {
  const safeRisks = Array.isArray(risks) ? risks : [];

  let list = safeRisks.filter(r => {
    const level = getRiskLevel(r.probability, r.impact);

    const matchSearch =
      (r.title || "").toLowerCase().includes(search.toLowerCase().trim()) ||
      (r.owner || "").toLowerCase().includes(search.toLowerCase().trim()) ||
      (r.department || "").toLowerCase().includes(search.toLowerCase().trim());

    const matchCat = catFilter === "all" || r.category === catFilter;
    const matchStat = statFilter === "all" || r.status === statFilter;
    const matchRisk = riskFilter === "all" || level === riskFilter;

    return matchSearch && matchCat && matchStat && matchRisk;
  });

  return [...list].sort((a, b) => {
    const sA = a.probability * a.impact;
    const sB = b.probability * b.impact;

    if (sortBy === "score-desc") return sB - sA;
    if (sortBy === "score-asc") return sA - sB;
    if (sortBy === "date-asc") return new Date(a.dueDate) - new Date(b.dueDate);
    if (sortBy === "date-desc") return new Date(b.dueDate) - new Date(a.dueDate);
    if (sortBy === "title") return a.title.localeCompare(b.title);

    return 0;
  });
}, [risks, search, catFilter, statFilter, riskFilter, sortBy]);
  const kpi = useMemo(() => {
  const safeRisks = Array.isArray(risks) ? risks : [];

  const allLevels = safeRisks.map(r => getRiskLevel(r.probability, r.impact));

  return {
    total: safeRisks.length,
    critical: allLevels.filter(l => l === "critical").length,
    high: allLevels.filter(l => l === "high").length,
    open: safeRisks.filter(r => r.status === "open").length,
    inProg: safeRisks.filter(r => r.status === "in-progress").length,
    closed: safeRisks.filter(r => r.status === "closed").length,
  };
}, [risks]);
  // ── category breakdown for mini bar
  const catBreakdown = useMemo(() => {
  const safeRisks = Array.isArray(risks) ? risks : [];

  return CATEGORIES.map(cat => ({
    ...cat,
    count: safeRisks.filter(r => r.category === cat.id).length,
  }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
}, [risks]);
  // ── CRUD
  
  const openEdit = (risk, e) => {
    e?.stopPropagation();
    setForm({ ...risk });
    setEditId(risk.id);
    setModal("edit");
  };
  const confirmDelete = (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
    setModal("delete");
  };
  
  const doDelete = async () => {
  await fetch(`http://localhost:3000/api/businessRisks/${deleteId}`, {
    method: "DELETE",
    credentials:'include',
  });

  setRisks(prev => prev.filter(r => r.id !== deleteId));
  setModal(null);
};

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const currentScore = form.probability * form.impact;
  const currentLevel = getRiskLevel(form.probability, form.impact);

  // ── styles
  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${C.border}`,
    fontFamily: "'DM Sans',sans-serif", fontSize: 14,
    color: C.text, background: C.bg, boxSizing: "border-box", outline: "none",
  };
  const lbl = {
    display: "block", fontSize: 11, fontWeight: 700, color: C.muted,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6,
    fontFamily: "'DM Sans',sans-serif",
  };
  const btnPrimary = {
    background: `linear-gradient(135deg,${C.primary},${C.purple})`,
    color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 20px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14,
  };
  const btnGhost = {
    background: "none", color: C.primary, border: `1.5px solid ${C.primary}`,
    borderRadius: 8, padding: "7px 16px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13,
  };
  const iconBtn = {
    background: "none", border: `1px solid ${C.border}`,
    borderRadius: 7, cursor: "pointer", padding: "4px 8px",
    color: C.muted, fontSize: 13, lineHeight: 1,
  };

  const filterBtn = (active) => ({
    borderRadius: 7, padding: "6px 13px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12,
    border: `1.5px solid ${active ? C.primary : C.border}`,
    background: active ? `linear-gradient(135deg,${C.primary},${C.purple})` : C.bg,
    color: active ? "#fff" : C.muted,
    whiteSpace: "nowrap",
  });
  // Dans BusinessRisks.js, modifiez les appels API :

// Remplacer /api/businessRisks par /api/risks/getrisks
useEffect(() => {
  fetch("http://localhost:3000/api/risks/getrisks")
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        // Convertir les données du format risks vers le format business_risks
        const mappedRisks = data.map(risk => ({
          id: risk.id,
          title: risk.intitule,
          description: risk.description,
          category: risk.categorie,
          department: risk.actif, // ou autre mapping
          owner: risk.owner,
          dueDate: risk.dueDate,
          probability: risk.probabilite + 1, // Convertir 0-4 vers 1-5
          impact: risk.impact + 1,
          status: risk.statut === "Open" ? "open" : 
                  risk.statut === "In progress" ? "in-progress" : "closed",
          treatment: "Mitigate",
          mitigationPlan: risk.MitigationPlan,
          createdAt: risk.createdAt
        }));
        setRisks(mappedRisks);
      }
    })
    .catch(err => console.error(err));
}, []);
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:6px;}
        @keyframes expand{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 28px", fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.4 }}>
              Business Risk Register
            </h1>
            <p style={{ margin: "5px 0 0", color: C.muted, fontSize: 14 }}>
              Identify, assess and track enterprise-level business risks across all departments.
            </p>
          </div>
          
        </div>

        {/* ── KPI STRIP ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 13, marginBottom: 24 }}>
          {[
            
          ].map(k => (
            <div key={k.label} style={{
              background: C.surface, borderRadius: 12, padding: "14px 18px",
              border: `1px solid ${C.border}`, boxShadow: C.shadow,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── CATEGORY BREAKDOWN BAR ─────────────────────────────── */}
        {catBreakdown.length > 0 && (
          <div style={{
            background: C.surface, borderRadius: 12, padding: "14px 20px",
            border: `1px solid ${C.border}`, marginBottom: 20,
            display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
              By Category
            </div>
            {catBreakdown.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 100 }}>
                <span style={{ fontSize: 15 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{cat.count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: C.border, width: 90, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, background: cat.color,
                      width: `${(cat.count / risks.length) * 100}%`,
                      transition: "width .4s",
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FILTERS ────────────────────────────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 12, padding: "14px 18px",
          border: `1px solid ${C.border}`, marginBottom: 22,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <input
              placeholder="🔍 Search by title, owner, department…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, width: 300, flex: "0 0 auto" }}
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: 200, flex: "0 0 auto" }}>
              <option value="score-desc">Score: Highest first</option>
              <option value="score-asc">Score: Lowest first</option>
              <option value="date-asc">Due date: Soonest</option>
              <option value="date-desc">Due date: Latest</option>
              <option value="title">Title A–Z</option>
            </select>
            {(search || catFilter !== "all" || statFilter !== "all" || riskFilter !== "all") && (
              <button onClick={() => { setSearch(""); setCatFilter("all"); setStatFilter("all"); setRiskFilter("all"); }}
                style={{ ...btnGhost, fontSize: 12, padding: "6px 12px" }}>Clear all</button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted, fontWeight: 600 }}>
              {filteredRisks.length} / {risks.length} risks
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={filterBtn(catFilter === "all")} onClick={() => setCatFilter("all")}>All Categories</button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} style={filterBtn(catFilter === cat.id)} onClick={() => setCatFilter(cat.id)}>
                 {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {[
              
            ].map(s => (
              <button key={s.val} style={filterBtn(statFilter === s.val)} onClick={() => setStatFilter(s.val)}>{s.label}</button>
            ))}
            <div style={{ width: 1, background: C.border, margin: "0 4px" }} />
            {["all", "critical", "high", "medium", "low"].map(l => (
              <button key={l} style={filterBtn(riskFilter === l)} onClick={() => setRiskFilter(l)}>
                {l === "all" ? "All Levels" : RISK_LEVELS[l].label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RISK LIST WITH INTEGRATED PANEL ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredRisks.length === 0 && (
            <div style={{
              background: C.surface, borderRadius: 12, padding: "52px 0",
              textAlign: "center", color: C.muted,
              border: `1px solid ${C.border}`, fontSize: 14,
            }}>No business risks match the current filters.</div>
          )}

          {filteredRisks.map(risk => {
            const level = getRiskLevel(risk.probability, risk.impact);
            const cfg = RISK_LEVELS[level];
            const isOpen = openRiskId === risk.id;
            const isOverdue = risk.status !== "closed" && risk.dueDate && new Date(risk.dueDate) < new Date();

            return (
              <div
                key={risk.id}
                style={{
                  background: C.surface,
                  borderRadius: 14,
                  border: `2px solid ${isOpen ? C.primary : C.border}`,
                  overflow: "hidden",
                  transition: "all .2s",
                  boxShadow: isOpen ? `0 4px 12px ${C.primary}20` : C.shadow,
                }}
              >
                {/* Header - Clickable area */}
                <div
                  onClick={() => setOpenRiskId(isOpen ? null : risk.id)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    background: isOpen ? `linear-gradient(to right, ${C.primary}08, transparent)` : C.surface,
                    borderLeft: `4px solid ${cfg.color}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                      <ScoreCircle probability={risk.probability} impact={risk.impact} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.3 }}>{risk.title}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {risk.description}
                        </div>
                        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap", alignItems: "center" }}>
                          <CatBadge catId={risk.category} />
                          <RiskBadge level={level} />
                          <StatusBadge status={risk.status} />
                          {isOverdue && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                              background: "#FEF2F2", color: C.danger, border: `1px solid #FCA5A5`,
                            }}>⚠ Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={e => openEdit(risk, e)} style={iconBtn} title="Edit">✏️</button>
                        <button onClick={e => confirmDelete(risk.id, e)} style={iconBtn} title="Delete">🗑</button>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>👤 {risk.owner}</div>
                        <div style={{ fontSize: 11, color: isOverdue ? C.danger : C.muted, fontWeight: 600, marginTop: 2 }}>
                          📅 {risk.dueDate || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>🏢 {risk.department}</div>
                      </div>
                      <div style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .2s",
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 6L8 10L12 6" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Panel - Integrated inside the card, visible when open */}
                {isOpen && (
                  <div style={{
                    padding: "0 20px 20px 20px",
                    borderTop: `1px solid ${C.borderLight || C.border}`,
                    background: `linear-gradient(135deg, ${C.primary}02, ${C.purple}02)`,
                    animation: "expand .25s ease-out"
                  }}>
                    <div style={{ marginTop: 20 }}>
                      {/* Description */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>Description</div>
                        <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{risk.description || "—"}</p>
                      </div>

                      

                      {/* Meta grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                        {[
                          { label: "Department", value: risk.department },
                          { label: "Owner", value: risk.owner || "—" },
                          { label: "Due Date", value: risk.dueDate || "—", danger: isOverdue },
                          { label: "Treatment", value: risk.treatment },
                          { label: "Created", value: risk.createdAt || "—" },
                        ].map(m => (
                          <div key={m.label} style={{
                            background: C.bg, borderRadius: 8,
                            padding: "10px 12px", border: `1px solid ${C.border}`,
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: m.danger ? C.danger : C.text }}>{m.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Mitigation plan */}
                      {risk.mitigationPlan && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>Mitigation Plan</div>
                          <div style={{
                            background: "#F0FDF4", border: "1.5px solid #6EE7B7",
                            borderRadius: 10, padding: "12px 14px",
                            fontSize: 13, color: C.text, lineHeight: 1.6,
                          }}>
                            {risk.mitigationPlan}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ────────────────────────────────────── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Add Business Risk" : "Edit Business Risk"} onClose={() => setModal(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Title *</label>
              <input style={inp} placeholder="e.g. GDPR Non-Compliance Fine"
                value={form.title} onChange={e => setF("title", e.target.value)} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }}
                placeholder="Describe the risk scenario and its context…"
                value={form.description} onChange={e => setF("description", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select style={inp} value={form.category} onChange={e => setF("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}> {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Department</label>
              <select style={inp} value={form.department} onChange={e => setF("department", e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Risk Owner</label>
              <input style={inp} placeholder="Full name"
                value={form.owner} onChange={e => setF("owner", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Due Date</label>
              <input type="date" style={inp} value={form.dueDate} onChange={e => setF("dueDate", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Probability — {form.probability} / 5</label>
              <input type="range" min={1} max={5} value={form.probability}
                onChange={e => setF("probability", +e.target.value)}
                style={{ width: "100%", accentColor: C.primary }} />
            </div>
            <div>
              <label style={lbl}>Impact — {form.impact} / 5</label>
              <input type="range" min={1} max={5} value={form.impact}
                onChange={e => setF("impact", +e.target.value)}
                style={{ width: "100%", accentColor: C.purple }} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{
                background: RISK_LEVELS[currentLevel].bg,
                border: `1.5px solid ${RISK_LEVELS[currentLevel].border}`,
                borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <ScoreCircle probability={form.probability} impact={form.impact} />
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Risk Score Preview</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: RISK_LEVELS[currentLevel].color, marginTop: 2 }}>
                    {currentScore} / 25 — <RiskBadge level={currentLevel} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => setF("status", e.target.value)}>
                <option value="open">🔴 Open</option>
                <option value="in-progress">🟡 In Progress</option>
                <option value="closed">🟢 Closed</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Treatment</label>
              <select style={inp} value={form.treatment} onChange={e => setF("treatment", e.target.value)}>
                {TREATMENT_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Mitigation / Treatment Plan</label>
              <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }}
                placeholder="Describe the action plan to reduce or manage this risk…"
                value={form.mitigationPlan} onChange={e => setF("mitigationPlan", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={btnGhost} onClick={() => setModal(null)}>Cancel</button>
            
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ──────────────────────────────────────── */}
      {modal === "delete" && (
        <Modal title="Delete Business Risk" onClose={() => setModal(null)}>
          <p style={{ margin: "0 0 24px", color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete this business risk? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={btnGhost} onClick={() => setModal(null)}>Cancel</button>
            <button style={{ ...btnPrimary, background: C.danger }} onClick={doDelete}>Delete permanently</button>
          </div>
        </Modal>
      )}
    </>
  );
}