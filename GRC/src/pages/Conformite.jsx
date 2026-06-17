import { Trash2, Pencil, Check, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { startAnalysis, endAnalysis } from "./Settings"; // ajuste le chemin

const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  wow: "#3B6FFF", accentLight: "#EEF2FF",
  purple: "#6D28D9",
  success: "#16A34A", successLight: "#F0FDF4",
  warning: "#061585", warningLight: "#FFFBEB",
  danger:  "#DC2626", dangerLight:  "#FEF2F2",
  muted: "#64748B", mutedLight: "#F1F5F9",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 6px rgba(0,0,0,0.05)",
  shadowMd: "0 4px 14px rgba(0,0,0,0.08)",
  shadowLg: "0 20px 60px rgba(59,111,255,0.14)",
  Spin: "#0d2d85",
};
C.accent = `linear-gradient(135deg, ${C.wow}, ${C.warning})`;
const F = { display: "'Fraunces', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" };

const API_BASE     = "http://localhost:3000/api/ai";
const API_ANALYSIS = "http://localhost:3000/api/analyses";
const API_ASSETS   = "http://localhost:3000/api/analyses/assets";

const STATUS_META = {
  Covered:         { label: "Covered",        color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", icon: "", score: 100 },
  Partial:         { label: "Partial",        color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: "", score: 50 },
  "Not covered":   { label: "Not covered",    color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", icon: "", score: 0 },
  "Not applicable":{ label: "Not applicable", color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1", icon: "", score: null },
};
const RSSI_OPTIONS = ["Covered", "Partial", "Not covered"];

const ANALYSIS_PERSIST_KEY = "conformity_analysis_state_v14";
const ANALYSIS_RUNNING_KEY = "conformity_analysis_running_v14";

let ongoingAnalysis = null;

function loadPersistedAnalysis() {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_PERSIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function StepDot({ n, done, active }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: done ? C.success : active ? C.accent : C.accentLight,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: active ? `2px solid ${C.accent}` : "none",
      boxShadow: active ? "0 0 0 3px rgba(59,111,255,0.12)" : "none",
    }}>
      {done
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        : <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : C.textMuted }}>{n}</span>
      }
    </div>
  );
}

function StatusPill({ status, decision, big }) {
  const eff = decision || status;
  const s = STATUS_META[eff];
  if (!s) return null;
  const label = decision ? `CISO · ${decision}` : s.label;
  return (
    <span style={{
      fontSize: big ? 12 : 10, padding: big ? "3px 10px" : "2px 8px",
      borderRadius: 20, fontWeight: 700,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border || s.color}`,
      display: "inline-block", fontFamily: F.body,
    }}>{label}</span>
  );
}

function ConfBar({ value, color, width = 120 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width, height: 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color || C.wow, borderRadius: 99 }} />
      </div>
      <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{value}% compliance</span>
    </div>
  );
}

// ─── Asset multi-select ────────────────────────────────────────────────────
function AssetMultiSelect({ assets, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => assets.filter(a => (a.intitule || "").toLowerCase().includes(search.toLowerCase())), [assets, search]);
  const selected = assets.filter(a => selectedIds.includes(a.id));
  const toggle = (id) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ minHeight: 38, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {selected.length === 0 && <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>Select asset(s)…</span>}
        {selected.map(a => (
          <span key={a.id} style={{ background: C.accentLight, color: C.wow, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            {a.intitule}
            <X size={10} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle(a.id); }} />
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadowMd, maxHeight: 220, overflowY: "auto" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" autoFocus
            style={{ width: "100%", padding: "8px 10px", border: "none", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontFamily: F.body, outline: "none", background: C.surfaceAlt }}
          />
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.textMuted }}>
              {assets.length === 0 ? "No assets in database." : "No matches."}
            </div>
          )}
          {filtered.map(a => {
            const isSel = selectedIds.includes(a.id);
            return (
              <div key={a.id} onClick={() => toggle(a.id)} style={{ padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: isSel ? C.accentLight : "transparent", borderBottom: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={isSel} readOnly style={{ accentColor: C.wow }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.intitule}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>{a.type || "—"} {a.Location ? `· ${a.Location}` : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modals: Risks / Gaps / Mitigation ────────────────────────────────────
function RiskModal({ risks, assets, title, onSave, onClose }) {
  const [localRisks, setLocalRisks] = useState(risks);
  const getRiskColor = (impact, proba) => {
    const score = impact * proba;
    if (score <= 4)  return { bg: "#22c55e", label: "Low" };
    if (score <= 9)  return { bg: "#f59e0b", label: "Moderate" };
    if (score <= 16) return { bg: "#f97316", label: "High" };
    return                  { bg: "#ef4444", label: "Critical" };
  };
  const updateRisk = (id, patch) => setLocalRisks(p => p.map(x => x.id === id ? { ...x, ...patch } : x));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 760, maxWidth: "94vw", padding: "28px 30px", boxShadow: C.shadowLg, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text }}>Validate Risks</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, marginTop: 4 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>

        {localRisks.map((r, idx) => {
          const lvl = getRiskColor(r.impact || 1, r.probability || 1);
          const cls = r.riskClass || "asset";
          return (
            <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14, background: C.surfaceAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>Risk #{idx + 1}</span>
                <button onClick={() => setLocalRisks(p => p.filter(x => x.id !== r.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <textarea value={r.description} onChange={e => updateRisk(r.id, { description: e.target.value })} placeholder="Risk description…"
                style={{ width: "100%", minHeight: 60, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surface, outline: "none", marginBottom: 12 }}
              />
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Risk Classification</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[{v:"asset",l:"Asset Risk"},{v:"business",l:"Business Risk"},{v:"both",l:"Both"}].map(o => (
                    <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input type="radio" checked={cls === o.v} onChange={() => updateRisk(r.id, { riskClass: o.v })} style={{ accentColor: C.wow }} />
                      <span style={{ fontSize: 12, color: C.text }}>{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(cls === "asset" || cls === "both") && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Linked Assets</div>
                  <AssetMultiSelect assets={assets} selectedIds={r.asset_ids || []} onChange={ids => updateRisk(r.id, { asset_ids: ids })} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Impact (1-4)</div>
                  <select value={r.impact || 1} onChange={e => updateRisk(r.id, { impact: parseInt(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12 }}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Probability (1-4)</div>
                  <select value={r.probability || 1} onChange={e => updateRisk(r.id, { probability: parseInt(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12 }}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>Risk Level:</span>
                <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: lvl.bg, color: "#fff" }}>{lvl.label}</span>
              </div>
            </div>
          );
        })}

        <button onClick={() => setLocalRisks(p => [...p, { id: Math.random().toString(36).slice(2), description: "", riskClass: "asset", impact: 1, probability: 1, asset_ids: [] }])}
          style={{ width: "100%", padding: 11, borderRadius: 9, border: `2px dashed ${C.borderStrong}`, background: C.surfaceAlt, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 16 }}>
          + Add Risk
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(localRisks); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            Validate Risks
          </button>
          <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GapsModal({ gaps, title, onSave, onClose }) {
  const [list, setList] = useState(gaps.map(g => ({ id: Math.random().toString(36).slice(2), description: typeof g === 'string' ? g : g.description })));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 600, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text }}>Validate Gaps</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, marginTop: 4 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>
        {list.map((g, idx) => (
          <div key={g.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 12, background: C.surfaceAlt }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>Gap #{idx + 1}</span>
              <button onClick={() => setList(p => p.filter(x => x.id !== g.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 12 }}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
            <textarea value={g.description} onChange={e => setList(p => p.map(x => x.id === g.id ? { ...x, description: e.target.value } : x))} placeholder="Gap description…"
              style={{ width: "100%", minHeight: 60, padding: 10, border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, resize: "vertical", background: C.surface, outline: "none" }}
            />
          </div>
        ))}
        <button onClick={() => setList(p => [...p, { id: Math.random().toString(36).slice(2), description: "" }])}
          style={{ width: "100%", padding: 11, borderRadius: 9, border: `2px dashed ${C.borderStrong}`, background: C.surfaceAlt, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 16 }}>
          + Add Gap
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(list.map(l => l.description).filter(x => x.trim())); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            Validate Gaps
          </button>
          <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MitigationModal({ mitigation, title, onSave, onClose }) {
  const [text, setText] = useState(mitigation || "");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 600, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text }}>Validate Mitigation Plan</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, marginTop: 4 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe remediation actions (one per line)…"
          style={{ width: "100%", minHeight: 200, padding: 12, border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surfaceAlt, outline: "none", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(text); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            Validate Mitigation Plan
          </button>
          <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ValidationModal({ item, onSave, onClose, savedDecision }) {
  const [val, setVal] = useState(savedDecision?.status || "");
  const [comment, setComment] = useState(savedDecision?.comment || "");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 540, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text }}>CISO Validation</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>
              <span style={{ color: C.wow, fontWeight: 700 }}>{item.title}</span>
              {item.ref_id && <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "1px 7px", borderRadius: 5, fontWeight: 600 }}>{item.ref_id}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 16 }}>
          {RSSI_OPTIONS.map(opt => {
            const s = STATUS_META[opt];
            const checked = val === opt;
            return (
              <label key={opt} onClick={() => setVal(opt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${checked ? s.color : C.border}`, background: checked ? s.bg : C.surfaceAlt }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${checked ? s.color : C.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? s.color : C.textMid }}>
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment / Justification…"
          style={{ width: "100%", minHeight: 80, padding: 12, border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, resize: "vertical", background: C.surfaceAlt, outline: "none" }}
        />
        <button onClick={() => { if (!val) return; onSave({ status: val, comment, date: new Date().toLocaleDateString("en-GB") }); onClose(); }}
          disabled={!val} style={{ width: "100%", marginTop: 14, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: val ? "pointer" : "not-allowed", background: val ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong }}>
          Validate CISO Decision
        </button>
      </div>
    </div>
  );
}

