import { useState, useRef, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  accent: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
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

const STATUS_META = {
  "Covered":     { label: "Covered",     color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", icon: "✅" },
  "Partial":     { label: "Partial",     color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: "⚠️" },
  "Not covered": { label: "Not covered", color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", icon: "❌" },
};

const RSSI_OPTIONS = ["Covered", "Partially covered", "Not covered", "Not applicable"];
const RSSI_STYLE = {
  "Covered":           { color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
  "Partially covered": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  "Not covered":       { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  "Not applicable":    { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
};

// ─── StepDot ──────────────────────────────────────────────────────────────────
function StepDot({ n, done, active }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: done ? C.success : active ? C.accent : C.accentLight,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: active ? `2px solid ${C.accent}` : "none",
      boxShadow: active ? "0 0 0 3px rgba(59,111,255,0.12)" : "none",
      transition: "all .2s",
    }}>
      {done
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        : <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : C.textMuted }}>{n}</span>
      }
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ aiStatus, decision }) {
  if (decision) {
    const s = RSSI_STYLE[decision] || RSSI_STYLE["Not applicable"];
    return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "inline-block", fontFamily: F.body }}>👤 {decision}</span>;
  }
  if (!aiStatus) return null;
  const m = STATUS_META[aiStatus];
  if (!m) return null;
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, display: "inline-block", fontFamily: F.body }}>{m.icon} {m.label}</span>;
}

