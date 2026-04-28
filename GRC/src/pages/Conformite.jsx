// src/pages/Conformity.jsx — v9
//
// FIXES vs v8 :
//  ✅ #1 RiskModal : sélection multi-assets depuis BDD + risk_class supporte "asset" | "business" | "both"
//  ✅ #2 KPIs corrigés : on ne compte que les items effectivement analysés et on
//        applique la décision CISO si présente; global score recalculé pareil
//  ✅ #3 Déduplication des risques venant de l'IA (anti-reformulation)
//  ✅ #4 Commentaires éditables (AI comment + CISO comment) inline
//
// IMPORTANT : la table `compliance_analyses` n'existe pas encore — voir analysisRoutes.js.

import { Trash2, Pencil, Check, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  accent: "#3B6FFF", accentLight: "#EEF2FF",
  purple: "#6D28D9",
  success: "#16A34A", successLight: "#F0FDF4",
  warning: "#D97706", warningLight: "#FFFBEB",
  danger:  "#DC2626", dangerLight:  "#FEF2F2",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 6px rgba(0,0,0,0.05)",
  shadowMd: "0 4px 14px rgba(0,0,0,0.08)",
  shadowLg: "0 20px 60px rgba(59,111,255,0.14)",
};
const F = { display: "'Fraunces', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" };

const API_BASE     = "http://localhost:3000/api/ai";
const API_ANALYSIS = "http://localhost:3000/api/analyses";
const API_ASSETS   = "http://localhost:3000/api/analyses/assets";

const STATUS_META = {
  Covered:        { label: "Covered",     color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", icon: "✅", score: 100 },
  Partial:        { label: "Partial",     color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: "⚠️", score: 50 },
  "Not covered":  { label: "Not covered", color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", icon: "❌", score: 0 },
};
const RSSI_OPTIONS = ["Covered", "Partial", "Not covered"];
const RSSI_STYLE = STATUS_META;

// ─── DEDUPLICATION HELPERS (frontend mirror of backend) ───────────────────
function normalizeText(s) {
  if (!s) return "";
  return String(s).toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter(w => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0; for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}
function dedupeAiRisks(risks, threshold = 0.55) {
  const out = [];
  for (const raw of risks || []) {
    const desc = typeof raw === "string" ? raw : (raw?.description || "");
    if (!desc.trim()) continue;
    const dup = out.find(k => jaccard(k.description, desc) >= threshold);
    if (dup) {
      // keep the longer, more informative wording
      if (desc.length > dup.description.length) dup.description = desc;
    } else {
      out.push({ id: Math.random().toString(36).slice(2), description: desc });
    }
  }
  return out;
}

// ─── small UI helpers (unchanged) ─────────────────────────────────────────
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

function StatusPill({ aiStatus, decision, big }) {
  const s = decision
    ? RSSI_STYLE[decision] || STATUS_META["Not covered"]
    : (aiStatus && STATUS_META[aiStatus]);
  if (!s) return null;
  const label = decision ? `👤 ${decision}` : `${STATUS_META[aiStatus].icon} ${STATUS_META[aiStatus].label}`;
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
        <div style={{ height: "100%", width: `${value}%`, background: color || C.accent, borderRadius: 99 }} />
      </div>
      <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{value}% confidence</span>
    </div>
  );
}

// ─── EditableComment — fix #4 ─────────────────────────────────────────────
function EditableComment({ value, label, color = C.text, bgColor = C.surface,
                          borderColor = C.border, onSave, placeholder = "Add a comment…" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);

  if (editing) {
    return (
      <div style={{ marginTop: 8, padding: "8px 10px", background: bgColor,
                    borderRadius: 6, border: `1px solid ${borderColor}` }}>
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700,
                      color, marginBottom: 6 }}>{label}</div>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
          placeholder={placeholder}
          style={{ width: "100%", minHeight: 60, padding: "8px 10px",
                   border: `1.5px solid ${C.border}`, borderRadius: 6,
                   fontSize: 12, fontFamily: F.body, color: C.text,
                   resize: "vertical", background: C.surface, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
          <button onClick={() => { setDraft(value || ""); setEditing(false); }}
            style={{ padding: "4px 10px", borderRadius: 5,
                     border: `1px solid ${C.border}`, background: C.surface,
                     cursor: "pointer", fontSize: 11, fontWeight: 600,
                     color: C.textMid, display: "flex", alignItems: "center", gap: 3 }}>
            <X size={11}/> Cancel
          </button>
          <button onClick={() => { onSave(draft); setEditing(false); }}
            style={{ padding: "4px 10px", borderRadius: 5, border: "none",
                     background: C.success, cursor: "pointer", fontSize: 11,
                     fontWeight: 700, color: "#fff",
                     display: "flex", alignItems: "center", gap: 3 }}>
            <Check size={11}/> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: "8px 10px", background: bgColor,
                  borderRadius: 6, border: `1px solid ${borderColor}`,
                  fontFamily: F.body, fontSize: 11, color: C.textMid,
                  lineHeight: 1.5, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <strong style={{ color, fontWeight: 700 }}>{label}</strong>{" "}
          {value
            ? value
            : <em style={{ color: C.textMuted }}>{placeholder}</em>}
        </div>
        <button onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", cursor: "pointer",
                   color: C.textMuted, padding: 2, flexShrink: 0,
                   display: "flex", alignItems: "center" }}
          title="Edit comment">
          <Pencil size={12}/>
        </button>
      </div>
    </div>
  );
}

// ─── Validation Modal (item-level) ────────────────────────────────────────
function ValidationModal({ item, aiResult, savedDecision, onSave, onClose }) {
  const [rssiVal, setRssiVal] = useState(savedDecision?.status || "");
  const [rssiComment, setRssiComment] = useState(savedDecision?.comment || "");
  const m = aiResult ? STATUS_META[aiResult.status] : null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 540, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>CISO Validation</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>{item.title}</span>
              {item.ref && <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "1px 7px", borderRadius: 5, fontWeight: 600, border: `1px solid ${C.border}` }}>{item.ref}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 18 }}>×</button>
        </div>

        {m && aiResult && (
          <div style={{ background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: m.color }}>{m.icon} AI: {m.label}</span>
              <ConfBar value={aiResult.conf || 0} color={m.color} width={80} />
            </div>
            {aiResult.comment && (
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
                <strong style={{ color: C.text }}>AI Comment:</strong> {aiResult.comment}
              </div>
            )}
          </div>
        )}

        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 9 }}>
          Your Decision <span style={{ color: C.accent }}>(Covered=100% · Partial=50% · Not covered=0%)</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 16 }}>
          {RSSI_OPTIONS.map(opt => {
            const s = RSSI_STYLE[opt];
            const checked = rssiVal === opt;
            return (
              <label key={opt} onClick={() => setRssiVal(opt)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 9, cursor: "pointer",
                border: `1.5px solid ${checked ? s.color : C.border}`,
                background: checked ? s.bg : C.surfaceAlt
              }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${checked ? s.color : C.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />}
                </div>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? s.color : C.textMid }}>
                  {s.icon} {opt}
                </span>
              </label>
            );
          })}
        </div>

        <textarea value={rssiComment} onChange={e => setRssiComment(e.target.value)}
          placeholder="Comment / Justification…"
          style={{ width: "100%", minHeight: 80, padding: "11px 14px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surfaceAlt, outline: "none" }}
        />
        <button onClick={() => { if (!rssiVal) return; onSave({ status: rssiVal, comment: rssiComment, date: new Date().toLocaleDateString("en-GB") }); onClose(); }}
          disabled={!rssiVal} style={{
          width: "100%", marginTop: 14, padding: "12px", border: "none", borderRadius: 9,
          fontSize: 13, fontWeight: 700, fontFamily: F.body, color: "#fff",
          cursor: rssiVal ? "pointer" : "not-allowed",
          background: rssiVal ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong,
        }}>
          ✓ Validate CISO Decision
        </button>
      </div>
    </div>
  );
}

