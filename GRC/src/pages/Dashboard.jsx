// src/pages/Dashboard.jsx
//
// ✅ FIXES:
//  - Only norms that have actually been analysed are shown
//  - Each norm card shows the score of its LATEST finalized analysis
//  - Overall compliance = average of those latest scores
//  - Last analysis days = days since the most recent analysis (any norm)
//  - Priority actions correctly linked to their norm via standard_id

import { useState, useEffect } from "react";
import { ShieldCheck, Clock, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

const API_BASE = "http://localhost:3000/api/dashboard";

// ─── All known norms (metadata only). A card is rendered ONLY if the API
//     returns a matching standard_id in the standards[] array.
const NORM_META = {
  "international_standard_iso_iec_27001_2022": {
    name: "ISO/IEC 27001:2022", shortName: "ISO 27001",
    desc: "Information security",
    color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE",
  },
  "nist_csf_2_0": {
    name: "NIST CSF 2.0", shortName: "NIST CSF",
    desc: "Cybersecurity Framework",
    color: "#0F766E", bg: "#F0FDFA", border: "#99F6E4",
  },
  "international_standard_iso_iec_22301_2019": {
    name: "ISO/IEC 22301:2019", shortName: "ISO 22301",
    desc: "Business continuity",
    color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE",
  },
  // Add more norms here if needed — they will appear only when analysed
};

const PRIORITY = {
  Critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  High:     { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  Medium:   { color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE" },
  Low:      { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
};

function scoreColor(s) {
  return s >= 75 ? "#16A34A" : s >= 50 ? "#D97706" : "#DC2626";
}

function TrendBadge({ trend }) {
  if (trend > 0) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 20, padding: "2px 9px" }}>
      <TrendingUp size={10} /> +{trend}%
    </span>
  );
  if (trend < 0) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 20, padding: "2px 9px" }}>
      <TrendingDown size={10} /> {trend}%
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#94A3B8", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 20, padding: "2px 9px" }}>
      <Minus size={10} /> 0%
    </span>
  );
}

function CircleProgress({ score, color, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{score}%</text>
    </svg>
  );
}

// ─── Fallback metadata for unknown norm IDs (graceful degradation) ─────────
function getNormMeta(standardId) {
  if (NORM_META[standardId]) return NORM_META[standardId];
  // Unknown norm: derive a readable short name from the ID
  const parts = String(standardId || "").replace(/_/g, " ").split(" ");
  const shortName = parts.slice(-3).join(" ").toUpperCase().slice(0, 12);
  return {
    name: standardId, shortName,
    desc: "Compliance framework",
    color: "#475569", bg: "#F8FAFC", border: "#E2E8F0",
  };
}