function NotApplicableValidationModal({
  item, allDetectedPolicies, assets, savedDecision, onSave, onClose,
}) {
  const [status, setStatus]               = useState(savedDecision?.status   || "");
  const [comment, setComment]             = useState(savedDecision?.comment  || "");
  const [policyAssessments, setPAs]       = useState(savedDecision?.policy_assessments || []);
  const [policyPickerOpen, setPickerOpen] = useState(false);
  const [riskEditFor, setRiskEditFor]     = useState(null);
  const [gapsEditFor, setGapsEditFor]     = useState(null);
  const [mitiEditFor, setMitiEditFor]     = useState(null);

  const availablePolicies = (allDetectedPolicies || []).filter(p =>
    !policyAssessments.find(pa => pa.policy_name === (p.name || p.policy_name))
  );

  const addPolicy = (p) => {
    const name    = p.name || p.policy_name;
    const summary = p.summary || p.policy_summary || "";
    setPAs(prev => [...prev, {
      policy_name: name, policy_summary: summary,
      comment: "", risks: [], gaps: [], mitigation: "",
    }]);
    setPickerOpen(false);
  };
  const removePolicy = (name) => setPAs(p => p.filter(x => x.policy_name !== name));
  const updatePolicy = (name, patch) =>
    setPAs(p => p.map(x => x.policy_name === name ? { ...x, ...patch } : x));

  const editingRiskFor = policyAssessments.find(p => p.policy_name === riskEditFor);
  const editingGapsFor = policyAssessments.find(p => p.policy_name === gapsEditFor);
  const editingMitiFor = policyAssessments.find(p => p.policy_name === mitiEditFor);

  const canSave = !!status;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 760, maxWidth: "94vw", padding: "26px 28px", boxShadow: C.shadowLg, maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text }}>Make this item applicable</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid, marginTop: 4 }}>
              <span style={{ color: C.wow, fontWeight: 700 }}>{item.title}</span>
              {item.ref_id && <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "1px 7px", borderRadius: 5, fontWeight: 600 }}>{item.ref_id}</span>}
            </div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>
              The AI did not match any policy to this item. Pick the policies
              that you, as CISO, consider relevant; for each, describe how it
              addresses the item, the risks, gaps and mitigation actions.
              Finally choose the item-level conformance level.
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 18 }}>×</button>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            Item-level conformance <span style={{ color: C.danger }}>*</span>
            <span style={{ color: C.textMuted, fontWeight: 400, textTransform: "none", marginLeft: 8 }}>
              (Covered = 100% &middot; Partial = 50% &middot; Not covered = 0%)
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
            {RSSI_OPTIONS.map(opt => {
              const s = STATUS_META[opt];
              const checked = status === opt;
              return (
                <label key={opt} onClick={() => setStatus(opt)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${checked ? s.color : C.border}`, background: checked ? s.bg : C.surfaceAlt }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${checked ? s.color : C.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? s.color : C.textMid }}>{opt}</span>
                </label>
              );
            })}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Justification / comment (optional)…"
            style={{ width: "100%", minHeight: 60, padding: 11, border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 12.5, fontFamily: F.body, resize: "vertical", background: C.surfaceAlt, outline: "none", marginBottom: 16 }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>
              Relevant policies ({policyAssessments.length})
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => setPickerOpen(o => !o)}
                disabled={availablePolicies.length === 0}
                style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${availablePolicies.length ? C.wow : C.border}`, background: availablePolicies.length ? C.accentLight : C.surfaceAlt, color: availablePolicies.length ? C.wow : C.textMuted, fontSize: 11, fontWeight: 700, cursor: availablePolicies.length ? "pointer" : "not-allowed" }}>
                + Add policy {availablePolicies.length ? `(${availablePolicies.length})` : ""}
              </button>
              {policyPickerOpen && availablePolicies.length > 0 && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 60, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadowMd, maxHeight: 280, overflowY: "auto", minWidth: 280 }}>
                  {availablePolicies.map((p, idx) => {
                    const name    = p.name || p.policy_name;
                    const summary = p.summary || p.policy_summary || "";
                    return (
                      <div key={idx} onClick={() => addPolicy(p)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{name}</div>
                        {summary && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{summary.slice(0, 110)}{summary.length > 110 ? "…" : ""}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {policyAssessments.length === 0 && (
            <div style={{ padding: "16px 12px", textAlign: "center", color: C.textMuted, fontSize: 12, fontStyle: "italic", background: C.surfaceAlt, border: `1px dashed ${C.borderStrong}`, borderRadius: 8 }}>
              No policy selected yet. Click "Add policy" to pick one.
            </div>
          )}

          {policyAssessments.map((pa, idx) => (
            <div key={pa.policy_name + idx} style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.wow}`, borderRadius: 9, padding: "11px 13px", marginBottom: 10, background: C.surfaceAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, color: C.text }}>{pa.policy_name}</div>
                  {pa.policy_summary && (
                    <div style={{ fontSize: 11, color: C.textMid, marginTop: 3, lineHeight: 1.4 }}>{pa.policy_summary}</div>
                  )}
                </div>
                <button onClick={() => removePolicy(pa.policy_name)} title="Remove this policy"
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, padding: 4 }}>
                  <Trash2 size={14}/>
                </button>
              </div>

              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>How this policy addresses the item</div>
                <textarea value={pa.comment} onChange={e => updatePolicy(pa.policy_name, { comment: e.target.value })}
                  placeholder="Explain how this policy covers the item…"
                  style={{ width: "100%", minHeight: 50, padding: 8, border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: F.body, resize: "vertical", background: C.surface, outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <button onClick={() => setRiskEditFor(pa.policy_name)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${(pa.risks || []).length ? "#86EFAC" : C.borderStrong}`, background: (pa.risks || []).length ? C.successLight : C.surface, color: (pa.risks || []).length ? C.success : C.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Risks ({(pa.risks || []).length})
                </button>
                <button onClick={() => setGapsEditFor(pa.policy_name)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${(pa.gaps || []).length ? "#86EFAC" : C.borderStrong}`, background: (pa.gaps || []).length ? C.successLight : C.surface, color: (pa.gaps || []).length ? C.success : C.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Gaps ({(pa.gaps || []).length})
                </button>
                <button onClick={() => setMitiEditFor(pa.policy_name)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${(pa.mitigation || "").trim() ? "#86EFAC" : C.borderStrong}`, background: (pa.mitigation || "").trim() ? C.successLight : C.surface, color: (pa.mitigation || "").trim() ? C.success : C.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Mitigation
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            onClick={() => {
              if (!canSave) return;
              onSave({
                status, comment,
                policy_assessments: policyAssessments,
                date: new Date().toLocaleDateString("en-GB"),
              });
              onClose();
            }}
            disabled={!canSave}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: canSave ? "pointer" : "not-allowed", background: canSave ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong }}>
            Validate &amp; make applicable
          </button>
          <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>Cancel</button>
        </div>
      </div>

      {editingRiskFor && (
        <RiskModal
          risks={(editingRiskFor.risks || []).map(r => ({
            id: r.id || Math.random().toString(36).slice(2),
            description: r.description || r,
            riskClass: r.riskClass || "asset",
            impact: r.impact || 2, probability: r.probability || 2,
            asset_ids: r.asset_ids || [],
          }))}
          assets={assets}
          title={`${item.title} < ${editingRiskFor.policy_name}`}
          onSave={(rr) => { updatePolicy(editingRiskFor.policy_name, { risks: rr }); }}
          onClose={() => setRiskEditFor(null)}
        />
      )}
      {editingGapsFor && (
        <GapsModal
          gaps={editingGapsFor.gaps || []}
          title={`${item.title} < ${editingGapsFor.policy_name}`}
          onSave={(gg) => { updatePolicy(editingGapsFor.policy_name, { gaps: gg }); }}
          onClose={() => setGapsEditFor(null)}
        />
      )}
      {editingMitiFor && (
        <MitigationModal
          mitigation={editingMitiFor.mitigation || ""}
          title={`${item.title} < ${editingMitiFor.policy_name}`}
          onSave={(t) => { updatePolicy(editingMitiFor.policy_name, { mitigation: t }); }}
          onClose={() => setMitiEditFor(null)}
        />
      )}
    </div>
  );
}

function FinalizeModal({ defaultTitle, onSave, onClose }) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  return (
    <div onClick={!success ? onClose : undefined} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 480, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.text }}>Finalize Analysis</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid, marginTop: 4 }}>Save validated risks, gaps and mitigations to the database.</div>
        </div>
        {success && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#1D4ED8", fontWeight: 600, fontSize: 13 }}>
            Analysis saved successfully!
          </div>
        )}
        {!success && (
          <>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 6, display: "block" }}>Analysis Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="e.g., ISO 27001 Audit – Q2 2026"
              style={{ width: "100%", padding: 12, border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: F.body, background: C.surfaceAlt, outline: "none", marginBottom: 18 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  if (!title.trim()) return;
                  setSaving(true);
                  try { await onSave(title.trim()); setSuccess(true); }
                  catch (e) { alert("Save failed: " + e.message); }
                  finally { setSaving(false); }
                }}
                disabled={!title.trim() || saving}
                style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff",
                         cursor: title.trim() && !saving ? "pointer" : "not-allowed",
                         background: title.trim() ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong }}>
                {saving ? "Saving…" : "Save & Finalize"}
              </button>
              <button onClick={onClose}
                style={{ padding: "12px 22px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function blockKey(itemId, policyName) {
  return `${itemId}::${policyName}`;
}

// ─── Inner: one policy block inside an item card ───────────────────────────
function PolicyBlock({ itemId, itemTitle, pa, validated, assets, onUpdate }) {
  const [showRisk, setShowRisk] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  const [showMiti, setShowMiti] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [draftComment, setDraftComment] = useState(validated?.comment ?? pa.comment ?? "");

  const meta = STATUS_META[pa.status] || STATUS_META["Not covered"];

  const risks      = validated?.risks      ?? (pa.risks || []).map(r => ({
    id: Math.random().toString(36).slice(2),
    description: typeof r === "string" ? r : (r?.description || ""),
    riskClass: "asset", impact: 2, probability: 2, asset_ids: [],
  }));
  const gaps       = validated?.gaps       ?? (pa.gaps || []);
  const mitigation = validated?.mitigation ?? (pa.remediation || "");
  const comment    = validated?.comment    ?? pa.comment ?? "";
  const commentValidated = validated?.comment !== undefined;

  const baseTitle = `${itemTitle}  <  ${pa.policy_name}`;

  return (
    <div style={{ border: `1px solid ${meta.border}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: `${meta.bg}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, color: C.text }}>{pa.policy_name}</span>
        <StatusPill status={pa.status} />
        <ConfBar value={pa.conf || 0} color={meta.color} width={70} />
      </div>

      {pa.policy_summary && (
        <div style={{
          marginTop: 4, padding: "6px 10px",
          background: C.accentLight, border: `1px solid ${C.wow}25`,
          borderRadius: 6, fontSize: 11.5, color: C.textMid, lineHeight: 1.5,
        }}>
          <span style={{ color: C.text, fontWeight: 700 }}>Policy description:</span> {pa.policy_summary}
        </div>
      )}

      <div style={{ marginTop: 8, padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>How this policy addresses the item</span>
          {!editingComment && (
            <button onClick={() => { setDraftComment(comment); setEditingComment(true); }}
              style={{
                padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${commentValidated ? "#86EFAC" : C.borderStrong}`,
                background: commentValidated ? C.successLight : C.surface,
                color: commentValidated ? C.success : C.textMid,
                fontSize: 10, fontWeight: 700,
              }}>
              {commentValidated ? "Validated · Edit" : "Validate"}
            </button>
          )}
        </div>
        {editingComment ? (
          <>
            <textarea value={draftComment} onChange={e => setDraftComment(e.target.value)} autoFocus
              placeholder="Edit the comment, then click Save to validate."
              style={{ width: "100%", minHeight: 70, padding: "8px 10px", border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surface, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
              <button onClick={() => { setDraftComment(comment); setEditingComment(false); }}
                style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 11, fontWeight: 600, color: C.textMid }}>
                Cancel
              </button>
              <button onClick={() => { onUpdate({ comment: draftComment }); setEditingComment(false); }}
                style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: C.success, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                Save
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11.5, color: C.textMid, lineHeight: 1.5 }}>
            {comment || <em style={{ color: C.textMuted }}>No AI comment — click Validate to add one.</em>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, padding: "8px 10px", background: C.dangerLight, borderRadius: 8, borderLeft: `3px solid ${C.danger}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.danger }}>Risks ({risks.length})</span>
          <button onClick={() => setShowRisk(true)}
            style={{ padding: "3px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${validated?.risks ? "#86EFAC" : C.borderStrong}`, background: validated?.risks ? C.successLight : C.surface, color: validated?.risks ? C.success : C.textMid, fontSize: 10, fontWeight: 700 }}>
            {validated?.risks ? "Validated · Edit" : "Validate"}
          </button>
        </div>
        {risks.length === 0
          ? <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>No risk for this (item, policy) yet.</span>
          : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: C.textMid }}>
              {risks.map((r, i) => {
                const linkedAssets = (r.asset_ids || []).map(id => assets.find(a => a.id === id)?.intitule).filter(Boolean);
                return (
                  <li key={r.id || i} style={{ marginBottom: 3 }}>
                    {r.description || <em>(empty)</em>}
                    {(r.impact || r.probability) && (
                      <span style={{ marginLeft: 6, fontSize: 9.5, color: C.textMuted }}>· I:{r.impact}/P:{r.probability}{linkedAssets.length > 0 && ` · assets: ${linkedAssets.join(", ")}`}</span>
                    )}
                  </li>
                );
              })}
            </ul>}
      </div>

      <div style={{ marginTop: 6, padding: "8px 10px", background: C.warningLight, borderRadius: 8, borderLeft: `3px solid ${C.warning}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.warning }}>Gaps ({gaps.length})</span>
          <button onClick={() => setShowGaps(true)}
            style={{ padding: "3px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${validated?.gaps ? "#86EFAC" : C.borderStrong}`, background: validated?.gaps ? C.successLight : C.surface, color: validated?.gaps ? C.success : C.textMid, fontSize: 10, fontWeight: 700 }}>
            {validated?.gaps ? "Validated · Edit" : "Validate"}
          </button>
        </div>
        {gaps.length === 0
          ? <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>No gap.</span>
          : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: C.textMid }}>
              {gaps.map((g, i) => <li key={i}>{typeof g === "string" ? g : g.description}</li>)}
            </ul>}
      </div>

      <div style={{ marginTop: 6, padding: "8px 10px", background: C.successLight, borderRadius: 8, borderLeft: `3px solid ${C.success}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.success }}>Mitigation Plan</span>
          <button onClick={() => setShowMiti(true)}
            style={{ padding: "3px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${validated?.mitigation !== undefined ? "#86EFAC" : C.borderStrong}`, background: validated?.mitigation !== undefined ? C.successLight : C.surface, color: validated?.mitigation !== undefined ? C.success : C.textMid, fontSize: 10, fontWeight: 700 }}>
            {validated?.mitigation !== undefined ? "Validated · Edit" : "Validate"}
          </button>
        </div>
        {mitigation
          ? <div style={{ whiteSpace: "pre-wrap", fontSize: 11.5, color: C.textMid, lineHeight: 1.5 }}>{mitigation}</div>
          : <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>No mitigation defined yet.</span>}
      </div>

      {showRisk && <RiskModal risks={risks} assets={assets} title={baseTitle}
        onSave={rr => onUpdate({ risks: rr })} onClose={() => setShowRisk(false)} />}
      {showGaps && <GapsModal gaps={gaps} title={baseTitle}
        onSave={gg => onUpdate({ gaps: gg })} onClose={() => setShowGaps(false)} />}
      {showMiti && <MitigationModal mitigation={mitigation} title={baseTitle}
        onSave={t => onUpdate({ mitigation: t })} onClose={() => setShowMiti(false)} />}
    </div>
  );
}

// ─── Bottom section: items that no policy in the document addresses ────────
function NotApplicableSection({ items, decision, onValidateItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      marginTop: 28, borderRadius: 12,
      border: `1.5px dashed ${C.borderStrong}`,
      background: C.mutedLight, overflow: "hidden",
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", background: "transparent", border: "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 2 }}>
            {items.length} item{items.length === 1 ? "" : "s"} not applicable
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
            The following items are not addressed by any of the policies detected in the uploaded document and are therefore excluded from the global compliance score.
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none"
             style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "4px 14px 14px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
          {items.map(it => {
            const cisoDec = decision[it.item_id];
            const typeLabel =
              (it.type || "").startsWith("core")  ? "Core"  :
              (it.type || "").startsWith("annex") ? "Annex" : "";
            return (
              <div key={it.item_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderBottom: `1px solid ${C.border}` }}>
                {it.ref_id && (
                  <span style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, background: C.surfaceAlt, padding: "1px 7px", borderRadius: 4, fontWeight: 700, border: `1px solid ${C.border}` }}>{it.ref_id}</span>
                )}
                <span style={{ fontFamily: F.display, fontSize: 12.5, fontWeight: 700, color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                {typeLabel && (
                  <span style={{ fontFamily: F.body, fontSize: 9, color: "#fff", background: C.wow, padding: "2px 7px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{typeLabel}</span>
                )}
                <button onClick={() => onValidateItem(it)} style={{
                  padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${cisoDec ? "#86EFAC" : C.borderStrong}`,
                  background: cisoDec ? C.successLight : C.surface,
                  color: cisoDec ? C.success : C.textMid,
                  fontSize: 10, fontWeight: 700,
                }}>
                  {cisoDec ? "Validated" : "Validate"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Top-level: one card per imported item ──────────────────────────────────
function ItemCard({ item, decision, validatedBlocks, assets, onValidateItem, onUpdateBlock }) {
  const [open, setOpen] = useState(false);

  const effectiveStatus = decision?.status || item.status;
  const meta = STATUS_META[effectiveStatus] || STATUS_META["Not covered"];

  const cisoPromoted = !item.is_applicable && decision?.status && decision.status !== "Not applicable";
  const isNotApplicable = (!item.is_applicable && !cisoPromoted) || effectiveStatus === "Not applicable";

  const policyAssessmentsToShow = cisoPromoted
    ? (decision.policy_assessments || []).map(pa => ({
        ...pa,
        status: decision.status,
        conf:   STATUS_META[decision.status]?.score ?? 0,
        remediation: pa.mitigation || pa.remediation || "",
        _source: "ciso",
      }))
    : (item.policy_assessments || []);

  const typeLabel =
    (item.type || "").startsWith("core")  ? "Core"  :
    (item.type || "").startsWith("annex") ? "Annex" : "";

  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${open ? `${meta.color}55` : C.border}`, background: C.surface, overflow: "hidden", boxShadow: open ? `0 4px 16px ${meta.color}15` : C.shadow }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: open ? `linear-gradient(to right,${meta.bg},transparent)` : C.surfaceAlt, border: "none", cursor: "pointer", textAlign: "left", borderBottom: open ? `1px solid ${C.border}` : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            {item.ref_id && <span style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, background: C.surface, padding: "1px 7px", borderRadius: 4, fontWeight: 700, border: `1px solid ${C.border}` }}>{item.ref_id}</span>}
            <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: C.text }}>{item.title}</span>
            {typeLabel && (
              <span style={{ fontFamily: F.body, fontSize: 9, color: "#fff", background: C.wow, padding: "2px 7px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{typeLabel}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
            <StatusPill status={item.status} decision={decision?.status} />
            {isNotApplicable
              ? <span>Not addressed by any policy in the uploaded document</span>
              : <span>
                  {policyAssessmentsToShow.length} relevant {policyAssessmentsToShow.length === 1 ? "policy" : "policies"}
                  {cisoPromoted && <span style={{ marginLeft: 6, color: C.success, fontWeight: 700 }}>(CISO validated)</span>}
                </span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onValidateItem(item); }}
          style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: `1px solid ${decision ? "#86EFAC" : C.borderStrong}`, background: decision ? C.successLight : C.surface, color: decision ? C.success : C.textMid, fontSize: 11, fontWeight: 700 }}>
          {decision ? "Validated" : "Validate"}
        </button>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "12px 16px" }}>
          {isNotApplicable ? (
            <div style={{ padding: "16px 12px", textAlign: "center", color: C.muted, fontSize: 12, fontStyle: "italic" }}>
              {item.fallback_note || "No policy in the uploaded document is relevant to this control. This item is marked Not applicable and is ignored in the global score."}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Relevant policies ({policyAssessmentsToShow.length}) — each block has its own risks / gaps / mitigation
                {cisoPromoted && (
                  <span style={{ marginLeft: 8, color: C.success, fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
                    — selected by CISO
                  </span>
                )}
              </div>
              {policyAssessmentsToShow.map((pa, idx) => {
                const k = blockKey(item.item_id, pa.policy_name);
                return (
                  <PolicyBlock
                    key={k + "_" + idx}
                    itemId={item.item_id}
                    itemTitle={`${item.ref_id || ""} ${item.title}`.trim()}
                    pa={pa}
                    validated={validatedBlocks[k]}
                    assets={assets}
                    onUpdate={(patch) => onUpdateBlock(k, patch)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User session helper ────────────────────────────────────────────────────
async function fetchCurrentUser() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/me", { credentials: "include" });
    if (res.ok) return await res.json();
  } catch (e) { console.warn("Could not fetch current user:", e); }
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (stored?.id) return stored;
  } catch {}
  return null;
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ConformityPage() {
  const _persisted = loadPersistedAnalysis();
  const _hasPersisted = !!_persisted?.analysisData;

  const [step, setStep] = useState(_hasPersisted ? 3 : 1);

  // ✅ FIX 1 — tableau de fichiers (plus jamais uploadedFile singulier)
  const [uploadedFiles, setUploadedFiles] = useState(
    _hasPersisted && _persisted.uploadedFileNames
      ? _persisted.uploadedFileNames.map(n => ({ name: n }))
      : []
  );

  const [analysisData, setAnalysisData] = useState(_hasPersisted ? _persisted.analysisData : null);
  const [decisions, setDecisions] = useState(_hasPersisted ? (_persisted.decisions || {}) : {});
  const [validatedBlocks, setValidatedBlocks] = useState(_hasPersisted ? (_persisted.validatedBlocks || {}) : {});
  const [modalItem, setModalItem] = useState(null);
  const [naModalItem, setNaModalItem] = useState(null);
  const [showFinalize, setShowFinalize] = useState(false);
  const fileRef = useRef();
  const [policies, setPolicies] = useState([]);
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // ✅ FIX 2 — dépendance uploadedFiles (plus uploadedFile)
  useEffect(() => {
    if (!analysisData) { sessionStorage.removeItem(ANALYSIS_PERSIST_KEY); return; }
    try {
      sessionStorage.setItem(ANALYSIS_PERSIST_KEY, JSON.stringify({
        step,
        uploadedFileNames: uploadedFiles.map(f => f.name),
        analysisData, decisions, validatedBlocks,
      }));
    } catch (e) { console.warn("Could not persist analysis:", e); }
  }, [step, uploadedFiles, analysisData, decisions, validatedBlocks]);

  const [currentUser, setCurrentUser] = useState({ id: null, name: "Anonymous CISO", organization: "", department: "" });

  useEffect(() => {
    (async () => {
      const user = await fetchCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id || null,
          name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "CISO",
          organization: user.organization || user.organisation || "",
          department: user.department || "",
        });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_ASSETS, { credentials: "include" });
        if (res.ok) setAssets(await res.json());
      } catch (e) { console.error("Failed to load assets", e); }
    })();
  }, []);

  const aiItems            = analysisData?.items || [];
  const aiPoliciesDetected = analysisData?.policies_detected || [];

  const totalItemCount = useMemo(() => policies.reduce((s, p) => s + (p.totalItems || 0), 0), [policies]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/api/framauditor/imported", { credentials: "include" });
        const data = await res.json();
        const norm = data.map(pkg => {
          const chapters = pkg.core_chapters || [];
          const families = pkg.families || [];
          const controls = pkg.controls || [];
          const keptFamilies = families.filter(f => controls.some(c => c.family_id === f.id && !c.is_exception));
          const keptCoreControls  = controls.filter(c => c.core_chapter_id && !c.is_exception);
          const keptAnnexControls = controls.filter(c => c.family_id && !c.is_exception);
          const totalItems = chapters.length + keptFamilies.length + keptCoreControls.length + keptAnnexControls.length;
          return { id: pkg.standard_id, title: pkg.title, version: pkg.version || "1.0", totalItems };
        });
        setPolicies(norm);
      } catch (e) { console.error(e); setPolicies([]); }
    })();
  }, []);

  const statusFromScore = (s) => s >= 80 ? "Covered" : s >= 30 ? "Partial" : "Not covered";
  const kpis = useMemo(() => {
    let covered = 0, partial = 0, notCovered = 0, notApplicable = 0;
    let scoreSum = 0, scoredCount = 0;

    for (const it of aiItems) {
      const cisoOverride = decisions[it.item_id]?.status;
      const aiNA   = !it.is_applicable || it.status === "Not applicable";
      const promotedByCiso = aiNA && cisoOverride && cisoOverride !== "Not applicable";
      const isApplicable   = (!aiNA && cisoOverride !== "Not applicable") || promotedByCiso;

      if (!isApplicable) { notApplicable++; continue; }

      let itemScore;
      if (cisoOverride) {
        itemScore = STATUS_META[cisoOverride]?.score ?? 0;
      } else {
        itemScore = it.conf ?? STATUS_META[it.status]?.score ?? 0;
      }
      const effStatus = statusFromScore(itemScore);
      scoredCount++;
      scoreSum += itemScore;
      if      (effStatus === "Covered") covered++;
      else if (effStatus === "Partial") partial++;
      else                              notCovered++;
    }
    const globalScore  = scoredCount ? Math.round(scoreSum / scoredCount) : 0;
    const globalStatus = statusFromScore(globalScore);

    let cisoValidations = Object.keys(decisions).length;
    for (const k of Object.keys(validatedBlocks)) {
      const v = validatedBlocks[k];
      if (v?.risks)                    cisoValidations++;
      if (v?.gaps)                     cisoValidations++;
      if (v?.mitigation !== undefined) cisoValidations++;
    }

    return {
      analyzedCount: scoredCount,
      coveredCount: covered, partialCount: partial,
      notCoveredCount: notCovered, notApplicableCount: notApplicable,
      validatedCount: cisoValidations,
      globalScore, globalStatus,
    };
  }, [aiItems, decisions, validatedBlocks]);

  const isEffectivelyApplicable = (it) => {
    const cisoStatus = decisions[it.item_id]?.status;
    if (it.is_applicable) return cisoStatus !== "Not applicable";
    return !!cisoStatus && cisoStatus !== "Not applicable";
  };

  const applicableItems = useMemo(() => {
    let list = aiItems.filter(isEffectivelyApplicable);
    if (filter !== "all") {
      list = list.filter(it => {
        const s = decisions[it.item_id]?.status || it.status;
        return s === filter;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(it =>
        (it.title || "").toLowerCase().includes(q) ||
        (it.ref_id || "").toLowerCase().includes(q)
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiItems, decisions, filter, search]);

  const notApplicableItems = useMemo(() => {
    return aiItems.filter(it => !isEffectivelyApplicable(it));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiItems, decisions]);

  // ✅ FIX 3 — handleFile accumule dans le tableau
  const handleFile = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    setUploadedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const toAdd = Array.from(newFiles).filter(f => !existingNames.has(f.name));
      return [...prev, ...toAdd];
    });
    setAnalysisData(null); setDecisions({}); setValidatedBlocks({}); setStep(1);
  };

  const resetAll = () => {
    sessionStorage.removeItem(ANALYSIS_PERSIST_KEY);
    setStep(1); setUploadedFiles([]); setAnalysisData(null); setDecisions({}); setValidatedBlocks({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const consumeAnalysis = async (promise) => {
    try {
      const data = await promise;
      setAnalysisData(data); setStep(3);
    } catch (e) {
      if (e?.name === "AbortError") setStep(1);
      else { alert("Analysis failed: " + e.message); setStep(1); }
    } finally {
      ongoingAnalysis = null;
      try { sessionStorage.removeItem(ANALYSIS_RUNNING_KEY); } catch {}
    }
  };

  // ✅ FIX 4 — runAnalysis envoie tous les fichiers sous "pdfs"
  const runAnalysis = async () => {
    if (!uploadedFiles.length || !policies.length) return;
    setStep(2);
    const controller = new AbortController();
    const fd = new FormData();
    uploadedFiles.forEach(f => fd.append("pdfs", f));
    fd.append("standardIds", JSON.stringify(policies.map(p => p.id)));

    const promise = fetch(`${API_BASE}/analyze-pdf`, {
      method: "POST", body: fd, credentials: "include", signal: controller.signal,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      return data;
    });

    ongoingAnalysis = { controller, promise, fileNames: uploadedFiles.map(f => f.name) };
    try { sessionStorage.setItem(ANALYSIS_RUNNING_KEY, JSON.stringify({ fileNames: uploadedFiles.map(f => f.name) })); } catch {}
    await consumeAnalysis(promise);
  };

  const stopAnalysis = () => {
    try { ongoingAnalysis?.controller?.abort(); } catch {}
    ongoingAnalysis = null;
    try { sessionStorage.removeItem(ANALYSIS_RUNNING_KEY); } catch {}
    resetAll();
  };

  // ✅ FIX 5 — reprise d'analyse en cours (fileNames au pluriel)
  useEffect(() => {
    if (analysisData) return;
    if (ongoingAnalysis) {
      setUploadedFiles(
        (ongoingAnalysis.fileNames || [ongoingAnalysis.fileName]).filter(Boolean).map(n => ({ name: n }))
      );
      setStep(2);
      consumeAnalysis(ongoingAnalysis.promise);
    } else {
      try { sessionStorage.removeItem(ANALYSIS_RUNNING_KEY); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBlock = (key, patch) => {
    setValidatedBlocks(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  };

  const finalizeAnalysis = async (title) => {
    const standardId   = policies[0]?.id || null;
    const standardName = policies[0]?.title || "";

    const itemsPayload = aiItems.map(it => {
      const decision = decisions[it.item_id];
      const cisoPromoted = !it.is_applicable && decision?.status && decision.status !== "Not applicable";
      const baseAssessments = cisoPromoted
        ? (decision.policy_assessments || []).map(pa => ({
            policy_name:    pa.policy_name,
            policy_summary: pa.policy_summary || "",
            status:         decision.status,
            conf:           STATUS_META[decision.status]?.score ?? 0,
            comment:        pa.comment || "",
            risks:          pa.risks || [],
            gaps:           pa.gaps || [],
            remediation:    pa.mitigation || pa.remediation || "",
            _source:        "ciso",
          }))
        : (it.policy_assessments || []);

      const policyAssessmentsOut = baseAssessments.map(pa => {
        const k = blockKey(it.item_id, pa.policy_name);
        const v = validatedBlocks[k] || {};
        const effRisksRaw = v.risks ?? pa.risks ?? [];
        const risks = effRisksRaw
          .filter(r => ((r.description || (typeof r === "string" ? r : "")) || "").trim())
          .map(r => {
            const desc = typeof r === "string" ? r : (r.description || "");
            return {
              intitule:    (desc || "").slice(0, 100),
              description: desc,
              impact:      r.impact ?? 2,
              probability: r.probability ?? 2,
              probabilite: r.probability ?? 2,
              risk_class:  r.riskClass || "asset",
              asset_ids:   r.asset_ids || [],
              categorie:   "Information Security",
              owner:       currentUser.name,
              dueDate:     null,
              mitigationPlan: (v.mitigation || pa.remediation || "")
                .split("\n").map(s => s.trim()).filter(Boolean),
              source_control_id:  it.item_id,
              source_control_key: it.ref_id || null,
              source_policy_name: pa.policy_name,
            };
          });
        return {
          policy_name:    pa.policy_name,
          policy_summary: pa.policy_summary || "",
          status:         pa.status,
          ciso_status:    decision?.status || null,
          conf:           pa.conf || 0,
          comment:        (v.comment !== undefined ? v.comment : (pa.comment || "")),
          risks,
          gaps:           (v.gaps !== undefined ? v.gaps : (pa.gaps || [])),
          remediation:    (v.mitigation !== undefined ? v.mitigation : (pa.remediation || "")),
          _source:        pa._source || "llm",
        };
      });

      return {
        item_id:       it.item_id,
        ref_id:        it.ref_id,
        title:         it.title,
        type:          it.type,
        is_applicable: it.is_applicable || cisoPromoted,
        ai_status:     it.status,
        ai_confidence: it.conf || 0,
        ciso_status:   decision?.status || null,
        ciso_comment:  decision?.comment || "",
        ciso_promoted: cisoPromoted,
        policy_assessments: policyAssessmentsOut,
      };
    });

    const body = {
      title,
      // ✅ FIX 6 — noms de tous les fichiers joints
      document_name:           uploadedFiles.map(f => f.name).join(", "),
      standard_id:             standardId,
      standard_name:           standardName,
      created_by_id:           currentUser.id,
      created_by_name:         currentUser.name,
      created_by_organisation: currentUser.organization,
      created_by_department:   currentUser.department,
      policies_detected:       aiPoliciesDetected.map(p => ({
        policy_name:    p.name || p.policy_name,
        policy_summary: p.summary || p.policy_summary || "",
      })),
      items: itemsPayload,
    };
    startAnalysis();

    const res  = await fetch(API_ANALYSIS, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    endAnalysis();
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setTimeout(() => { setShowFinalize(false); resetAll(); }, 2200);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus, select:focus { border-color: ${C.wow} !important; outline: none; box-shadow: 0 0 0 3px rgba(59,111,255,0.08); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .fade { animation: fadeIn .25s ease; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 900, color: C.text, margin: 0 }}>Compliance check</h1>
          <p style={{ fontFamily: F.body, color: C.textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Upload a document · Each imported framework item is matched against the relevant policies detected in your document
            {currentUser.name !== "Anonymous CISO" && (
              <span style={{ marginLeft: 8, color: C.wow, fontWeight: 600 }}>
                · Logged in as {currentUser.name}{currentUser.organization && ` (${currentUser.organization})`}
              </span>
            )}
          </p>
        </div>
        {step === 2 && (
          <button onClick={stopAnalysis}
            style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.danger}`, background: C.dangerLight, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.danger }}>
            Stop analysis
          </button>
        )}
        {step === 3 && (
          <button onClick={resetAll} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>New analysis</button>
        )}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 22px", marginBottom: 22, display: "flex", alignItems: "center", boxShadow: C.shadow }}>
        {[{ n: 1, label: "Upload Document" }, { n: 2, label: "AI Analysis" }, { n: 3, label: "Review & Validate" }].map((s, i, arr) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepDot n={s.n} done={step > s.n} active={step === s.n} />
              <span style={{ fontSize: 12, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? C.wow : step > s.n ? C.success : C.textMuted, whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "#86EFAC" : C.border, margin: "0 14px", borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {/* ─── Step 1: Upload ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.wow}30`, borderRadius: 16, padding: 24, boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <StepDot n={1} done={false} active />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: C.text }}>Upload your compliance documents</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>The AI will identify policies in your documents, then for each imported framework item it will list the relevant policies and produce risks / gaps / mitigation for each (item, policy) pair</div>
              </div>
            </div>

            {/* ✅ multiple */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files)}
            />

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              style={{ padding: "42px 20px", background: C.surfaceAlt, border: `2px dashed ${C.borderStrong}`, borderRadius: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 11 }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 13, background: `linear-gradient(135deg,${C.warning},${C.wow})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: C.text }}>Drop your documents here</span>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>or click to browse · PDF, Word, TXT · multiple files accepted</span>
            </div>

            {/* Liste des fichiers ajoutés */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {uploadedFiles.map((f, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.accentLight, border: `1.5px solid ${C.wow}35`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg,${C.wow},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.wow }}>{f.name}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 18, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && policies.length > 0 && (
            <button onClick={runAnalysis} className="fade" style={{ width: "100%", padding: 15, background: `linear-gradient(135deg,${C.warning},${C.wow})`, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 6px 22px ${C.wow}38` }}>
              Run AI Analysis — {totalItemCount} items · {uploadedFiles.length} document(s)
            </button>
          )}
        </div>
      )}

      {/* ─── Step 2: Loading ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="fade" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "52px 32px", boxShadow: C.shadow, textAlign: "center" }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", border: `4px solid ${C.accentLight}`, borderTop: `4px solid ${C.Spin}`, animation: "spin .9s linear infinite", margin: "0 auto 22px" }} />
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Analyzing your document(s)…</div>
          {/* ✅ FIX 7 — step 2: affiche le nombre de fichiers */}
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted }}>
            Matching <strong style={{ color: C.wow }}>{uploadedFiles.length} document(s)</strong> against {totalItemCount} items
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, marginTop: 10 }}>
            You can browse other pages — the analysis keeps running in the background.
          </div>
        </div>
      )}

      {/* ─── Step 3: Results ────────────────────────────────────────────── */}
      {step === 3 && analysisData && (
        <div className="fade">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Overall Compliance (applicable items)</span>
              <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 900, color: STATUS_META[kpis.globalStatus].color }}>{kpis.globalScore}%</span>
              <div style={{ width: 120, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${kpis.globalScore}%`, height: "100%", background: STATUS_META[kpis.globalStatus].color, borderRadius: 3, transition: "width .4s ease" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Items analyzed", value: kpis.analyzedCount,      color: C.wow },
              { label: "Covered",        value: kpis.coveredCount,       color: C.success },
              { label: "Partial",        value: kpis.partialCount,       color: C.warning },
              { label: "Not covered",    value: kpis.notCoveredCount,    color: C.danger },
              { label: "Not applicable", value: kpis.notApplicableCount, color: C.muted },
              { label: "CISO validated", value: kpis.validatedCount,     color: C.purple },
            ].map(k => (
              <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", textAlign: "center", boxShadow: C.shadow }}>
                <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {/* ✅ FIX 8 — step 3: badge multi-fichiers */}
            {uploadedFiles.map((f, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 9, background: C.accentLight, border: `1px solid ${C.wow}30` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.wow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.wow }}>{f.name}</span>
              </div>
            ))}
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {aiPoliciesDetected.length} policy{aiPoliciesDetected.length === 1 ? "" : "ies"} detected · {aiItems.length} framework item(s)
            </span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or ref…"
              style={{ flex: 1, minWidth: 200, padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, background: C.surface, outline: "none" }}
            />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, background: C.surface, cursor: "pointer" }}>
              <option value="all">All applicable ({aiItems.length - notApplicableItems.length})</option>
              <option value="Covered">Covered</option>
              <option value="Partial">Partial</option>
              <option value="Not covered">Not covered</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {applicableItems.map(it => {
              const isAiNa = !it.is_applicable;
              return (
                <ItemCard
                  key={it.item_id}
                  item={it}
                  decision={decisions[it.item_id]}
                  validatedBlocks={validatedBlocks}
                  assets={assets}
                  onValidateItem={(item) => isAiNa ? setNaModalItem(item) : setModalItem(item)}
                  onUpdateBlock={updateBlock}
                />
              );
            })}
            {applicableItems.length === 0 && (
              <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontSize: 13, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                No applicable items match the current filter.
              </div>
            )}
          </div>

          {notApplicableItems.length > 0 && (
            <NotApplicableSection
              items={notApplicableItems}
              decision={decisions}
              onValidateItem={(item) => setNaModalItem(item)}
            />
          )}

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
            <button onClick={() => setShowFinalize(true)}
              style={{ padding: "16px 48px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#16A34A,#22C55E)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
              Finalize &amp; Save Analysis
            </button>
          </div>
        </div>
      )}

      {modalItem && (
        <ValidationModal
          item={modalItem}
          savedDecision={decisions[modalItem.item_id]}
          onSave={dec => setDecisions(prev => ({ ...prev, [modalItem.item_id]: dec }))}
          onClose={() => setModalItem(null)}
        />
      )}
      {naModalItem && (
        <NotApplicableValidationModal
          item={naModalItem}
          allDetectedPolicies={aiPoliciesDetected}
          assets={assets}
          savedDecision={decisions[naModalItem.item_id]}
          onSave={dec => setDecisions(prev => ({ ...prev, [naModalItem.item_id]: dec }))}
          onClose={() => setNaModalItem(null)}
        />
      )}
      {showFinalize && (
        <FinalizeModal
          defaultTitle={`Compliance Analysis - ${new Date().toLocaleDateString("en-GB")}`}
          onSave={finalizeAnalysis}
          onClose={() => { setShowFinalize(false); resetAll(); }}
        />
      )}
    </div>
  );
}