// ─── Validation Modal ─────────────────────────────────────────────────────────
function ValidationModal({ item, aiResult, savedDecision, pkgColor, onSave, onClose }) {
  const [rssiVal, setRssiVal] = useState(savedDecision?.status || "");
  const [rssiComment, setRssiComment] = useState(savedDecision?.comment || "");
  const [saved, setSaved] = useState(false);
  const m = aiResult ? STATUS_META[aiResult.status] : null;

  const handleSave = () => {
    if (!rssiVal) return;
    onSave({ status: rssiVal, comment: rssiComment, date: new Date().toLocaleDateString("en-GB") });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, backdropFilter: "blur(5px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, width: 520, maxWidth: "92vw", padding: "28px 30px", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, animation: "slideUp .2s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>CISO Validation</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMid }}>
              <span style={{ color: pkgColor, fontWeight: 700 }}>{item.title}</span>
              {item.ref && <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "1px 7px", borderRadius: 5, fontWeight: 600, border: `1px solid ${C.border}` }}>{item.ref}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        {m && (
          <div style={{ background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: m.color }}>{m.icon} AI: {m.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 80, height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${aiResult.conf}%`, background: m.color, borderRadius: 4 }} />
                </div>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: m.color }}>{aiResult.conf}%</span>
              </div>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>{aiResult.text}</div>
          </div>
        )}
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Your Decision</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
          {RSSI_OPTIONS.map(opt => {
            const s = RSSI_STYLE[opt];
            const checked = rssiVal === opt;
            return (
              <label key={opt} onClick={() => setRssiVal(opt)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, cursor: "pointer", border: `1.5px solid ${checked ? s.color : C.border}`, background: checked ? s.bg : C.surfaceAlt, transition: "all .15s" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${checked ? s.color : C.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {checked && <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />}
                </div>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: checked ? 700 : 400, color: checked ? s.color : C.textMid }}>{opt}</span>
              </label>
            );
          })}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Comment / Justification</div>
        <textarea value={rssiComment} onChange={e => setRssiComment(e.target.value)}
          placeholder="Explain your decision, add observations or reservations…"
          style={{ width: "100%", minHeight: 80, padding: "11px 14px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F.body, color: C.text, lineHeight: 1.6, resize: "vertical", background: C.surfaceAlt, outline: "none" }}
        />
        <button onClick={handleSave} disabled={!rssiVal} style={{
          width: "100%", marginTop: 14, padding: "12px", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: F.body, color: "#fff", cursor: rssiVal ? "pointer" : "not-allowed",
          background: rssiVal ? "linear-gradient(135deg,#16A34A,#22C55E)" : C.borderStrong,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: rssiVal ? "0 4px 14px rgba(22,163,74,0.25)" : "none", transition: "all .2s",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          Validate CISO Decision
        </button>
        {saved && <div style={{ marginTop: 10, textAlign: "center", fontFamily: F.body, fontSize: 13, color: C.success, fontWeight: 700, animation: "slideUp .2s ease" }}>✅ Decision recorded and traced</div>}
        {savedDecision && (
          <div style={{ marginTop: 14, background: C.successLight, border: "1.5px solid #86EFAC", borderRadius: 10, padding: "13px 16px" }}>
            <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>📋 Audit Trail</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: "#166534", marginBottom: 3 }}>Validated by CISO on <strong>{savedDecision.date}</strong></div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: "#166534" }}>Status: <strong>{savedDecision.status}</strong></div>
            {savedDecision.comment && <div style={{ fontFamily: F.body, fontSize: 12, color: "#166534", fontStyle: "italic", background: "#DCFCE7", borderRadius: 7, padding: "7px 11px", marginTop: 8 }}>"{savedDecision.comment}"</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ResultPackage Component ──────────────────────────────────────────────────
function ResultPackage({ pkg, aiResults, decisions, onValidate }) {
  const [open, setOpen] = useState(true);
  const allItems = pkg.chapters?.flatMap(c => c.items) || [];
  
  const getAiResult = (itemId) => {
    return aiResults?.[String(itemId)] || aiResults?.[itemId] || null;
  };
  
  const count = (statusCheck) => allItems.filter(i => {
    const result = getAiResult(i.id);
    return statusCheck(decisions[i.id]?.status || result?.status);
  }).length;
  
  const nCovered    = count(s => s === "Covered");
  const nPartial    = count(s => s === "Partial" || s === "Partially covered");
  const nNotCovered = count(s => s === "Not covered");

  return (
    <div style={{ borderRadius: 14, border: `1.5px solid ${open ? pkg.color + "44" : C.border}`, background: C.surface, overflow: "hidden", boxShadow: open ? `0 4px 20px ${pkg.color}12` : C.shadow, transition: "all .2s" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "14px 18px",
        background: open ? `linear-gradient(to right,${pkg.color}0e,transparent)` : C.surfaceAlt,
        border: "none", cursor: "pointer", textAlign: "left",
        borderBottom: open ? `1px solid ${C.border}` : "none",
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${pkg.color},${pkg.color}bb)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 3px 8px ${pkg.color}35` }}>
          <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
            <path d="M8.5 1L2 4.5V9C2 12.5 5 15.8 8.5 16.5C12 15.8 15 12.5 15 9V4.5L8.5 1Z" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.5 8.5L7.5 10.5L11.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.display, fontSize: 15, fontWeight: 900, color: C.text }}>{pkg.title}</span>
            <span style={{ fontFamily: F.body, fontSize: 11, color: pkg.color, background: `${pkg.color}15`, padding: "1px 7px", borderRadius: 5, fontWeight: 700 }}>v{pkg.version}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {nCovered    > 0 && <span style={{ fontFamily: F.body, fontSize: 11, color: C.success,  fontWeight: 600 }}>✅ {nCovered} covered</span>}
            {nPartial    > 0 && <span style={{ fontFamily: F.body, fontSize: 11, color: C.warning,  fontWeight: 600 }}>⚠️ {nPartial} partial</span>}
            {nNotCovered > 0 && <span style={{ fontFamily: F.body, fontSize: 11, color: C.danger,   fontWeight: 600 }}>❌ {nNotCovered} not covered</span>}
          </div>
        </div>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
          <path d="M2.5 5L6.5 9L10.5 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {pkg.chapters.map(ch => (
            <div key={ch.id}>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, paddingLeft: 2 }}>
                {ch.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {ch.items.map(item => {
                  const ai = getAiResult(item.id);
                  const dec = decisions?.[item.id] || null;
                  const displayStatus = dec?.status || ai?.status;
                  const m = displayStatus ? STATUS_META[displayStatus] : null;
                  
                  const evidence = ai?.evidence || [];
                  let risksList = ai?.risks || ai?.threats || [];
                  let gapsList = ai?.gaps || [];
                  let remediationText = ai?.remediation || "À définir";
                  const confidence = ai?.conf || 0;

                  if (!Array.isArray(risksList)) risksList = [];
                  if (!Array.isArray(gapsList)) gapsList = [];

                  return (
                    <div key={item.id} style={{
                      borderRadius: 10,
                      border: `1.5px solid ${m ? m.border : C.border}`,
                      background: m ? m.bg + "70" : C.surfaceAlt,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                          <div style={{ fontSize: 18, flexShrink: 0 }}>{m?.icon || "⏳"}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
                              <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: C.text }}>{item.title}</span>
                              {item.ref && <span style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, background: C.surface, padding: "2px 8px", borderRadius: 5, fontWeight: 600, border: `1px solid ${C.border}` }}>{item.ref}</span>}
                            </div>
                            <StatusPill aiStatus={ai?.status} decision={dec?.status} />
                          </div>
                        </div>
                        <button onClick={() => onValidate(item, ai, pkg.color)} style={{
                          padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                          border: `1px solid ${dec ? "#86EFAC" : C.borderStrong}`,
                          background: dec ? C.successLight : C.surface,
                          color: dec ? C.success : C.textMid,
                          fontFamily: F.body, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                        }}>
                          {dec ? "✅ Validated" : "Validate →"}
                        </button>
                      </div>

                      {evidence && evidence.length > 0 && evidence[0] !== "Aucune preuve textuelle trouvée" && evidence[0] !== "Aucune preuve" && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#EFF6FF", borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 5 }}>📌 Preuves trouvées :</div>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {evidence.slice(0, 3).map((e, i) => <li key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 3 }}>"{e}"</li>)}
                          </ul>
                        </div>
                      )}

                      {risksList.length > 0 && risksList[0] !== "Aucun risque majeur" && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, borderLeft: `3px solid ${C.danger}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 5 }}>⚠️ Risks :</div>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {risksList.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 3 }}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {gapsList.length > 0 && gapsList[0] !== "Aucun écart majeur" && gapsList[0] !== "Information insuffisante" && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#FFFBEB", borderRadius: 8, borderLeft: `3px solid ${C.warning}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 5 }}>❗ Gaps :</div>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {gapsList.map((g, i) => <li key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 3 }}>{g}</li>)}
                          </ul>
                        </div>
                      )}

                      {remediationText && remediationText !== "Maintenir la conformité" && remediationText !== "Documenter les exigences" && (
                        <div style={{ marginTop: 6, padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, borderLeft: `3px solid ${C.success}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.success, marginBottom: 5 }}>🛠️ Remediation :</div>
                          <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{remediationText}</div>
                        </div>
                      )}

                      {confidence > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <div style={{ width: 100, height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${confidence}%`, background: m?.color || C.accent, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{confidence}% confidence</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ConformityPage() {
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [decisions, setDecisions] = useState({});
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const fileRef = useRef();
  const [policies, setPolicies] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentPolicies, setDocumentPolicies] = useState([]);
  const [policyComparisons, setPolicyComparisons] = useState([]);
  const [importingRisks, setImportingRisks] = useState(false);

  const resetAll = () => {
    setStep(1);
    setUploadedFile(null);
    setAiResults({});
    setDecisions({});
    setDocumentPolicies([]);
    setPolicyComparisons([]);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  useEffect(() => {
    const loadImportedPolicies = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/framauditor/imported");
        if (!res.ok) throw new Error('failed to fetch policies');
        const data = await res.json();
        setPolicies(data);
      } catch (err) {
        console.error("Error loading policies:", err);
        setPolicies([]);
      }
    };
    loadImportedPolicies();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/ai/test");
      if (res.ok) {
        console.log("✅ Backend connecté");
        return true;
      }
    } catch (err) {
      console.error("❌ Backend non accessible:", err);
      return false;
    }
  };

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const allItems = policies.flatMap(p => p.chapters?.flatMap(c => c.items) || []);
  const analyzedCount = Object.keys(aiResults).length;
  const count = (fn) => allItems.filter(i => fn(decisions[i.id]?.status || aiResults[String(i.id)]?.status || aiResults[i.id]?.status)).length;
  const coveredCount = count(s => s === "Covered");
  const partialCount = count(s => s === "Partial" || s === "Partially covered");
  const notCoveredCount = count(s => s === "Not covered");
  const validatedCount = Object.keys(decisions).length;

  const handleFile = (f) => {
    if (!f) return;
    setUploadedFile(f);
    setSelectedFile(f);
    setAiResults({}); 
    setDecisions({}); 
    setDocumentPolicies([]);
    setPolicyComparisons([]);
    setStep(1); 
    setFilterStatus("all");
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const importRisksToDatabase = async () => {
    if (Object.keys(aiResults).length === 0) {
      alert("Aucun résultat d'analyse à importer");
      return;
    }
    
    setImportingRisks(true);
    
    try {
      console.log("📤 Envoi requête import risques...");
      console.log("URL:", "http://localhost:3000/api/ai/import-risks");
      console.log("Data:", {
        analysisResults: aiResults,
        sourceReport: uploadedFile?.name || "Rapport de conformité"
      });
      
      const response = await fetch("http://localhost:3000/api/ai/import-risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisResults: aiResults,
          sourceReport: uploadedFile?.name || "Rapport de conformité",
          policyId: policies[0]?.id || "unknown",
          policyName: policies[0]?.title || "ISO 27001"
        })
      });
      
      console.log("Response status:", response.status);
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (response.ok) {
        alert(`✅ ${data.message}\n${data.risks?.length || 0} risque(s) importé(s) avec succès !`);
      } else {
        alert(`❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur import:", error);
      alert("Erreur lors de l'import des risques: " + error.message);
    } finally {
      setImportingRisks(false);
    }
  };

  const runAnalysis = async () => {
    if (!uploadedFile || policies.length === 0) {
      console.error("❌ Pas de fichier ou de politiques");
      alert("Veuillez d'abord importer des politiques et sélectionner un document");
      return;
    }

    setStep(2);

    try {
      const formData = new FormData();
      const file = fileRef.current?.files?.[0] || selectedFile;
      if (!file) throw new Error("Aucun fichier sélectionné");
      formData.append("pdf", file);
      
      const allItemsList = [];
      policies.forEach(pkg => {
        pkg.chapters?.forEach(chapter => {
          chapter.items?.forEach(item => {
            allItemsList.push({
              id: item.id,
              title: item.title,
              description: item.description || "",
              control_text: item.title + " " + (item.description || ""),
              package_id: pkg.id,
              chapter_id: chapter.id,
              type: item.type || "control"
            });
          });
        });
      });
      
      console.log("📊 Items à analyser:", allItemsList.length);
      formData.append("selectedItems", JSON.stringify(allItemsList));
      formData.append("policies", JSON.stringify(policies));
      
      console.log("📤 Envoi de la requête d'analyse...");
      const res = await fetch("http://localhost:3000/api/ai/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await res.json();
      console.log("📥 Résultats reçus:", data);
      
      if (data.document_policies && data.document_policies.length > 0) {
        setDocumentPolicies(data.document_policies);
        console.log("📋 Politiques du document:", data.document_policies);
      }
      if (data.policy_comparisons && data.policy_comparisons.length > 0) {
        setPolicyComparisons(data.policy_comparisons);
        console.log("📊 Comparaisons des politiques:", data.policy_comparisons);
      }
      if (data.results && typeof data.results === 'object') {
        const formattedResults = {};
        Object.entries(data.results).forEach(([id, result]) => {
          const numericId = parseInt(id);
          const finalId = !isNaN(numericId) ? numericId : id;
          
          const normalizeStatus = (s) => {
            const clean = (s || "").toLowerCase().trim();
            if (clean === "covered") return "Covered";
            if (clean === "partial") return "Partial";
            if (clean === "not covered") return "Not covered";
            if (clean.includes("partial")) return "Partial";
            if (clean.includes("not")) return "Not covered";
            if (clean.includes("cover")) return "Covered";
            return "Not covered";
          };
          
          const rawRisks = (() => {
            if (Array.isArray(result.risks)) return result.risks;
            if (Array.isArray(result.threats)) return result.threats;
            if (result.risk_analysis && Array.isArray(result.risk_analysis.risks)) return result.risk_analysis.risks;
            return [];
          })();
          
          const rawRemediation = (() => {
            const r = result.remediation;
            if (!r) return "";
            if (typeof r === "string") return r;
            if (typeof r === "object") {
              const actions = Array.isArray(r.actions) ? r.actions.join("; ") : "";
              const priority = r.priority ? `[${r.priority}] ` : "";
              const timeline = r.timeline ? ` (${r.timeline})` : "";
              return `${priority}${actions}${timeline}`;
            }
            return String(r);
          })();
          
          const rawEvidence = (() => {
            if (Array.isArray(result.evidence_found)) return result.evidence_found;
            if (Array.isArray(result.evidence)) return result.evidence;
            return [];
          })();
          
          formattedResults[finalId] = {
            status: normalizeStatus(result.compliance_status || result.status || "Not covered"),
            conf: result.compliance_percentage || result.conf || 50,
            text: result.justification || result.text || result.audit_notes || "Analyse complétée",
            risks: rawRisks,
            gaps: Array.isArray(result.gaps) ? result.gaps : [],
            remediation: rawRemediation,
            evidence: rawEvidence,
          };
        });
        
        console.log("✅ Résultats formatés:", Object.keys(formattedResults).length);
        setAiResults(formattedResults);
        setStep(3);
      } else {
        console.error("❌ Format de résultats invalide:", data);
        throw new Error("Format de résultats invalide");
      }
    } catch (err) {
      console.error("❌ Analysis error:", err);
      alert(`Erreur lors de l'analyse: ${err.message}`);
      setStep(1);
    }
  };
  
  const filteredPackages = policies.map(pkg => ({
    ...pkg,
    chapters: pkg.chapters?.map(ch => ({
      ...ch,
      items: ch.items?.filter(item => {
        const itemIdStr = String(item.id);
        const aiResult = aiResults[itemIdStr] || aiResults[item.id];
        if (filterStatus === "all") return true;
        const s = decisions[item.id]?.status || aiResult?.status;
        if (filterStatus === "Covered") return s === "Covered";
        if (filterStatus === "Partial") return s === "Partial" || s === "Partially covered";
        if (filterStatus === "Not covered") return s === "Not covered";
        if (filterStatus === "Validated") return !!decisions[item.id];
        return true;
      }) || [],
    })).filter(ch => ch.items.length > 0),
  })).filter(pkg => pkg.chapters?.length > 0);

  return (
    <div style={{ background: C.bg, minHeight: "100%", paddingBottom: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus, input:focus { border-color: ${C.accent} !important; outline: none; box-shadow: 0 0 0 3px rgba(59,111,255,0.08); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0; } to { transform:none; opacity:1; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .fade { animation: fadeIn .25s ease; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>GRC Compliance</h1>
          <p style={{ fontFamily: F.body, color: C.textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Upload a document · AI checks all platform policies · CISO validation
          </p>
        </div>
        {step === 3 && (
          <button onClick={resetAll} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textMid, display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 6.5A5.5 5.5 0 0 1 11.5 4M11.5 4V1.5M11.5 4H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            New analysis
          </button>
        )}
      </div>

      {/* STEP TRACKER */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 22px", marginBottom: 22, display: "flex", alignItems: "center", boxShadow: C.shadow }}>
        {[
          { n: 1, label: "Upload Document" },
          { n: 2, label: "AI Analysis" },
          { n: 3, label: "Review & Validate" },
        ].map((s, i, arr) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StepDot n={s.n} done={step > s.n} active={step === s.n} />
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? C.accent : step > s.n ? C.success : C.textMuted, whiteSpace: "nowrap" }}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "#86EFAC" : C.border, margin: "0 14px", borderRadius: 2, transition: "background .3s" }} />}
          </div>
        ))}
      </div>

      {/* STEP 1 — UPLOAD */}
      {step === 1 && (
        <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.accent}30`, borderRadius: 16, padding: "24px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <StepDot n={1} done={false} active={true} />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 800, color: C.text }}>Upload your compliance document</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>The AI will check it against all policies imported in your platform</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {uploadedFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.accentLight, border: `1.5px solid ${C.accent}35`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 3px 10px ${C.accent}30` }}>📄</div>
                  <div>
                    <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.accent }}>{uploadedFile.name}</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>Ready · will be checked against {allItems.length} policies across {policies.length} frameworks</div>
                  </div>
                </div>
                <button onClick={() => setUploadedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20, padding: 4, borderRadius: 6 }}>×</button>
              </div>
            ) : (
              <div onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
                onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.background = C.surfaceAlt; }}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.background = C.surfaceAlt; }}
                onClick={() => fileRef.current?.click()}
                style={{ padding: "42px 20px", background: C.surfaceAlt, border: `2px dashed ${C.borderStrong}`, borderRadius: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 11, transition: "all .2s" }}>
                <div style={{ width: 52, height: 52, borderRadius: 13, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${C.accent}30` }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                </div>
                <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: C.text }}>Drop your document here</span>
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>or click to browse · PDF, Word, TXT</span>
              </div>
            )}
          </div>

          {policies.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: C.shadow }}>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}>Imported Policies to be analyzed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {policies.map(pkg => (
                  <div key={pkg.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: pkg.color || C.accent, flexShrink: 0, boxShadow: `0 0 0 3px ${pkg.color || C.accent}25` }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.text }}>{pkg.title}</span>
                      <span style={{ fontFamily: F.body, fontSize: 11, color: pkg.color || C.accent, background: `${pkg.color || C.accent}15`, padding: "1px 7px", borderRadius: 5, fontWeight: 700, marginLeft: 8 }}>v{pkg.version || "1.0"}</span>
                    </div>
                    <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                      {pkg.chapters?.reduce((s, c) => s + (c.items?.length || 0), 0) || 0} items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedFile && policies.length > 0 && (
            <button onClick={runAnalysis} className="fade" style={{
              width: "100%", padding: "15px", background: `linear-gradient(135deg,${C.accent},${C.purple})`,
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, fontFamily: F.body, color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: `0 6px 22px ${C.accent}38`, transition: "box-shadow .2s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>
              Run AI Analysis — {allItems.length} policies
            </button>
          )}
          
          {policies.length === 0 && (
            <div style={{ background: C.warningLight, border: `1px solid ${C.warning}`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.warning }}>⚠️ No policies imported yet. Please go to the Policy Library and import policies first.</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — ANALYZING */}
      {step === 2 && (
        <div className="fade" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "52px 32px", boxShadow: C.shadow, textAlign: "center" }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", border: `4px solid ${C.accentLight}`, borderTop: `4px solid ${C.accent}`, animation: "spin .9s linear infinite", margin: "0 auto 22px" }} />
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Analyzing your document…</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, marginBottom: 30 }}>
            Checking <strong style={{ color: C.accent }}>{uploadedFile?.name}</strong> against {allItems.length} policies
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, margin: "0 auto" }}>
            {policies.map((pkg, i) => (
              <div key={pkg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 9, background: C.surfaceAlt, border: `1px solid ${C.border}`, animation: `fadeIn .3s ease ${i * 0.2}s both` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: pkg.color || C.accent, animation: "pulse 1.2s infinite" }} />
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMid, fontWeight: 600 }}>{pkg.title}</span>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginLeft: "auto" }}>
                  {pkg.chapters?.reduce((s, c) => s + (c.items?.length || 0), 0)} items
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — RESULTS */}
      {step === 3 && (
        <div className="fade">
          {/* Bouton import risques IA */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={importRisksToDatabase}
              disabled={importingRisks || Object.keys(aiResults).length === 0}
              style={{
                padding: "8px 20px",
                borderRadius: 9,
                border: "none",
                cursor: importingRisks ? "not-allowed" : "pointer",
                background: `linear-gradient(135deg, ${C.purple}, ${C.accent})`,
                color: "#fff",
                fontFamily: F.body,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: importingRisks ? 0.7 : 1
              }}
            >
              {importingRisks ? (
                <>⏳ Import en cours...</>
              ) : (
                <>📥 Importer les risques dans la base</>
              )}
            </button>
          </div>

          {/* SECTION: Politiques du document analysé */}
          {documentPolicies.length > 0 && (
            <div style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`, 
              borderRadius: 16, 
              padding: "16px 20px", 
              marginBottom: 20,
              boxShadow: C.shadow
            }}>
              <div style={{ 
                fontFamily: F.display, 
                fontSize: 14, 
                fontWeight: 800, 
                color: C.text, 
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>📄</span> Politiques identifiées dans le document analysé
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {documentPolicies.map((policy, idx) => (
                  <div key={idx} style={{
                    background: C.accentLight,
                    border: `1px solid ${C.accent}30`,
                    borderRadius: 12,
                    padding: "16px",
                    transition: "all .2s",
                  }}>
                    <div style={{ 
                      fontFamily: F.display, 
                      fontSize: 15, 
                      fontWeight: 800, 
                      color: C.accent,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderBottom: `1px solid ${C.accent}20`,
                      paddingBottom: 8
                    }}>
                      <span>📌</span> {policy.name}
                    </div>
                    
                    <div style={{ 
                      fontSize: 13, 
                      color: C.textMid, 
                      marginBottom: 12,
                      lineHeight: 1.6,
                      background: C.surface,
                      padding: "12px",
                      borderRadius: 8,
                      borderLeft: `3px solid ${C.accent}`
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, color: C.text }}>📋 Description:</div>
                      {policy.description || "Aucune description disponible"}
                    </div>
                    
                    {policy.key_requirements && policy.key_requirements.length > 0 && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ 
                          fontSize: 11, 
                          fontWeight: 600, 
                          color: C.accent,
                          cursor: "pointer"
                        }}>
                          📋 {policy.key_requirements.length} exigence(s)
                        </summary>
                        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                          {policy.key_requirements.slice(0, 5).map((req, i) => (
                            <li key={i} style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: Comparaison des politiques */}
          {policyComparisons.length > 0 && (
            <div style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`, 
              borderRadius: 16, 
              padding: "16px 20px", 
              marginBottom: 20,
              boxShadow: C.shadow
            }}>
              <div style={{ 
                fontFamily: F.display, 
                fontSize: 14, 
                fontWeight: 800, 
                color: C.text, 
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>🔄</span> Analyse des politiques - Comparaison avec ISO 27001
              </div>
              
              {policyComparisons.map((comparison, idx) => {
                const originalPolicy = documentPolicies.find(p => p.name === comparison.policy_name);
                const statusColor = comparison.status === "Compliant" ? C.success : 
                                  comparison.status === "Partial" ? C.warning : C.danger;
                const statusIcon = comparison.status === "Compliant" ? "✅" : 
                                  comparison.status === "Partial" ? "⚠️" : "❌";
                
                return (
                  <div key={idx} style={{
                    background: C.surfaceAlt,
                    border: `1px solid ${statusColor}40`,
                    borderRadius: 12,
                    padding: "16px",
                    marginBottom: idx < policyComparisons.length - 1 ? 16 : 0
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 10, 
                      marginBottom: 12,
                      borderBottom: `1px solid ${C.border}`,
                      paddingBottom: 10,
                      flexWrap: "wrap"
                    }}>
                      <span style={{ fontSize: 24 }}>{statusIcon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, color: C.text }}>
                          {comparison.policy_name}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ 
                            fontSize: 11, 
                            fontWeight: 600, 
                            color: statusColor,
                            background: `${statusColor}15`,
                            padding: "2px 8px",
                            borderRadius: 20
                          }}>
                            {comparison.status} ({comparison.compliance_score}%)
                          </span>
                          {comparison.iso_mappings && comparison.iso_mappings.length > 0 && (
                            <span style={{ fontSize: 11, color: C.textMuted }}>
                              📌 {comparison.iso_mappings.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {originalPolicy && originalPolicy.description && (
                      <div style={{ 
                        fontSize: 12, 
                        color: C.textMid, 
                        marginBottom: 12,
                        padding: "8px 12px",
                        background: C.surface,
                        borderRadius: 8,
                        borderLeft: `3px solid ${C.accent}`
                      }}>
                        <strong style={{ color: C.accent }}>📋 Politique actuelle:</strong><br/>
                        {originalPolicy.description}
                      </div>
                    )}
                    
                    {comparison.risks && comparison.risks.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.danger, marginBottom: 6 }}>
                          ⚠️ Risques liés à l'obsolescence :
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {comparison.risks.map((risk, i) => (
                            <li key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {comparison.gaps && comparison.gaps.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.warning, marginBottom: 6 }}>
                          ❗ Gaps par rapport aux exigences ISO :
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {comparison.gaps.map((gap, i) => (
                            <li key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {comparison.remediation && (
                      <div style={{ 
                        marginTop: 10, 
                        padding: "10px 12px", 
                        background: "#F0FDF4", 
                        borderRadius: 8,
                        borderLeft: `3px solid ${C.success}`
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.success, marginBottom: 6 }}>
                          🛠️ Plan de remédiation :
                        </div>
                        <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
                          <strong>Priorité: {comparison.remediation.priority}</strong><br/>
                          Actions: {comparison.remediation.actions.join("; ")}<br/>
                          Délai: {comparison.remediation.timeline}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Policies analyzed", value: analyzedCount,    color: C.accent },
              { label: "Covered",           value: coveredCount,     color: C.success },
              { label: "Partial",           value: partialCount,     color: C.warning },
              { label: "Not covered",       value: notCoveredCount,  color: C.danger },
              { label: "CISO validated",    value: validatedCount,   color: C.purple },
            ].map(k => (
              <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", textAlign: "center", boxShadow: C.shadow }}>
                <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* File chip + filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 9, background: C.accentLight, border: `1px solid ${C.accent}30` }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.accent }}>{uploadedFile.name}</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "All" },
                { key: "Covered", label: "✅ Covered" },
                { key: "Partial", label: "⚠️ Partial" },
                { key: "Not covered", label: "❌ Not covered" },
                { key: "Validated", label: "👤 Validated" },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
                  padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: filterStatus === f.key ? `linear-gradient(135deg,${C.accent},${C.purple})` : C.surfaceAlt,
                  color: filterStatus === f.key ? "#fff" : C.textMid,
                  fontFamily: F.body, fontSize: 11, fontWeight: 600, transition: "all .15s",
                  boxShadow: filterStatus === f.key ? `0 2px 6px ${C.accent}35` : "none",
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Result packages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredPackages.length === 0
              ? <div style={{ textAlign: "center", padding: "40px 0", fontFamily: F.body, color: C.textMuted, fontSize: 14 }}>No items match this filter.</div>
              : filteredPackages.map(pkg => (
                <ResultPackage key={pkg.id} pkg={pkg} aiResults={aiResults} decisions={decisions}
                  onValidate={(item, ai, pkgColor) => setModal({ item, ai, pkgColor })}
                />
              ))
            }
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ValidationModal
          item={modal.item}
          aiResult={modal.ai}
          savedDecision={decisions[modal.item.id]}
          pkgColor={modal.pkgColor}
          onSave={dec => { setDecisions(prev => ({ ...prev, [modal.item.id]: dec })); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}