// ─── Multi-asset selector ─────────────────────────────────────────────────
function AssetMultiSelect({ assets, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => assets.filter(a =>
      (a.intitule || "").toLowerCase().includes(search.toLowerCase())),
    [assets, search]
  );
  const selected = assets.filter(a => selectedIds.includes(a.id));

  const toggle = (id) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ minHeight: 38, padding: "6px 10px", borderRadius: 8,
                 border: `1.5px solid ${C.border}`, background: C.surface,
                 cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 4,
                 alignItems: "center" }}>
        {selected.length === 0 && (
          <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>
            Select asset(s)…
          </span>
        )}
        {selected.map(a => (
          <span key={a.id}
            style={{ background: C.accentLight, color: C.accent,
                     padding: "2px 8px", borderRadius: 4, fontSize: 11,
                     fontWeight: 600, fontFamily: F.body,
                     display: "inline-flex", alignItems: "center", gap: 3 }}>
            {a.intitule}
            <X size={10} style={{ cursor: "pointer" }}
               onClick={(e) => { e.stopPropagation(); toggle(a.id); }} />
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted }}>▾</span>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0,
                      right: 0, zIndex: 50, background: C.surface,
                      border: `1.5px solid ${C.border}`, borderRadius: 8,
                      boxShadow: C.shadowMd, maxHeight: 220, overflowY: "auto" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets…" autoFocus
            style={{ width: "100%", padding: "8px 10px", border: "none",
                     borderBottom: `1px solid ${C.border}`, fontSize: 12,
                     fontFamily: F.body, outline: "none", background: C.surfaceAlt }}
          />
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.textMuted,
                          fontFamily: F.body }}>
              {assets.length === 0
                ? "No assets in database. Add assets first."
                : "No matches."}
            </div>
          )}
          {filtered.map(a => {
            const isSel = selectedIds.includes(a.id);
            return (
              <div key={a.id} onClick={() => toggle(a.id)}
                style={{ padding: "8px 10px", cursor: "pointer",
                         display: "flex", alignItems: "center", gap: 8,
                         background: isSel ? C.accentLight : "transparent",
                         borderBottom: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={isSel} readOnly
                       style={{ accentColor: C.accent }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600,
                                color: C.text, fontFamily: F.body }}>{a.intitule}</div>
                  <div style={{ fontSize: 10, color: C.textMuted,
                                fontFamily: F.body }}>
                    {a.type || "—"} {a.Location ? `· ${a.Location}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Risk Modal — fix #1 ──────────────────────────────────────────────────
function RiskModal({ risks, assets, onSave, onClose }) {
  const [localRisks, setLocalRisks] = useState(risks);
  const getRiskColor = (impact, proba) => {
    const score = impact * proba;
    if (score <= 4)  return { bg: "#22c55e", label: "Low",      text: "#fff" };
    if (score <= 9)  return { bg: "#f59e0b", label: "Moderate", text: "#fff" };
    if (score <= 16) return { bg: "#f97316", label: "High",     text: "#fff" };
    return                  { bg: "#ef4444", label: "Critical", text: "#fff" };
  };

  const updateRisk = (id, patch) =>
    setLocalRisks(p => p.map(x => x.id === id ? { ...x, ...patch } : x));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 760, maxWidth: "94vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Validate Risks</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>
              Pick a class (Asset, Business, or both) and link assets from the database.
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>

        {localRisks.map((r, idx) => {
          const lvl = getRiskColor(r.impact || 1, r.probability || 1);
          const cls = r.riskClass || "asset";
          return (
            <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14, background: C.surfaceAlt }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.textMuted }}>Risk #{idx + 1}</span>
                <button onClick={() => setLocalRisks(p => p.filter(x => x.id !== r.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <textarea value={r.description}
                onChange={(e) => updateRisk(r.id, { description: e.target.value })}
                placeholder="Risk description…"
                style={{ width: "100%", minHeight: 70, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surface, outline: "none", marginBottom: 12 }}
              />

              {/* Risk class — now 3 options including BOTH */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Risk Classification</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { v: "asset",    l: "Asset Risk" },
                    { v: "business", l: "Business Risk" },
                    { v: "both",     l: "Both (Asset + Business)" },
                  ].map(o => (
                    <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input type="radio" name={`cls_${r.id}`} checked={cls === o.v}
                        onChange={() => updateRisk(r.id, { riskClass: o.v })}
                        style={{ accentColor: C.accent, width: 14, height: 14 }} />
                      <span style={{ fontFamily: F.body, fontSize: 12, color: C.text }}>{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Asset multi-select shown when class includes asset */}
              {(cls === "asset" || cls === "both") && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>
                    Linked Assets <span style={{ color: C.accent }}>(multi-select)</span>
                  </div>
                  <AssetMultiSelect
                    assets={assets}
                    selectedIds={r.asset_ids || []}
                    onChange={ids => updateRisk(r.id, { asset_ids: ids })}
                  />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Impact (1-4)</div>
                  <select value={r.impact || 1}
                    onChange={(e) => updateRisk(r.id, { impact: parseInt(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12, outline: "none", cursor: "pointer" }}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Probability (1-4)</div>
                  <select value={r.probability || 1}
                    onChange={(e) => updateRisk(r.id, { probability: parseInt(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12, outline: "none", cursor: "pointer" }}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 500 }}>Risk Level:</span>
                <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: lvl.bg, color: lvl.text, fontFamily: F.body }}>{lvl.label}</span>
              </div>
            </div>
          );
        })}

        <button onClick={() => setLocalRisks(p => [...p, {
            id: Math.random().toString(36).slice(2),
            description: "", riskClass: "asset", impact: 1, probability: 1,
            asset_ids: [],
          }])}
          style={{ width: "100%", padding: 11, borderRadius: 9, border: `2px dashed ${C.borderStrong}`, background: C.surfaceAlt, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 16 }}>
          + Add Risk
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(localRisks); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            ✓ Validate Risks
          </button>
          <button onClick={onClose}
            style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gaps Modal (unchanged) ───────────────────────────────────────────────
function GapsModal({ gaps, onSave, onClose }) {
  const [list, setList] = useState(
    gaps.map(g => ({ id: Math.random().toString(36).slice(2), description: typeof g === 'string' ? g : g.description }))
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 600, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Validate Gaps</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>Review and edit the compliance gaps for this policy.</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>
        {list.map((g, idx) => (
          <div key={g.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14, background: C.surfaceAlt }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.textMuted }}>Gap #{idx + 1}</span>
              <button onClick={() => setList(p => p.filter(x => x.id !== g.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
            <textarea value={g.description}
              onChange={e => setList(p => p.map(x => x.id === g.id ? { ...x, description: e.target.value } : x))}
              placeholder="Gap description…"
              style={{ width: "100%", minHeight: 70, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surface, outline: "none" }}
            />
          </div>
        ))}
        <button onClick={() => setList(p => [...p, { id: Math.random().toString(36).slice(2), description: "" }])}
          style={{ width: "100%", padding: 11, borderRadius: 9, border: `2px dashed ${C.borderStrong}`, background: C.surfaceAlt, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textMid, marginBottom: 16 }}>
          + Add Gap
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(list.map(l => l.description).filter(x => x.trim())); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            ✓ Validate Gaps
          </button>
          <button onClick={onClose}
            style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MitigationModal({ mitigation, onSave, onClose }) {
  const [text, setText] = useState(mitigation || "");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 600, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Validate Mitigation Plan</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>One action per line.</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Describe remediation actions, controls to implement…"
          style={{ width: "100%", minHeight: 220, padding: "12px 14px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, resize: "vertical", background: C.surfaceAlt, outline: "none", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(text); onClose(); }}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)" }}>
            ✓ Validate Mitigation Plan
          </button>
          <button onClick={onClose}
            style={{ padding: "12px 24px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textMid }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FinalizeModal({ defaultTitle, onSave, onClose }) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [saving, setSaving] = useState(false);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, backdropFilter: "blur(5px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 480, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}` }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 4 }}>Finalize Analysis</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>Choose a title — the validated risks will be saved to the risks database.</div>
        </div>
        <label style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6, display: "block" }}>Analysis Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
          placeholder="e.g., ISO 27001 Audit – Q2 2026"
          style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: F.body, color: C.text, background: C.surfaceAlt, outline: "none", marginBottom: 18 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={async () => { if (!title.trim()) return; setSaving(true); try { await onSave(title.trim()); } finally { setSaving(false); } }}
            disabled={!title.trim() || saving}
            style={{ flex: 1, padding: 12, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: F.body, color: "#fff",
                     cursor: title.trim() && !saving ? "pointer" : "not-allowed",
                     background: title.trim() ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "✓ Save & Finalize"}
          </button>
          <button onClick={onClose}
            style={{ padding: "12px 22px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textMid }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, color, bg, borderColor, action, children }) {
  return (
    <div style={{ padding: "10px 14px", background: bg, borderRadius: 9, borderLeft: `3px solid ${borderColor}`, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: F.body }}>{icon} {title}</div>
        {action}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function EditPill({ onClick, validated }) {
  return (
    <button onClick={onClick}
      style={{ padding: "3px 10px", borderRadius: 6, cursor: "pointer",
               border: `1px solid ${validated ? "#86EFAC" : C.borderStrong}`,
               background: validated ? C.successLight : C.surface,
               color: validated ? C.success : C.textMid,
               fontFamily: F.body, fontSize: 10, fontWeight: 700 }}>
      {validated ? "✓ Validated · Edit" : "Validate"}
    </button>
  );
}

// ─── Item detail row — fix #4 (editable comments) ─────────────────────────
function ItemDetail({ a, decision, onValidate, onEditAiComment, onEditCisoComment }) {
  const displayStatus = decision?.status || a.status;
  const m = STATUS_META[displayStatus];
  const typeLabel =
    a.type === "core_chapter" ? "Core" :
    a.type === "annex_family" ? "Family" :
    a.type === "annex_control" ? "Control" : "";

  return (
    <div style={{
      borderRadius: 9, border: `1px solid ${m ? m.border : C.border}`,
      background: m ? `${m.bg}50` : C.surfaceAlt, padding: "10px 12px", marginBottom: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>{m?.icon || "⏳"}</span>
          <span style={{ fontFamily: F.display, fontSize: 12, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.title}
          </span>
          {a.ref_id && <span style={{ fontFamily: F.body, fontSize: 9, color: C.textMuted, background: C.surface, padding: "1px 6px", borderRadius: 4, fontWeight: 600, border: `1px solid ${C.border}` }}>{a.ref_id}</span>}
          {typeLabel && <span style={{ fontFamily: F.body, fontSize: 8, color: C.purple, background: `${C.purple}12`, padding: "1px 5px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase" }}>{typeLabel}</span>}
          <StatusPill aiStatus={a.status} decision={decision?.status} />
        </div>
        <button onClick={() => onValidate(a)} style={{
          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
          border: `1px solid ${decision ? "#86EFAC" : C.borderStrong}`,
          background: decision ? C.successLight : C.surface,
          color: decision ? C.success : C.textMid,
          fontFamily: F.body, fontSize: 10, fontWeight: 700,
        }}>{decision ? "✅ Validated" : "Validate →"}</button>
      </div>

      {/* AI comment — now editable */}
      <EditableComment
        value={a.comment || ""}
        label="💬 AI Comment:"
        color={C.text}
        bgColor={C.surface}
        borderColor={C.border}
        onSave={(newVal) => onEditAiComment(a.item_id, newVal)}
        placeholder="No AI comment — click to add one."
      />

      {/* CISO comment — editable */}
      {decision && (
        <EditableComment
          value={decision.comment || ""}
          label="👤 CISO:"
          color={C.success}
          bgColor={C.successLight}
          borderColor="#86EFAC"
          onSave={(newVal) => onEditCisoComment(a.item_id, newVal)}
          placeholder="Add your CISO comment…"
        />
      )}
    </div>
  );
}

// ─── Policy Card ──────────────────────────────────────────────────────────
function PolicyCard({ policy, decisions, assets, onValidateItem,
                      onEditAiComment, onEditCisoComment, onSavePolicy }) {
  const [open, setOpen] = useState(true);
  const [showItems, setShowItems] = useState(false);

  // Dedupe AI risks ON FIRST RENDER — fix #3
  const initialRisks = useMemo(() => {
    const deduped = dedupeAiRisks(policy.risks || []);
    return deduped.map(r => ({
      id: r.id,
      description: r.description,
      riskClass: "asset",
      impact: 2,
      probability: 2,
      asset_ids: [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.policy_name]);

  const [risks, setRisks]             = useState(initialRisks);
  const [gaps, setGaps]               = useState(policy.gaps || []);
  const [mitigation, setMitigation]   = useState(policy.remediation || "");
  const [risksValidated, setRV]       = useState(false);
  const [gapsValidated, setGV]        = useState(false);
  const [mitiValidated, setMV]        = useState(false);
  const [showRisk, setShowRisk]       = useState(false);
  const [showGaps, setShowGaps]       = useState(false);
  const [showMiti, setShowMiti]       = useState(false);

  const itemsForCalc = policy.assessments || [];
  const liveScore = itemsForCalc.length
    ? Math.round(itemsForCalc.reduce((s, a) => {
        const finalSt = decisions?.[a.item_id]?.status || a.status || "Not covered";
        return s + (STATUS_META[finalSt]?.score ?? 0);
      }, 0) / itemsForCalc.length)
    : 0;
  const liveStatus = liveScore >= 80 ? "Covered" : liveScore >= 30 ? "Partial" : "Not covered";
  const m = STATUS_META[liveStatus];

  useEffect(() => {
    onSavePolicy?.({
      ...policy,
      _validated: { risks, gaps, mitigation, risksValidated, gapsValidated, mitiValidated, liveScore, liveStatus },
    });
    // eslint-disable-next-line
  }, [risks, gaps, mitigation, risksValidated, gapsValidated, mitiValidated, liveScore, liveStatus, decisions]);

  return (
    <div style={{
      borderRadius: 14, border: `1.5px solid ${open ? `${m.color}55` : C.border}`,
      background: C.surface, overflow: "hidden",
      boxShadow: open ? `0 4px 20px ${m.color}15` : C.shadow,
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "16px 20px",
        background: open ? `linear-gradient(to right,${m.bg},transparent)` : C.surfaceAlt,
        border: "none", cursor: "pointer", textAlign: "left",
        borderBottom: open ? `1px solid ${C.border}` : "none",
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg,${C.accent},${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 18, flexShrink: 0,
          boxShadow: `0 3px 8px ${C.accent}35` }}>📋</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 900, color: C.text }}>{policy.policy_name}</span>
            <StatusPill aiStatus={liveStatus} big />
            <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: m.color }}>{liveScore}%</span>
          </div>
          {policy.policy_summary && (
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>
              {policy.policy_summary}
            </div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 13 13" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "16px 20px" }}>

          <Section icon="⚠️" title={`Risks (${risks.length})`} color={C.danger}
                   bg={C.dangerLight} borderColor={C.danger}
                   action={<EditPill onClick={() => setShowRisk(true)} validated={risksValidated} />}>
            {risks.length === 0
              ? <span style={{ color: C.textMuted, fontStyle: "italic" }}>No risk yet — click Validate to add some.</span>
              : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {risks.map(r => {
                    const linkedAssets = (r.asset_ids || [])
                      .map(id => assets.find(a => a.id === id)?.intitule)
                      .filter(Boolean);
                    const clsLabel = r.riskClass === "both"
                      ? "Asset+Business"
                      : r.riskClass === "business" ? "Business" : "Asset";
                    return (
                      <li key={r.id} style={{ marginBottom: 4 }}>
                        {r.description || <em style={{ color: C.textMuted }}>(empty)</em>}
                        <span style={{ marginLeft: 6, fontSize: 10, color: C.textMuted, fontWeight: 600 }}>
                          · {clsLabel} · I:{r.impact}/P:{r.probability}
                          {linkedAssets.length > 0 && ` · 🎯 ${linkedAssets.join(", ")}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
          </Section>

          <Section icon="❗" title={`Gaps (${gaps.length})`} color={C.warning}
                   bg={C.warningLight} borderColor={C.warning}
                   action={<EditPill onClick={() => setShowGaps(true)} validated={gapsValidated} />}>
            {gaps.length === 0
              ? <span style={{ color: C.textMuted, fontStyle: "italic" }}>No gap yet.</span>
              : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {gaps.map((g, i) => <li key={i}>{typeof g === 'string' ? g : g.description}</li>)}
                </ul>
              )}
          </Section>

          <Section icon="🛠️" title="Mitigation Plan / Remediation" color={C.success}
                   bg={C.successLight} borderColor={C.success}
                   action={<EditPill onClick={() => setShowMiti(true)} validated={mitiValidated} />}>
            {mitigation
              ? <div style={{ whiteSpace: "pre-wrap" }}>{mitigation}</div>
              : <span style={{ color: C.textMuted, fontStyle: "italic" }}>No mitigation defined yet.</span>}
          </Section>

          {/* CHAPTER BREAKDOWN */}
          {policy.chapter_summary?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>
                📊 Compliance per chapter / control ({policy.chapter_summary.length})
              </div>
              {policy.chapter_summary.map((ch, i) => {
                const meta = STATUS_META[ch.status] || STATUS_META["Not covered"];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.purple, background: `${C.purple}10`, padding: "2px 8px", borderRadius: 4 }}>{ch.chapter_ref}</span>
                    <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.chapter_title}</span>
                    <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>
                      {ch.items_count} item{ch.items_count > 1 ? "s" : ""}
                    </span>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: meta.color }}>{ch.conf}% {ch.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ITEM-LEVEL DETAILS */}
          {policy.assessments?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setShowItems(s => !s)} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px",
                cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.textMid,
              }}>
                {showItems ? "▾ Hide" : "▸ Show"} item-level details ({policy.assessments.length})
              </button>
              {showItems && (
                <div style={{ marginTop: 10 }}>
                  {policy.assessments.map(a => (
                    <ItemDetail key={a.item_id} a={a}
                      decision={decisions?.[a.item_id]}
                      onValidate={onValidateItem}
                      onEditAiComment={onEditAiComment}
                      onEditCisoComment={onEditCisoComment}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showRisk && <RiskModal risks={risks} assets={assets}
                              onSave={(rr) => { setRisks(rr); setRV(true); }}
                              onClose={() => setShowRisk(false)} />}
      {showGaps && <GapsModal gaps={gaps} onSave={(gg) => { setGaps(gg); setGV(true); }} onClose={() => setShowGaps(false)} />}
      {showMiti && <MitigationModal mitigation={mitigation} onSave={(t) => { setMitigation(t); setMV(true); }} onClose={() => setShowMiti(false)} />}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function ConformityPage() {
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [validatedPolicies, setVP] = useState({});
  const [editedAiComments, setEditedAiComments] = useState({}); // fix #4
  const [modalItem, setModalItem] = useState(null);
  const [showFinalize, setShowFinalize] = useState(false);
  const fileRef = useRef();
  const [policies, setPolicies] = useState([]);
  const [assets, setAssets] = useState([]); // fix #1
  const [currentUser, setCurrentUser] = useState({ id: null, name: "Anonymous CISO" });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored?.id) {
        const fullName = `${stored.first_name || ""} ${stored.last_name || ""}`.trim() || stored.email || "CISO";
        setCurrentUser({ id: stored.id, name: fullName });
      }
    } catch {}
  }, []);

  // Load assets (fix #1)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_ASSETS);
        if (res.ok) setAssets(await res.json());
      } catch (e) { console.error("Failed to load assets", e); }
    })();
  }, []);

  const aiResults  = analysisData?.results  || {};
  const aiPolicies = analysisData?.policies || [];
  const allItems   = policies.flatMap(p => (p.chapters || []).flatMap(c => (c.items || [])));

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("http://localhost:3000/api/framauditor/imported");
        const data = await res.json();
        const norm = data.map(pkg => {
          const coreChaps = (pkg.core_chapters || []).map(ch => ({
            id: ch.id, title: ch.title, type: "core",
            items: [{ id: ch.id, title: ch.title, ref: ch.ref_id, type: "core_chapter" }],
          }));
          const annexChaps = (pkg.families || []).map(f => ({
            id: f.id, title: f.name, type: "family",
            items: (pkg.controls || []).filter(c => c.family_id === f.id && !c.is_exception)
              .map(c => ({ id: c.id, title: c.name, ref: c.ref_id, type: "control", family_id: f.id })),
          })).filter(ch => ch.items.length > 0);
          return { id: pkg.standard_id, title: pkg.title, version: pkg.version || "1.0",
                   color: "#3B6FFF", chapters: [...coreChaps, ...annexChaps] };
        });
        setPolicies(norm);
      } catch (e) { console.error(e); setPolicies([]); }
    })();
  }, []);

  // ─── KPI FIX #2 ────────────────────────────────────────────────────────
  // We collect the FINAL status (CISO decision wins, otherwise AI) for every
  // assessed item across every policy. Items are unique-by-ID. We only count
  // items that actually have a valid, known status.
  const kpis = useMemo(() => {
    // Use the union of all assessments across policies, deduped by item_id
    // (because the backend may inject the same item into several policies).
    const seen = new Map();
    for (const p of aiPolicies) {
      for (const a of (p.assessments || [])) {
        if (!a?.item_id) continue;
        if (!seen.has(a.item_id)) seen.set(a.item_id, a);
      }
    }
    const list = Array.from(seen.values());

    let covered = 0, partial = 0, notCovered = 0, scoreSum = 0, validCount = 0;
    let validatedByCiso = 0;
    for (const a of list) {
      const finalStatus = decisions[a.item_id]?.status || a.status;
      if (decisions[a.item_id]) validatedByCiso++;
      if (!STATUS_META[finalStatus]) continue;       // skip unknown / missing
      validCount++;
      scoreSum += STATUS_META[finalStatus].score;
      if      (finalStatus === "Covered") covered++;
      else if (finalStatus === "Partial") partial++;
      else                                notCovered++;
    }
    const globalScore = validCount ? Math.round(scoreSum / validCount) : 0;
    return {
      analyzedCount: validCount,
      coveredCount: covered,
      partialCount: partial,
      notCoveredCount: notCovered,
      validatedCount: validatedByCiso,
      globalScore,
      globalStatus: globalScore >= 80 ? "Covered" : globalScore >= 30 ? "Partial" : "Not covered",
    };
  }, [aiPolicies, decisions]);

  const handleFile = (f) => {
    if (!f) return;
    setUploadedFile(f);
    setAnalysisData(null);
    setDecisions({});
    setVP({});
    setEditedAiComments({});
    setStep(1);
  };
  const resetAll = () => {
    setStep(1); setUploadedFile(null); setAnalysisData(null);
    setDecisions({}); setVP({}); setEditedAiComments({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const runAnalysis = async () => {
    if (!uploadedFile || !policies.length) return;
    setStep(2);
    try {
      const fd = new FormData();
      fd.append("pdf", uploadedFile);
      fd.append("standardIds", JSON.stringify(policies.map(p => p.id)));
      const res  = await fetch(`${API_BASE}/analyze-pdf`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAnalysisData(data);
      setStep(3);
    } catch (e) {
      alert("Analysis failed: " + e.message);
      setStep(1);
    }
  };

  // ─── Comment editors — fix #4 ─────────────────────────────────────────
  const editAiComment = (item_id, newComment) => {
    setEditedAiComments(prev => ({ ...prev, [item_id]: newComment }));
    // also reflect in analysisData so UI shows it instantly
    setAnalysisData(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      next.policies = (next.policies || []).map(p => ({
        ...p,
        assessments: (p.assessments || []).map(a =>
          a.item_id === item_id ? { ...a, comment: newComment } : a
        ),
      }));
      next.results = { ...(next.results || {}) };
      if (next.results[item_id]) {
        next.results[item_id] = { ...next.results[item_id], comment: newComment };
      }
      return next;
    });
  };
  const editCisoComment = (item_id, newComment) => {
    setDecisions(prev => {
      const cur = prev[item_id] || { status: "", comment: "", date: new Date().toLocaleDateString("en-GB") };
      return { ...prev, [item_id]: { ...cur, comment: newComment } };
    });
  };

  const finalizeAnalysis = async (title) => {
    try {
      const standardId   = policies[0]?.id || null;
      const standardName = policies[0]?.title || "";

      const policiesPayload = aiPolicies.map(p => {
        const v = validatedPolicies[p.policy_name]?._validated || {};
        const items = (p.assessments || []).map(a => ({
          item_id:       a.item_id,
          ref_id:        a.ref_id,
          title:         a.title,
          type:          a.type,
          ai_status:     a.status,
          ai_confidence: a.conf || 0,
          ciso_status:   decisions[a.item_id]?.status || null,
          ciso_comment:  decisions[a.item_id]?.comment || a.comment || "",
        }));

        const remediations = (v.mitigation || "")
          .split("\n").map(s => s.trim()).filter(Boolean)
          .map(action => ({ action, priority: "Medium", due_date: null, assigned_to: "" }));

        const risks = (v.risks || []).filter(r => (r.description || "").trim()).map(r => ({
          intitule:     (r.description || "").slice(0, 100),
          description:  r.description,
          impact:       r.impact,
          probabilite:  r.probability,
          risk_class:   r.riskClass || "asset", // 'asset' | 'business' | 'both'
          asset_ids:    r.asset_ids || [],
          categorie:    "Information Security",
          owner:        currentUser.name,
          dueDate:      null,
          threats: [], vulnerabilities: [],
          mitigationPlan: remediations.map(x => x.action),
        }));

        return {
          policy_name:    p.policy_name,
          policy_summary: p.policy_summary || "",
          items,
          risks,
          gaps: v.gaps || [],
          remediations,
        };
      });

      const body = {
        title,
        document_name:   uploadedFile?.name || "",
        standard_id:     standardId,
        standard_name:   standardName,
        created_by_id:   currentUser.id,
        created_by_name: currentUser.name,
        policies:        policiesPayload,
      };

      const res  = await fetch(API_ANALYSIS, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      alert(`✅ Analysis saved!\nGlobal score: ${data.global_score}%\n${data.created_risk_ids?.length || 0} asset risk(s) and ${data.created_business_risk_ids?.length || 0} business risk(s) created.`);
      setShowFinalize(false);
      resetAll();
    } catch (e) {
      alert("❌ Save failed: " + e.message);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus, select:focus { border-color: ${C.accent} !important; outline: none; box-shadow: 0 0 0 3px rgba(59,111,255,0.08); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .fade { animation: fadeIn .25s ease; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>GRC Compliance</h1>
          <p style={{ fontFamily: F.body, color: C.textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Upload a document · Each detected policy is assessed against imported chapters & controls
          </p>
        </div>
        {step === 3 && (
          <button onClick={resetAll} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textMid }}>
            New analysis
          </button>
        )}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 22px", marginBottom: 22, display: "flex", alignItems: "center", boxShadow: C.shadow }}>
        {[{ n: 1, label: "Upload Document" }, { n: 2, label: "AI Analysis" }, { n: 3, label: "Review & Validate" }].map((s, i, arr) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepDot n={s.n} done={step > s.n} active={step === s.n} />
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? C.accent : step > s.n ? C.success : C.textMuted, whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "#86EFAC" : C.border, margin: "0 14px", borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.accent}30`, borderRadius: 16, padding: 24, boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <StepDot n={1} done={false} active={true} />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: C.text }}>Upload your compliance document</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>The AI will identify policies and assess each against the imported standards</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {uploadedFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.accentLight, border: `1.5px solid ${C.accent}35`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>📄</div>
                  <div>
                    <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.accent }}>{uploadedFile.name}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>Ready · {allItems.length} items across {policies.length} framework(s) · {assets.length} asset(s) loaded</div>
                  </div>
                </div>
                <button onClick={() => setUploadedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
              </div>
            ) : (
              <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{ padding: "42px 20px", background: C.surfaceAlt, border: `2px dashed ${C.borderStrong}`, borderRadius: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 11 }}>
                <div style={{ width: 52, height: 52, borderRadius: 13, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: C.text }}>Drop your document here</span>
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>or click to browse · PDF, Word, TXT</span>
              </div>
            )}
          </div>
          {uploadedFile && policies.length > 0 && (
            <button onClick={runAnalysis} className="fade" style={{
              width: "100%", padding: 15,
              background: `linear-gradient(135deg,${C.accent},${C.purple})`,
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
              fontFamily: F.body, color: "#fff", cursor: "pointer",
              boxShadow: `0 6px 22px ${C.accent}38`,
            }}>
              Run AI Analysis — {allItems.length} items
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="fade" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "52px 32px", boxShadow: C.shadow, textAlign: "center" }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", border: `4px solid ${C.accentLight}`, borderTop: `4px solid ${C.accent}`, animation: "spin .9s linear infinite", margin: "0 auto 22px" }} />
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Analyzing your document…</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted }}>
            Checking <strong style={{ color: C.accent }}>{uploadedFile?.name}</strong> against {allItems.length} items
          </div>
        </div>
      )}

      {step === 3 && analysisData && (
        <div className="fade">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Global compliance (live)</span>
              <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 900, color: STATUS_META[kpis.globalStatus].color }}>
                {kpis.globalScore}%
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Items analyzed", value: kpis.analyzedCount,    color: C.accent },
              { label: "Covered",        value: kpis.coveredCount,     color: C.success },
              { label: "Partial",        value: kpis.partialCount,     color: C.warning },
              { label: "Not covered",    value: kpis.notCoveredCount,  color: C.danger },
              { label: "CISO validated", value: kpis.validatedCount,   color: C.purple },
            ].map(k => (
              <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", textAlign: "center", boxShadow: C.shadow }}>
                <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 9, background: C.accentLight, border: `1px solid ${C.accent}30` }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.accent }}>{uploadedFile.name}</span>
            </div>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>
              {aiPolicies.length} {aiPolicies.length > 1 ? "policies" : "policy"} detected · {kpis.analyzedCount} unique item(s)
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {aiPolicies.map((p, idx) => (
              <PolicyCard key={`${p.policy_name}_${idx}`}
                policy={p}
                decisions={decisions}
                assets={assets}
                onValidateItem={(item) => setModalItem(item)}
                onEditAiComment={editAiComment}
                onEditCisoComment={editCisoComment}
                onSavePolicy={(updated) => setVP(prev => ({ ...prev, [p.policy_name]: updated }))}
              />
            ))}
          </div>

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
            <button onClick={() => setShowFinalize(true)}
              style={{ padding: "16px 48px", borderRadius: 12, border: "none",
                       background: "linear-gradient(135deg,#16A34A,#22C55E)",
                       color: "#fff", fontFamily: F.body, fontSize: 15, fontWeight: 800,
                       cursor: "pointer", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
              ✓ Finalize & Save Analysis
            </button>
          </div>
        </div>
      )}

      {modalItem && (
        <ValidationModal
          item={{ id: modalItem.item_id, title: modalItem.title, ref: modalItem.ref_id }}
          aiResult={modalItem}
          savedDecision={decisions[modalItem.item_id]}
          onSave={dec => setDecisions(prev => ({ ...prev, [modalItem.item_id]: dec }))}
          onClose={() => setModalItem(null)}
        />
      )}
      {showFinalize && (
        <FinalizeModal
          defaultTitle={`Compliance Analysis - ${new Date().toLocaleDateString("en-GB")}`}
          onSave={finalizeAnalysis}
          onClose={() => setShowFinalize(false)}
        />
      )}
    </div>
  );
}