import { useState, useEffect } from "react";
import { ShieldCheck, Clock, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// BACKEND HOOK — replace setTimeout with fetch("/api/dashboard")
// ─────────────────────────────────────────────────────────────────
function useDashboardData() {
  const [data, setData]       = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fetch("/api/dashboard").then(r=>r.json()).then(setData).finally(()=>setLoading(false));
    setTimeout(() => { setData(EMPTY_DATA); setLoading(false); }, 500);
  }, []);

  return { data, loading };
}

// ─────────────────────────────────────────────────────────────────
// STANDARDS
// ─────────────────────────────────────────────────────────────────
const NORMS = [
  { id: "iso27001", name: "ISO/IEC 27001:2022",  shortName: "ISO 27001", desc: "Information security",  color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE" },
  { id: "nist",     name: "NIST CSF 2.0",         shortName: "NIST CSF",  desc: "Cybersecurity Framework",    color: "#0F766E", bg: "#F0FDFA", border: "#99F6E4" },
  { id: "iso22301", name: "ISO/IEC 22301:2019",   shortName: "ISO 22301", desc: "Business continuity",      color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
];

// ─────────────────────────────────────────────────────────────────
// DEFAULT STATE
// ─────────────────────────────────────────────────────────────────
const EMPTY_DATA = {
  kpis: { globalScore: 0, lastAuditDays: 0 },
  norms: [
    { id: "iso27001", score: 0, trend: 0 },
    { id: "nist",     score: 0, trend: 0 },
    { id: "iso22301", score: 0, trend: 0 },
  ],
  actions: [],
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const PRIORITY = {
  Critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  High:    { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  Medium:  { color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE" },
  Low:   { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
};

function scoreColor(score) {
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

function TrendBadge({ trend }) {
  if (trend > 0) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:700, color:"#16A34A", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:20, padding:"2px 9px" }}>
      <TrendingUp size={10}/> +{trend}%
    </span>
  );
  if (trend < 0) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:700, color:"#DC2626", background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:20, padding:"2px 9px" }}>
      <TrendingDown size={10}/> {trend}%
    </span>
  );
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:600, color:"#94A3B8", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:20, padding:"2px 9px" }}>
      <Minus size={10}/> 0%
    </span>
  );
}

