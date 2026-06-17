import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import {
  X, Plus, Trash2, Shield, ShieldCheck, FileText, Target,
  History, AlertTriangle, ChevronDown, ChevronRight, Save,
  TrendingDown, TrendingUp, CheckCircle2, Clock,
} from "lucide-react";

const API = "http://localhost:3000/api/risks";

const getRiskColor = (impact, proba) => {
  const i = Number(impact ?? 0), p = Number(proba ?? 0);
  const score = (i + 1) * (p + 1);
  if (score <= 4)  return { bg: "#11093e", label: "Low",      score };
  if (score <= 9)  return { bg: "#11093e", label: "Moderate", score };
  if (score <= 16) return { bg: "#11093e", label: "High",     score };
  return                  { bg: "#11093e", label: "Critical", score };
};

// Mitigate placé en premier => défaut naturel
const TREATMENTS = ["Mitigate", "Accept", "Transfer", "Avoid"];
const TRANSFER_TYPES = ["Insurance", "Outsourcing", "Vendor"];
const EFFECTIVENESS = ["Effective", "Partial", "Ineffective"];
const EFF_COLORS = {
  Effective:   "#22c55e",
  Partial:     "#f59e0b",
  Ineffective: "#ef4444",
};
const MITIG_STATUSES = ["Open", "In progress", "Completed", "Blocked"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// Affiche "ai" quand la source est AI / AI#1 / AI-xxx, sinon la valeur brute
const displaySource = (src) => {
  if (!src) return "";
  if (/^ai\b|^ai[#\-_ ]/i.test(src)) return "AI";
  if (/^ai$/i.test(src)) return "ai";
  return src;
};

const Section = ({ icon: Icon, title, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14, border: "1.5px solid #e8effd", borderRadius: 12, background: "#fff" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13, color: "#0f1e3d" }}>
          <Icon size={16} color="#1a56db" />
          {title}
          {badge != null && (
            <span style={{ background: "#e8effd", color: "#1a56db", borderRadius: 20,
              padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{badge}</span>
          )}
        </span>
        {open ? <ChevronDown size={16} color="#7a96c0" /> : <ChevronRight size={16} color="#7a96c0" />}
      </button>
      {open && <div style={{ padding: "0 16px 14px" }}>{children}</div>}
    </div>
  );
};

const ScoreBadge = ({ impact, probabilite, label }) => {
  const { bg, label: lvl, score } = getRiskColor(impact, probabilite);
  return (
    <div style={{
      flex: 1, padding: "10px 12px", borderRadius: 10, background: bg + "12",
      border: `1.5px solid ${bg}44`,
    }}>
      <div style={{ fontSize: 10, color: "#7a96c0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: bg }}>{score}</span>
        <span style={{ fontSize: 11, color: "#7a96c0" }}>/25</span>
      </div>
      <div style={{ fontSize: 11, color: bg, fontWeight: 700, marginTop: 2 }}>{lvl}</div>
      <div style={{ fontSize: 10, color: "#7a96c0", marginTop: 2 }}>
        Impact {impact ?? 0} • Proba {probabilite ?? 0}
      </div>
    </div>
  );
};

const Field = ({ label, value }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 10, color: "#7a96c0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 13, color: "#0f1e3d", marginTop: 2 }}>{value || "—"}</div>
  </div>
);

const Pill = ({ children, color = "#3a5080", bg = "#f0f5ff" }) => (
  <span style={{ background: bg, color, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
    {children}
  </span>
);

const inp = {
  border: "1.5px solid #e8effd", borderRadius: 8, padding: "7px 10px",
  fontSize: 12, background: "#fff", color: "#0f1e3d", outline: "none", width: "100%",
};

const RiskDetailDrawer = ({ riskId, onClose, onChanged }) => {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ctrlOptions, setCtrlOptions] = useState([]);
  const [polOptions, setPolOptions] = useState([]);
  const [editAssessment, setEditAssessment] = useState(false);
  const [assessForm, setAssessForm] = useState({});
  const [newMitigation, setNewMitigation] = useState("");

  // Préservation de la position de scroll entre les re-renders
  const bodyRef = useRef(null);
  const scrollPosRef = useRef(0);
  const onBodyScroll = (e) => { scrollPosRef.current = e.currentTarget.scrollTop; };
  useLayoutEffect(() => {
    if (bodyRef.current && scrollPosRef.current > 0) {
      bodyRef.current.scrollTop = scrollPosRef.current;
    }
  });

  // initial=true => affiche "Loading…". initial=false => refresh silencieux (pas de démontage)
  const fetchDetails = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const res = await fetch(`${API}/${riskId}/details`, { credentials: "include" });
      const data = await res.json();
      setRisk(data);
      setAssessForm({
        impact: Number(data.impact ?? 0),
        probabilite: Number(data.probabilite ?? 0),
        inherent_impact: Number(data.inherent_impact ?? data.impact ?? 0),
        inherent_probabilite: Number(data.inherent_probabilite ?? data.probabilite ?? 0),
        treatment_strategy: data.treatment_strategy || "Mitigate",
        risk_appetite: Number(data.risk_appetite ?? 9),
        last_review_date: data.last_review_date?.slice(0,10) || "",
        next_review_date: data.next_review_date?.slice(0,10) || "",
        transfer_provider: data.transfer_provider || "",
        transfer_contract_ref: data.transfer_contract_ref || "",
        transfer_type: data.transfer_type || "Insurance",
        transfer_expiry_date: data.transfer_expiry_date?.slice(0,10) || "",
      });
    } catch (e) { console.error(e); }
    if (initial) setLoading(false);
  };

  useEffect(() => {
    if (!riskId) return;
    fetchDetails(true);
    (async () => {
      const [c, p] = await Promise.all([
        fetch(`${API}/lookup/controls`, { credentials: "include" }).then(r => r.json()).catch(() => []),
        fetch(`${API}/lookup/policies`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      ]);
      setCtrlOptions(Array.isArray(c) ? c : []);
      setPolOptions(Array.isArray(p) ? p : []);
    })();
  }, [riskId]);

  const saveAssessment = async () => {
    try {
      let residualImpact;
      let residualProbabilite;

      if (assessForm.treatment_strategy === "Avoid") {
        residualImpact = 0;
        residualProbabilite = 0;
      } else if (assessForm.treatment_strategy === "Accept") {
        residualImpact = Number(assessForm.inherent_impact) || 0;
        residualProbabilite = Number(assessForm.inherent_probabilite) || 0;
      } else {
        residualImpact = Number(assessForm.impact) || 0;
        residualProbabilite = Number(assessForm.probabilite) || 0;
      }

      const payload = {
        impact: residualImpact,
        probabilite: residualProbabilite,
        inherent_impact: Number(assessForm.inherent_impact) || 0,
        inherent_probabilite: Number(assessForm.inherent_probabilite) || 0,
        treatment_strategy: assessForm.treatment_strategy || "Mitigate",
        risk_appetite: Number(assessForm.risk_appetite) || 0,
        last_review_date: assessForm.last_review_date ? assessForm.last_review_date : null,
        next_review_date: assessForm.next_review_date ? assessForm.next_review_date : null,
        transfer_provider: assessForm.treatment_strategy === "Transfer"
          ? (assessForm.transfer_provider || null) : null,
        transfer_contract_ref: assessForm.treatment_strategy === "Transfer"
          ? (assessForm.transfer_contract_ref || null) : null,
        transfer_type: assessForm.treatment_strategy === "Transfer"
          ? (assessForm.transfer_type || null) : null,
        transfer_expiry_date: assessForm.treatment_strategy === "Transfer"
          ? (assessForm.transfer_expiry_date || null) : null,
      };

      const res = await fetch(`${API}/${riskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }

      setEditAssessment(false);
      await fetchDetails(false); // refresh silencieux => pas de scroll-to-top
      onChanged?.();
    } catch (e) {
      console.error(e);
      alert("Update failed: " + e.message);
    }
  };

  const linkControl = async (control_id) => {
  if (!control_id) return;
  await fetch(`${API}/${riskId}/controls`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ control_id: String(control_id) }),
  });
  fetchDetails(false);
};
  const updateControlEff = async (linkId, eff) => {
    await fetch(`${API}/${riskId}/controls/${linkId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectiveness: eff }),
    });
    fetchDetails(false);
  };
  const unlinkControl = async (linkId) => {
    if (!window.confirm("Unlink this control?")) return;
    await fetch(`${API}/${riskId}/controls/${linkId}`, { method: "DELETE", credentials: "include" });
    fetchDetails(false);
  };
  const linkPolicy = async (policy_id) => {
    if (!policy_id) return;
    await fetch(`${API}/${riskId}/policies`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy_id: Number(policy_id) }),
    });
    fetchDetails(false);
  };
  const unlinkPolicy = async (linkId) => {
    if (!window.confirm("Unlink this policy?")) return;
    await fetch(`${API}/${riskId}/policies/${linkId}`, { method: "DELETE", credentials: "include" });
    fetchDetails(false);
  };
  const patchMitigation = async (mitId, body) => {
    await fetch(`${API}/${riskId}/mitigations/${mitId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchDetails(false);
  };
  const addMitigation = async () => {
    if (!newMitigation.trim()) return;
    await fetch(`${API}/${riskId}/mitigations`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: newMitigation.trim() }),
    });
    setNewMitigation("");
    fetchDetails(false);
  };
  const deleteMitigation = async (mitId) => {
    if (!window.confirm("Delete this mitigation?")) return;
    await fetch(`${API}/${riskId}/mitigations/${mitId}`, { method: "DELETE", credentials: "include" });
    fetchDetails(false);
  };

  const availableControls = useMemo(() => {
    if (!risk) return [];
    const linked = new Set(risk.controls.map(c => c.control_id));
    return ctrlOptions.filter(o => !linked.has(o.id));
  }, [risk, ctrlOptions]);
  const availablePolicies = useMemo(() => {
    if (!risk) return [];
    const linked = new Set(risk.policies.map(p => p.policy_id));
    return polOptions.filter(o => !linked.has(o.id));
  }, [risk, polOptions]);

  if (!riskId) return null;

  const inherent  = risk ? getRiskColor(risk.inherent_impact ?? risk.impact, risk.inherent_probabilite ?? risk.probabilite) : null;
  const residual = risk
    ? getRiskColor(
        editAssessment ? assessForm.impact : risk.impact,
        editAssessment ? assessForm.probabilite : risk.probabilite
      )
    : null;
  const appetite  = risk?.risk_appetite ?? null;
  const aboveAppetite = appetite != null && residual && residual.score > appetite;
  const reduction = inherent && residual ? inherent.score - residual.score : 0;
  const residualLocked =
    assessForm.treatment_strategy === "Accept" ||
    assessForm.treatment_strategy === "Avoid";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(15,30,80,.18)",
        backdropFilter: "blur(3px)", zIndex: 60,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(720px, 95vw)",
        background: "#f8faff", boxShadow: "-12px 0 40px rgba(15,30,80,.15)",
        zIndex: 61, display: "flex", flexDirection: "column",
        animation: "slideIn .25s ease",
      }}>
        <style>{`@keyframes slideIn { from{transform:translateX(20px);opacity:.4} to{transform:none;opacity:1} }`}</style>

        <div style={{
          padding: "18px 22px", background: "#fff", borderBottom: "1.5px solid #e8effd",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#7a96c0", fontWeight: 700 }}>RISK #{riskId}</div>
            <h2 style={{ margin: "4px 0 6px", fontSize: 17, fontWeight: 700, color: "#0f1e3d" }}>
              {risk?.intitule || "Loading…"}
            </h2>
            {risk && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Pill>{risk.statut}</Pill>
                {risk.categorie && <Pill>{risk.categorie}</Pill>}
                {residual && <Pill bg={residual.bg + "22"} color={residual.bg}>{residual.label}</Pill>}
                {risk.source_ia ? <Pill bg="#f0e9ff" color="#7c3aed">ai</Pill> : null}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: 6,
            borderRadius: 8, color: "#7a96c0",
          }}>
            <X size={18} />
          </button>
        </div>

        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          style={{ flex: 1, overflowY: "auto", padding: 16 }}
        >
          {loading || !risk ? (
            <div style={{ textAlign: "center", color: "#7a96c0", padding: 30 }}>Loading…</div>
          ) : (
            <>
              <Section icon={FileText} title="Overview">
                <Field label="Description" value={risk.description} />
                <div style={{ display: "flex", gap: 14 }}>
                  
                  <div style={{ flex: 1 }}><Field label="Source" value={displaySource(risk.source)} /></div>
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: 1 }}><Field label="Due date" value={risk.dueDate?.slice(0,10)} /></div>
                  <div style={{ flex: 1 }}><Field label="Created" value={risk.created_at?.slice(0,10)} /></div>
                </div>
                <div>

                  
                </div>
              </Section>

              <Section icon={Target} title="Assessment" badge={residual?.label}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <ScoreBadge impact={risk.inherent_impact ?? risk.impact} probabilite={risk.inherent_probabilite ?? risk.probabilite} label="Inherent (before controls)" />
                  <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                    {reduction > 0
                      ? <TrendingDown size={20} color="#22c55e" />
                      : reduction < 0 ? <TrendingUp size={20} color="#ef4444" /> : null}
                  </div>
                  <ScoreBadge
                    impact={editAssessment ? assessForm.impact : risk.impact}
                    probabilite={editAssessment ? assessForm.probabilite : risk.probabilite}
                    label="Residual (current)"
                  />
                </div>

                {!editAssessment ? (
                  <div>
                    <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}><Field label="Treatment strategy" value={risk.treatment_strategy || "Mitigate"} /></div>
                    </div>

                    {risk.treatment_strategy === "Transfer" && (risk.transfer_provider || risk.transfer_type || risk.transfer_contract_ref || risk.transfer_expiry_date) && (
                      <div style={{
                        background: "#f0f5ff",
                        border: "1.5px solid #c7d9f8",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 10,
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: "#1a56db",
                          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <Shield size={13} /> Transfer details
                        </div>
                        <div style={{ display: "flex", gap: 14 }}>
                          <div style={{ flex: 1 }}><Field label="Provider" value={risk.transfer_provider} /></div>
                          <div style={{ flex: 1 }}><Field label="Type" value={risk.transfer_type} /></div>
                        </div>
                        <div style={{ display: "flex", gap: 14 }}>
                          <div style={{ flex: 1 }}><Field label="Contract / SLA ref" value={risk.transfer_contract_ref} /></div>
                          <div style={{ flex: 1 }}><Field label="Expiry date" value={risk.transfer_expiry_date?.slice(0,10)} /></div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}><Field label="Last review" value={risk.last_review_date?.slice(0,10)} /></div>
                      <div style={{ flex: 1 }}><Field label="Next review" value={risk.next_review_date?.slice(0,10)} /></div>
                    </div>
                    <button onClick={() => setEditAssessment(true)} style={{
                      background: "#f0f5ff", color: "#1a56db", border: "1.5px solid #c7d9f8",
                      borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Edit assessment</button>
                  </div>
                ) : (
                  <div style={{ background: "#fafbff", border: "1.5px solid #e8effd", borderRadius: 10, padding: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080", display: "block", marginBottom: 12 }}>
                      Treatment strategy
                      <select value={assessForm.treatment_strategy || "Mitigate"}
                        onChange={e => {
                          const newStrategy = e.target.value;
                          setAssessForm(f => {
                            const next = { ...f, treatment_strategy: newStrategy };
                            if (newStrategy === "Accept") {
                              next.impact = Number(f.inherent_impact) || 0;
                              next.probabilite = Number(f.inherent_probabilite) || 0;
                            } else if (newStrategy === "Avoid") {
                              next.impact = 0;
                              next.probabilite = 0;
                            }
                            return next;
                          });
                        }}
                        style={inp}>
                        {TREATMENTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    width: "100%",
  }}
>
  {/* Inherent Risk */}
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    
    <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
      Inherent impact ({assessForm.inherent_impact})

      <input
        type="range"
        min={0}
        max={4}
        value={assessForm.inherent_impact}
        onChange={e =>
          setAssessForm(f => ({
            ...f,
            inherent_impact: Number(e.target.value)
          }))
        }
        style={{ width: "100%" }}
      />
    </label>

    <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
      Inherent probability ({assessForm.inherent_probabilite})

      <input
        type="range"
        min={0}
        max={4}
        value={assessForm.inherent_probabilite}
        onChange={e =>
          setAssessForm(f => ({
            ...f,
            inherent_probabilite: Number(e.target.value)
          }))
        }
        style={{ width: "100%" }}
      />
    </label>

  </div>

  {/* Residual Risk */}
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

    {(assessForm.treatment_strategy === "Mitigate" ||
      assessForm.treatment_strategy === "Transfer") && (
      <>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
          Residual impact ({assessForm.impact})

          <input
            type="range"
            min={0}
            max={4}
            value={assessForm.impact}
            onChange={e =>
              setAssessForm(f => ({
                ...f,
                impact: Number(e.target.value)
              }))
            }
            style={{ width: "100%" }}
          />
        </label>

        <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
          Residual probability ({assessForm.probabilite})

          <input
            type="range"
            min={0}
            max={4}
            value={assessForm.probabilite}
            onChange={e =>
              setAssessForm(f => ({
                ...f,
                probabilite: Number(e.target.value)
              }))
            }
            style={{ width: "100%" }}
          />
        </label>
      </>
    )}

  </div>


                      {assessForm.treatment_strategy === "Transfer" && (
                        <div style={{
                          gridColumn: "span 2",
                          background: "#fff",
                          border: "1.5px solid #c7d9f8",
                          borderRadius: 10,
                          padding: 12,
                          marginTop: 4,
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: "#1a56db",
                            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <Shield size={13} /> Transfer details
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                              Provider name
                              <input type="text" value={assessForm.transfer_provider || ""}
                                onChange={e => setAssessForm(f => ({ ...f, transfer_provider: e.target.value }))}
                                placeholder="e.g. AXA, AWS, Stripe…"
                                style={inp} />
                            </label>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                              Type
                              <select value={assessForm.transfer_type || "Insurance"}
                                onChange={e => setAssessForm(f => ({ ...f, transfer_type: e.target.value }))}
                                style={inp}>
                                {TRANSFER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </label>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                              Contract / SLA reference
                              <input type="text" value={assessForm.transfer_contract_ref || ""}
                                onChange={e => setAssessForm(f => ({ ...f, transfer_contract_ref: e.target.value }))}
                                placeholder="e.g. POL-2025-0042"
                                style={inp} />
                            </label>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                              Expiry date
                              <input type="date" value={assessForm.transfer_expiry_date || ""}
                                onChange={e => setAssessForm(f => ({ ...f, transfer_expiry_date: e.target.value }))}
                                style={inp} />
                            </label>
                          </div>
                        </div>
                      )}

                      <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                        Last review
                        <input type="date" value={assessForm.last_review_date || ""}
                          onChange={e => setAssessForm(f => ({ ...f, last_review_date: e.target.value }))}
                          style={inp} />
                      </label>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#3a5080" }}>
                        Next review
                        <input type="date" value={assessForm.next_review_date || ""}
                          onChange={e => setAssessForm(f => ({ ...f, next_review_date: e.target.value }))}
                          style={inp} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                      <button onClick={() => setEditAssessment(false)} style={{
                        background: "#fff", border: "1.5px solid #e8effd", borderRadius: 8,
                        padding: "6px 14px", fontSize: 12, cursor: "pointer", color: "#3a5080",
                      }}>Cancel</button>
                      <button onClick={saveAssessment} style={{
                        background: "linear-gradient(135deg,#1a56db,#3b7dd8)", color: "#fff",
                        border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12,
                        fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      }}><Save size={12} /> Save</button>
                    </div>
                  </div>
                )}
              </Section>

              <Section icon={ShieldCheck} title="Linked controls" badge={risk.controls.length}>
                {risk.controls.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#b0c4de", marginBottom: 10 }}>No control linked yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {risk.controls.map(c => (
                      <div key={c.link_id} style={{
                        background: "#fafbff", border: "1.5px solid #e8effd", borderRadius: 10, padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: "#0f1e3d" }}>{c.title}</div>
                            <div style={{ fontSize: 10, color: "#7a96c0", marginTop: 2 }}>
                              {c.package_title} {c.chapter_title ? `· ${c.chapter_title}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            
                            {c.link_id ? (
  <button onClick={() => unlinkControl(c.link_id)} style={{
    background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4,
  }}><Trash2 size={13} /></button>
) : (
  <span title="Auto-detected from analysis" style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>auto</span>
)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <select onChange={e => { linkControl(e.target.value); e.target.value = ""; }} defaultValue=""
                  style={{ ...inp, width: "100%" }}>
                  <option value="" disabled>+ Link a control…</option>
                  {availableControls.map(o => (
                    <option key={o.id} value={o.id}>{o.title} {o.package_title ? `— ${o.package_title}` : ""}</option>
                  ))}
                </select>
              </Section>

              <Section icon={Shield} title="Linked policies" badge={risk.policies.length}>
                {risk.policies.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#b0c4de", marginBottom: 10 }}>No policy linked yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {risk.policies.map(p => (
                      <div key={p.link_id} style={{
                        background: "#fafbff", border: "1.5px solid #e8effd", borderRadius: 10, padding: "10px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#0f1e3d" }}>{p.title}</div>
                          <div style={{ fontSize: 10, color: "#7a96c0", marginTop: 2 }}>
                            {p.package_title} {p.chapter_title ? `· ${p.chapter_title}` : ""}
                          </div>
                        </div>
                        {p.link_id ? (
  <button onClick={() => unlinkPolicy(p.link_id)} style={{
    background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4,
  }}><Trash2 size={13} /></button>
) : (
  <span title="Auto-detected from analysis" style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>auto</span>
)}
                      </div>
                    ))}
                  </div>
                )}
                <select onChange={e => { linkPolicy(e.target.value); e.target.value = ""; }} defaultValue=""
                  style={{ ...inp, width: "100%" }}>
                  <option value="" disabled>+ Link a policy…</option>
                  {availablePolicies.map(o => (
                    <option key={o.id} value={o.id}>{o.title} {o.package_title ? `— ${o.package_title}` : ""}</option>
                  ))}
                </select>
              </Section>

              <Section icon={CheckCircle2} title="Mitigation plans" badge={risk.mitigations.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                  {risk.mitigations.map(m => (
                    <MitigationCard key={m.id} m={m}
                      onChange={(body) => patchMitigation(m.id, body)}
                      onDelete={() => deleteMitigation(m.id)} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={newMitigation} onChange={e => setNewMitigation(e.target.value)}
                    placeholder="New mitigation action…" style={{ ...inp, flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && addMitigation()} />
                  <button onClick={addMitigation} style={{
                    background: "linear-gradient(135deg,#1a56db,#3b7dd8)", color: "#fff", border: "none",
                    borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}><Plus size={12} /> Add</button>
                </div>
              </Section>

              <Section icon={History} title="history" badge={risk.history.length} defaultOpen={false}>
                {risk.history.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#b0c4de" }}>No changes recorded.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {risk.history.map(h => (
                      <div key={h.id} style={{
                        background: "#fafbff", border: "1.5px solid #e8effd", borderRadius: 8,
                        padding: "8px 10px", fontSize: 11,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, color: "#1a56db" }}>{h.action}</span>
                          <span style={{ color: "#7a96c0" }}>
                            <Clock size={10} style={{ verticalAlign: "middle" }} /> {new Date(h.changed_at).toLocaleString()}
                          </span>
                        </div>
                        {h.field_changed && (
                          <div style={{ color: "#3a5080", marginTop: 3 }}>
                            <strong>{h.field_changed}</strong>{" "}
                            {h.old_value != null && <span style={{ color: "#ef4444" }}>{h.old_value}</span>}
                            {h.old_value != null && h.new_value != null && " → "}
                            {h.new_value != null && <span style={{ color: "#22c55e" }}>{h.new_value}</span>}
                          </div>
                        )}
                        <div style={{ color: "#7a96c0", marginTop: 2 }}>by {h.user_name || "system"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
};

const MitigationCard = ({ m, onChange, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState({
    status: m.status, progress: m.progress, priority: m.priority,
    due_date: m.due_date?.slice(0,10) || "",
    assigned_to: m.assigned_to || "",
  });
  const statusColor = local.status === "Completed" ? "#22c55e"
                    : local.status === "Blocked" ? "#ef4444"
                    : local.status === "In progress" ? "#f59e0b" : "#7a96c0";
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e8effd", borderRadius: 10, padding: "10px 12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#0f1e3d", fontWeight: 600 }}>{m.action}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <Pill bg={statusColor + "18"} color={statusColor}>{local.status}</Pill>
            <Pill>{local.priority}</Pill>
            {local.assigned_to && <Pill>👤 {local.assigned_to}</Pill>}
            {local.due_date && <Pill>📅 {local.due_date}</Pill>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setOpen(o => !o)} style={{
            background: "none", border: "none", cursor: "pointer", color: "#1a56db", padding: 4,
          }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
          <button onClick={onDelete} style={{
            background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4,
          }}><Trash2 size={13} /></button>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#7a96c0", marginBottom: 3 }}>
          <span>Progress</span><span style={{ fontWeight: 700 }}>{local.progress}%</span>
        </div>
        <input type="range" min={0} max={100} value={local.progress}
          onChange={e => {
            const v = Number(e.target.value);
            setLocal(l => ({ ...l, progress: v }));
          }}
          onMouseUp={e => onChange({ progress: Number(e.target.value),
            status: Number(e.target.value) === 100 ? "Completed" : local.status })}
          onTouchEnd={e => onChange({ progress: Number(e.target.value) })}
          style={{ width: "100%" }} />
      </div>

      {open && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 10, color: "#7a96c0", fontWeight: 600 }}>
            Status
            <select value={local.status}
              onChange={e => { const v = e.target.value; setLocal(l => ({ ...l, status: v })); onChange({ status: v }); }}
              style={inp}>
              {MITIG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 10, color: "#7a96c0", fontWeight: 600 }}>
            Priority
            <select value={local.priority}
              onChange={e => { const v = e.target.value; setLocal(l => ({ ...l, priority: v })); onChange({ priority: v }); }}
              style={inp}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 10, color: "#7a96c0", fontWeight: 600 }}>
            Assigned to
            <input value={local.assigned_to}
              onChange={e => setLocal(l => ({ ...l, assigned_to: e.target.value }))}
              onBlur={e => onChange({ assigned_to: e.target.value })}
              style={inp} placeholder="Owner name" />
          </label>
          <label style={{ fontSize: 10, color: "#7a96c0", fontWeight: 600 }}>
            Due date
            <input type="date" value={local.due_date}
              onChange={e => { const v = e.target.value; setLocal(l => ({ ...l, due_date: v })); onChange({ due_date: v || null }); }}
              style={inp} />
          </label>
        </div>
      )}
    </div>
  );
};

export default RiskDetailDrawer;