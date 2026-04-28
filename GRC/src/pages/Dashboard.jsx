// src/pages/Dashboard.jsx
//
// Pulls real KPIs from /api/dashboard/overview :
//   - global compliance % = score of the latest analysis (any standard)
//   - per-standard score  = score of the latest analysis FOR THAT STANDARD
//   - per-standard trend  = current minus previous score
//
// Style 100% identical to your original.

import { useState, useEffect } from "react";
import { ShieldCheck, Clock, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

const API_BASE = "http://localhost:3000/api/dashboard";

// Standards displayed (the id MUST match what you store in compliance_analyses.standard_id;
// most likely: "international_standard_iso_iec_27001_2022" – adapt if your IDs differ)
const NORMS = [
  { id: "international_standard_iso_iec_27001_2022", name: "ISO/IEC 27001:2022",  shortName: "ISO 27001", desc: "Information security",     color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE" },
  { id: "nist_csf_2_0",                              name: "NIST CSF 2.0",        shortName: "NIST CSF",  desc: "Cybersecurity Framework",  color: "#0F766E", bg: "#F0FDFA", border: "#99F6E4" },
  { id: "international_standard_iso_iec_22301_2019", name: "ISO/IEC 22301:2019",  shortName: "ISO 22301", desc: "Business continuity",      color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
];

const PRIORITY = {
  Critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  High:     { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  Medium:   { color: "#3B6FFF", bg: "#EEF4FF", border: "#DBEAFE" },
  Low:      { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
};

function scoreColor(s) { return s >= 75 ? "#16A34A" : s >= 50 ? "#D97706" : "#DC2626"; }

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
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}/>
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{score}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState({ globalScore: 0, lastAuditDays: 999, standards: [] });
  const [actions, setActions]   = useState([]);
  const [activeNorm, setActiveNorm] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/overview`),
          fetch(`${API_BASE}/priority-actions`),
        ]);
        const ov = await oRes.json();
        const ac = await aRes.json();
        setOverview(ov || { globalScore: 0, lastAuditDays: 999, standards: [] });
        setActions(Array.isArray(ac) ? ac.map(x => ({
          id: x.id, title: x.action, priority: x.priority || "Medium",
          owner: x.assigned_to, dueDate: x.due_date, norm: x.norm,
        })) : []);
      } catch (e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  const standardsById = Object.fromEntries((overview.standards || []).map(s => [s.standard_id, s]));
  const filteredActions = activeNorm === "all" ? actions : actions.filter(a => a.norm === activeNorm);

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100%", paddingBottom:40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade { animation: fadeUp .3s ease both; }
        .norm-card { transition: box-shadow .2s, transform .2s; }
        .norm-card:hover { box-shadow:0 8px 32px rgba(59,111,255,0.13) !important; transform:translateY(-2px) !important; }
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:28, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"'Fraunces',serif" }}>GRC Dashboard</h1>
          <p style={{ color:"#94A3B8", margin:"4px 0 0", fontSize:13 }}>
            Consolidated view of compliance and priority actions
          </p>
        </div>
      </div>

      {/* TOP KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:22 }}>
        <div className="fade norm-card" style={{ background:"#fff", border:"1px solid #F1F5F9", borderRadius:14, padding:"22px 26px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:22 }}>
          <div style={{ width:56, height:56, borderRadius:13, background:"linear-gradient(135deg,#3B6FFF,#6D28D9)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 6px 20px rgba(59,111,255,0.28)" }}>
            <ShieldCheck size={24} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Overall compliance</div>
            <div style={{ fontSize:36, fontWeight:800, color:scoreColor(overview.globalScore), lineHeight:1, fontFamily:"'Fraunces',serif" }}>
              {overview.globalScore}<span style={{ fontSize:17, fontWeight:600 }}>%</span>
            </div>
            <div style={{ marginTop:10, height:4, borderRadius:3, background:"#F1F5F9", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${overview.globalScore}%`, background:"linear-gradient(90deg,#3B6FFF,#6D28D9)", borderRadius:3, transition:"width 1s ease" }}/>
            </div>
            <div style={{ fontSize:11, color:"#CBD5E1", marginTop:5 }}>Score from the latest finalized analysis</div>
          </div>
        </div>

        <div className="fade norm-card" style={{ background:"#fff", border:"1px solid #F1F5F9", borderRadius:14, padding:"22px 26px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:22 }}>
          <div style={{ width:56, height:56, borderRadius:13, background:"#EEF4FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1.5px solid #DBEAFE" }}>
            <Clock size={24} color="#3B6FFF"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Last analysis</div>
            <div style={{ fontSize:36, fontWeight:800, color:"#3B6FFF", lineHeight:1, fontFamily:"'Fraunces',serif" }}>
              {overview.lastAuditDays}<span style={{ fontSize:14, fontWeight:500, color:"#94A3B8", marginLeft:6 }}>days</span>
            </div>
            <div style={{ marginTop:10 }}>
              <span style={{
                fontSize:11, fontWeight:700, padding:"3px 11px", borderRadius:20,
                background: overview.lastAuditDays <= 30 ? "#F0FDF4" : overview.lastAuditDays <= 90 ? "#FFFBEB" : "#FEF2F2",
                color:      overview.lastAuditDays <= 30 ? "#16A34A" : overview.lastAuditDays <= 90 ? "#D97706" : "#DC2626",
                border:     `1px solid ${overview.lastAuditDays <= 30 ? "#BBF7D0" : overview.lastAuditDays <= 90 ? "#FDE68A" : "#FCA5A5"}`,
              }}>
                {overview.lastAuditDays <= 30 ? "Recent" : overview.lastAuditDays <= 90 ? "Needs planning" : "Audit required"}
              </span>
            </div>
            <div style={{ fontSize:11, color:"#CBD5E1", marginTop:7 }}>Days since last finalized analysis</div>
          </div>
        </div>
      </div>

      {/* COMPLIANCE BY STANDARD */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:14, textTransform:"uppercase", letterSpacing:"0.07em" }}>Compliance by standard</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {NORMS.map((meta, i) => {
            const nd = standardsById[meta.id] || { score: 0, trend: 0 };
            const sc = scoreColor(nd.score);
            return (
              <div key={meta.id} className="fade norm-card" style={{ background:"#fff", border:"1px solid #F1F5F9", borderRadius:14, padding:"20px 22px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)", display:"flex", flexDirection:"column", gap:14, animationDelay:`${0.1 + i * 0.07}s` }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:meta.color }}>{meta.shortName}</div>
                    <div style={{ fontSize:10, color:"#CBD5E1", marginTop:2 }}>{meta.name}</div>
                    <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{meta.desc}</div>
                  </div>
                  <div style={{ width:34, height:34, borderRadius:9, background:meta.bg, border:`1.5px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                  <CircleProgress score={nd.score} color={sc} size={72}/>
                  <div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginBottom:7, fontWeight:500 }}>Change vs previous</div>
                    <TrendBadge trend={nd.trend}/>
                  </div>
                </div>
                <div style={{ height:4, borderRadius:3, background:"#F1F5F9", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${nd.score}%`, background:`linear-gradient(90deg,${meta.color}88,${meta.color})`, borderRadius:3, transition:"width 1s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRIORITY ACTIONS */}
      <div style={{ background:"#fff", border:"1px solid #F1F5F9", borderRadius:14, padding:"22px 24px", boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", textTransform:"uppercase", letterSpacing:"0.07em" }}>Priority actions</div>
          {actions.length > 0 && (
            <span style={{ fontSize:12, fontWeight:700, color:"#3B6FFF", background:"#EEF4FF", border:"1.5px solid #DBEAFE", borderRadius:20, padding:"3px 12px" }}>
              {actions.length} action{actions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ fontSize:12, color:"#CBD5E1", marginBottom:18 }}>Remediation plans sorted by priority</div>

        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          {["all", ...NORMS.map(n => n.id)].map(id => {
            const norm = NORMS.find(n => n.id === id);
            const active = activeNorm === id;
            return (
              <button key={id} onClick={() => setActiveNorm(id)}
                style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                         border:`1.5px solid ${active ? "#3B6FFF" : "#E2E8F0"}`,
                         background: active ? "#EEF4FF" : "#fff",
                         color: active ? "#3B6FFF" : "#64748B",
                         cursor:"pointer", boxShadow: active ? "0 2px 8px rgba(59,111,255,0.12)" : "none" }}>
                {id === "all" ? "All standards" : norm?.shortName}
              </button>
            );
          })}
        </div>

        {filteredActions.length === 0 ? (
          <div style={{ textAlign:"center", padding:"52px 0", color:"#CBD5E1", fontSize:13, fontWeight:600 }}>
            No actions at the moment.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filteredActions.map(a => {
              const p = PRIORITY[a.priority] || PRIORITY["Low"];
              const norm = NORMS.find(n => n.id === a.norm);
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:12, border:`1px solid ${p.border}`, background:p.bg }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0F172A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {a.title}
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
                      {norm && <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:5, background:norm.bg, color:norm.color, border:`1px solid ${norm.border}` }}>{norm.shortName}</span>}
                      {a.owner && <span style={{ fontSize:11, color:"#94A3B8" }}>{a.owner}</span>}
                      {a.dueDate && <span style={{ fontSize:11, color:"#94A3B8" }}>{new Date(a.dueDate).toLocaleDateString("en-GB")}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 11px", borderRadius:7, background:p.color+"18", color:p.color, border:`1px solid ${p.border}` }}>
                    {a.priority}
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