function CircleProgress({ score, color, size = 80 }) {
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={6}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition:"stroke-dashoffset 1s ease" }}
      />
      <text x={size/2} y={size/2+5} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{score}%</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, loading } = useDashboardData();
  const [activeNorm, setActiveNorm] = useState("all");

  const kpis          = data.kpis;
  const actions       = data.actions;
  const normDataById  = Object.fromEntries(data.norms.map(n => [n.id, n]));

  const filteredActions = activeNorm === "all"
    ? actions
    : actions.filter(a => a.norm === activeNorm);

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100%", paddingBottom:40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .fade { animation: fadeUp .3s ease both; }
        .norm-card { transition: box-shadow .2s, transform .2s; }
        .norm-card:hover { box-shadow:0 8px 32px rgba(59,111,255,0.13) !important; transform:translateY(-2px) !important; }
        .action-row { transition: box-shadow .15s, transform .15s; }
        .action-row:hover { box-shadow:0 4px 20px rgba(59,111,255,0.1) !important; transform:translateY(-1px); }
        .norm-tab:hover { background:#EEF4FF !important; color:#3B6FFF !important; border-color:#DBEAFE !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"'Fraunces', serif" }}>
            GRC Dashboard
          </h1>
          <p style={{ color:"#94A3B8", margin:"4px 0 0", fontSize:13, fontWeight:400 }}>
            Consolidated view of compliance and priority actions
          </p>
        </div>
      </div>

      {/* ── TOP KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:22 }}>

        {/* Overall compliance */}
        <div className="fade norm-card" style={{
          background:"#fff", border:"1px solid #F1F5F9", borderRadius:14,
          padding:"22px 26px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
          display:"flex", alignItems:"center", gap:22, animationDelay:"0s",
        }}>
          <div style={{
            width:56, height:56, borderRadius:13,
            background:"linear-gradient(135deg,#3B6FFF,#6D28D9)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            boxShadow:"0 6px 20px rgba(59,111,255,0.28)",
          }}>
            <ShieldCheck size={24} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Overall compliance
            </div>
            <div style={{ fontSize:36, fontWeight:800, color:scoreColor(kpis.globalScore), lineHeight:1, fontFamily:"'Fraunces', serif" }}>
              {kpis.globalScore}<span style={{ fontSize:17, fontWeight:600 }}>%</span>
            </div>
            <div style={{ marginTop:10, height:4, borderRadius:3, background:"#F1F5F9", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${kpis.globalScore}%`, background:`linear-gradient(90deg,#3B6FFF,#6D28D9)`, borderRadius:3, transition:"width 1s ease" }}/>
            </div>
            <div style={{ fontSize:11, color:"#CBD5E1", marginTop:5 }}>Weighted average — all standards combined</div>
          </div>
        </div>

        {/* Last audit */}
        <div className="fade norm-card" style={{
          background:"#fff", border:"1px solid #F1F5F9", borderRadius:14,
          padding:"22px 26px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
          display:"flex", alignItems:"center", gap:22, animationDelay:"0.07s",
        }}>
          <div style={{
            width:56, height:56, borderRadius:13,
            background:"#EEF4FF",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            border:"1.5px solid #DBEAFE",
          }}>
            <Clock size={24} color="#3B6FFF"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Last audit
            </div>
            <div style={{ fontSize:36, fontWeight:800, color:"#3B6FFF", lineHeight:1, fontFamily:"'Fraunces', serif" }}>
              {kpis.lastAuditDays}
              <span style={{ fontSize:14, fontWeight:500, color:"#94A3B8", marginLeft:6 }}>days</span>
            </div>
            <div style={{ marginTop:10 }}>
              <span style={{
                fontSize:11, fontWeight:700, padding:"3px 11px", borderRadius:20,
                background: kpis.lastAuditDays <= 30 ? "#F0FDF4" : kpis.lastAuditDays <= 90 ? "#FFFBEB" : "#FEF2F2",
                color:      kpis.lastAuditDays <= 30 ? "#16A34A" : kpis.lastAuditDays <= 90 ? "#D97706" : "#DC2626",
                border:     `1px solid ${kpis.lastAuditDays <= 30 ? "#BBF7D0" : kpis.lastAuditDays <= 90 ? "#FDE68A" : "#FCA5A5"}`,
              }}>
                {kpis.lastAuditDays <= 30 ? "Recent" : kpis.lastAuditDays <= 90 ? "Needs planning" : "Audit required"}
              </span>
            </div>
            <div style={{ fontSize:11, color:"#CBD5E1", marginTop:7 }}>Days since last completed audit</div>
          </div>
        </div>
      </div>

      {/* ── COMPLIANCE BY STANDARD ── */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:14, textTransform:"uppercase", letterSpacing:"0.07em" }}>
          Compliance by standard
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {NORMS.map((normMeta, i) => {
            const nd = normDataById[normMeta.id] || { score:0, trend:0 };
            const sc = scoreColor(nd.score);
            return (
              <div key={normMeta.id} className="fade norm-card" style={{
                background:"#fff", border:"1px solid #F1F5F9",
                borderRadius:14, padding:"20px 22px",
                boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
                display:"flex", flexDirection:"column", gap:14,
                animationDelay:`${0.1 + i * 0.07}s`,
              }}>
                {/* Header standard */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:normMeta.color }}>{normMeta.shortName}</div>
                    <div style={{ fontSize:10, color:"#CBD5E1", marginTop:2 }}>{normMeta.name}</div>
                    <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{normMeta.desc}</div>
                  </div>
                  <div style={{
                    width:34, height:34, borderRadius:9,
                    background:normMeta.bg, border:`1.5px solid ${normMeta.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                    boxShadow:`0 3px 10px ${normMeta.color}22`,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={normMeta.color} strokeWidth="2" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                </div>

                {/* Circle + trend */}
                <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                  <CircleProgress score={nd.score} color={sc} size={72}/>
                  <div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginBottom:7, fontWeight:500 }}>Monthly change</div>
                    <TrendBadge trend={nd.trend}/>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height:4, borderRadius:3, background:"#F1F5F9", overflow:"hidden" }}>
                  <div style={{
                    height:"100%", width:`${nd.score}%`,
                    background:`linear-gradient(90deg,${normMeta.color}88,${normMeta.color})`,
                    borderRadius:3, transition:"width 1s ease",
                  }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PRIORITY ACTIONS ── */}
      <div style={{
        background:"#fff", border:"1px solid #F1F5F9", borderRadius:14,
        padding:"22px 24px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", textTransform:"uppercase", letterSpacing:"0.07em" }}>
            Priority actions
          </div>
          {actions.length > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color:"#3B6FFF", background:"#EEF4FF", border:"1.5px solid #DBEAFE", borderRadius:20, padding:"3px 12px" }}>
              {actions.length} action{actions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ fontSize:12, color:"#CBD5E1", marginBottom:18, fontWeight:400 }}>
          Remediation plans sorted by priority
        </div>

        {/* Standard filters */}
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          {["all", ...NORMS.map(n => n.id)].map(id => {
            const norm   = NORMS.find(n => n.id === id);
            const active = activeNorm === id;
            return (
              <button key={id} className="norm-tab"
                onClick={() => setActiveNorm(id)}
                style={{
                  padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                  border:`1.5px solid ${active ? "#3B6FFF" : "#E2E8F0"}`,
                  background: active ? "#EEF4FF" : "#fff",
                  color: active ? "#3B6FFF" : "#64748B",
                  cursor:"pointer", transition:"all .15s", fontFamily:"inherit",
                  boxShadow: active ? "0 2px 8px rgba(59,111,255,0.12)" : "none",
                }}>
                {id === "all" ? "All standards" : norm?.shortName}
              </button>
            );
          })}
        </div>

        {filteredActions.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"52px 0", gap:12 }}>
            <div style={{
              width:52, height:52, borderRadius:13,
              background:"#EEF4FF", border:"1.5px solid #DBEAFE",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 4px 14px rgba(59,111,255,0.1)",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DBEAFE" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#CBD5E1" }}>No actions at the moment</div>
            <div style={{ fontSize:12, color:"#E2E8F0", textAlign:"center", maxWidth:300 }}>
              Remediation actions will appear here once the backend is connected
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filteredActions.map(action => {
              const p        = PRIORITY[action.priority] || PRIORITY["Low"];
              const normInfo = NORMS.find(n => n.id === action.norm);
              return (
                <div key={action.id} className="action-row" style={{
                  display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                  borderRadius:12, border:`1px solid ${p.border}`, background:p.bg,
                }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0F172A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {action.title}
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
                      {normInfo && (
                        <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:5, background:normInfo.bg, color:normInfo.color, border:`1px solid ${normInfo.border}` }}>
                          {normInfo.shortName}
                        </span>
                      )}
                      {action.owner   && <span style={{ fontSize:11, color:"#CBD5E1" }}>{action.owner}</span>}
                      {action.dueDate && <span style={{ fontSize:11, color:"#CBD5E1" }}>{action.dueDate}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 11px", borderRadius:7, background:p.color+"18", color:p.color, flexShrink:0, border:`1px solid ${p.border}` }}>
                    {action.priority}
                  </span>
                  <ChevronRight size={14} color="#E2E8F0"/>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}