export default function Dashboard() {
  const [overview, setOverview]     = useState({ globalScore: 0, lastAuditDays: 999, standards: [] });
  const [actions, setActions]       = useState([]);
  const [activeNorm, setActiveNorm] = useState("all");
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/overview`,          { credentials: "include" }),
          fetch(`${API_BASE}/priority-actions`,  { credentials: "include" }),
        ]);
        const ov = await oRes.json();
        const ac = await aRes.json();

        setOverview(ov || { globalScore: 0, lastAuditDays: 999, standards: [] });
        setActions(
          Array.isArray(ac)
            ? ac.map(x => ({
                id:       x.id,
                title:    x.action,
                priority: x.priority || "Medium",
                owner:    x.assigned_to,
                dueDate:  x.due_date,
                norm:     x.norm,   // standard_id from the JOIN
              }))
            : []
        );
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Only show norms that the API actually returned (i.e. have been analysed)
  const analysedStandards = overview.standards || [];

  // Filter actions by selected norm tab
  const filteredActions = activeNorm === "all"
    ? actions
    : actions.filter(a => a.norm === activeNorm);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "#94A3B8" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #E2E8F0", borderTop: "3px solid #3B6FFF", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13 }}>Loading dashboard…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .fade      { animation: fadeUp .3s ease both; }
        .norm-card { transition: box-shadow .2s, transform .2s; }
        .norm-card:hover { box-shadow:0 8px 32px rgba(59,111,255,0.13) !important; transform:translateY(-2px) !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, fontFamily: "'Fraunces',serif" }}>GRC Dashboard</h1>
          <p style={{ color: "#94A3B8", margin: "4px 0 0", fontSize: 13 }}>
            Consolidated view of compliance and priority actions
            {analysedStandards.length > 0 && (
              <span style={{ marginLeft: 8, color: "#3B6FFF", fontWeight: 600 }}>
                · {analysedStandards.length} norm{analysedStandards.length > 1 ? "s" : ""} analysed
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── TOP KPIs ────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>

        {/* Overall compliance */}
        <div className="fade norm-card" style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: "22px 26px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 20px rgba(59,111,255,0.28)" }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall compliance</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(overview.globalScore), lineHeight: 1, fontFamily: "'Fraunces',serif" }}>
              {overview.globalScore}<span style={{ fontSize: 17, fontWeight: 600 }}>%</span>
            </div>
            <div style={{ marginTop: 10, height: 4, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${overview.globalScore}%`, background: "linear-gradient(90deg,#3B6FFF,#6D28D9)", borderRadius: 3, transition: "width 1s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 5 }}>
              Average across {analysedStandards.length} analysed norm{analysedStandards.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Last analysis */}
        <div className="fade norm-card" style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: "22px 26px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "#EEF4FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #DBEAFE" }}>
            <Clock size={24} color="#3B6FFF" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last analysis</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#3B6FFF", lineHeight: 1, fontFamily: "'Fraunces',serif" }}>
              {overview.lastAuditDays === 999 ? "—" : overview.lastAuditDays}
              <span style={{ fontSize: 14, fontWeight: 500, color: "#94A3B8", marginLeft: 6 }}>
                {overview.lastAuditDays === 999 ? "No analysis yet" : "days ago"}
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
              {overview.lastAuditDays !== 999 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 20,
                  background: overview.lastAuditDays <= 30 ? "#F0FDF4" : overview.lastAuditDays <= 90 ? "#FFFBEB" : "#FEF2F2",
                  color:      overview.lastAuditDays <= 30 ? "#16A34A" : overview.lastAuditDays <= 90 ? "#D97706" : "#DC2626",
                  border:     `1px solid ${overview.lastAuditDays <= 30 ? "#BBF7D0" : overview.lastAuditDays <= 90 ? "#FDE68A" : "#FCA5A5"}`,
                }}>
                  {overview.lastAuditDays <= 30 ? "Recent" : overview.lastAuditDays <= 90 ? "Needs planning" : "Audit required"}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 7 }}>Days since last finalized analysis</div>
          </div>
        </div>
      </div>

      {/* ── COMPLIANCE BY STANDARD ──────────────────────────────────────── */}
      {analysedStandards.length > 0 ? (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Compliance by standard
          </div>
          {/* ✅ One card per analysed standard (not per hard-coded list) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(analysedStandards.length, 3)}, 1fr)`,
            gap: 14,
          }}>
            {analysedStandards.map((nd, i) => {
              const meta = getNormMeta(nd.standard_id);
              const sc   = scoreColor(nd.score);
              return (
                <div key={nd.standard_id} className="fade norm-card" style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14, animationDelay: `${0.1 + i * 0.07}s` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.shortName}</div>
                      <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 2 }}>{meta.name}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{meta.desc}</div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, border: `1.5px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <CircleProgress score={nd.score} color={sc} size={72} />
                    <div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 7, fontWeight: 500 }}>vs previous analysis</div>
                      <TrendBadge trend={nd.trend} />
                      {nd.last_at && (
                        <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 6 }}>
                          Last: {new Date(nd.last_at).toLocaleDateString("en-GB")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ height: 4, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${nd.score}%`, background: `linear-gradient(90deg,${meta.color}88,${meta.color})`, borderRadius: 3, transition: "width 1s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: "40px 24px", marginBottom: 22, textAlign: "center", color: "#94A3B8" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>No compliance analysis yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Run an analysis from the GRC Compliance page to see results here.</div>
        </div>
      )}

      {/* ── PRIORITY ACTIONS ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.07em" }}>Priority actions</div>
          {actions.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#3B6FFF", background: "#EEF4FF", border: "1.5px solid #DBEAFE", borderRadius: 20, padding: "3px 12px" }}>
              {actions.length} action{actions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 18 }}>Remediation plans sorted by priority</div>

        {/* Norm filter tabs — only show tabs for norms that have actions */}
        {actions.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {/* "All" tab */}
            <button onClick={() => setActiveNorm("all")}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                       border: `1.5px solid ${activeNorm === "all" ? "#3B6FFF" : "#E2E8F0"}`,
                       background: activeNorm === "all" ? "#EEF4FF" : "#fff",
                       color: activeNorm === "all" ? "#3B6FFF" : "#64748B",
                       boxShadow: activeNorm === "all" ? "0 2px 8px rgba(59,111,255,0.12)" : "none" }}>
              All standards
            </button>

            {/* One tab per norm that actually has at least one action */}
            {[...new Set(actions.map(a => a.norm).filter(Boolean))].map(normId => {
              const meta   = getNormMeta(normId);
              const active = activeNorm === normId;
              return (
                <button key={normId} onClick={() => setActiveNorm(normId)}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                           border: `1.5px solid ${active ? meta.color : "#E2E8F0"}`,
                           background: active ? meta.bg : "#fff",
                           color: active ? meta.color : "#64748B",
                           boxShadow: active ? `0 2px 8px ${meta.color}22` : "none" }}>
                  {meta.shortName}
                </button>
              );
            })}
          </div>
        )}

        {filteredActions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 0", color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
            {actions.length === 0 ? "No priority actions at the moment." : "No actions for this standard."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredActions.map(a => {
              const p    = PRIORITY[a.priority] || PRIORITY["Low"];
              const meta = a.norm ? getNormMeta(a.norm) : null;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, border: `1px solid ${p.border}`, background: p.bg }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.title}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                      {meta && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                          {meta.shortName}
                        </span>
                      )}
                      {a.owner   && <span style={{ fontSize: 11, color: "#94A3B8" }}>👤 {a.owner}</span>}
                      {a.dueDate && <span style={{ fontSize: 11, color: "#94A3B8" }}>📅 {new Date(a.dueDate).toLocaleDateString("en-GB")}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 7, background: `${p.color}18`, color: p.color, border: `1px solid ${p.border}`, flexShrink: 0 }}>
                    {a.priority}
                  </span>
                  <ChevronRight size={14} color="#E2E8F0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}