import React, { useState } from "react";
import { Plus, ClipboardCheck, Calendar, CheckCircle, AlertTriangle, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";

const STATUS_COLORS = {
  Planifié:   { color: "#1a56db", bg: "#f0f5ff", border: "#c7d9f8" },
  "En cours": { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  Terminé:    { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
};

const SEVERITY = {
  Majeure:     { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", icon: "🔴" },
  Mineure:     { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: "🟡" },
  Observation: { color: "#1a56db", bg: "#f0f5ff", border: "#c7d9f8", icon: "🔵" },
};

const SEED_AUDITS = [
  {
    id: 2,
    title: "Audit conformité GRC",
    type: "Externe",
    performedBy: "AuditSec",
    date: "2026-02-25",
    status: "Terminé",
    observations: [],
  },
];

let obsUid = 100;
const genObsId = () => ++obsUid;

export default function AuditPage() {
  const [audits, setAudits]           = useState(SEED_AUDITS);
  const [showModal, setShowModal]     = useState(false);
  const [expanded, setExpanded]       = useState({});
  const [obsInputs, setObsInputs]     = useState({});
  const [obsSeverity, setObsSeverity] = useState({});
  const [newAudit, setNewAudit]       = useState({
    title: "", type: "Interne", performedBy: "", date: "", status: "Planifié",
  });

  // ── Fonctions inchangées ────────────────────────────────────────
  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const addAudit = () => {
    if (!newAudit.title.trim()) return;
    setAudits(prev => [...prev, { ...newAudit, id: Date.now(), observations: [] }]);
    setShowModal(false);
    setNewAudit({ title: "", type: "Interne", performedBy: "", date: "", status: "Planifié" });
  };

  const deleteAudit = (id) => setAudits(prev => prev.filter(a => a.id !== id));

  const addObservation = (auditId) => {
    const text     = (obsInputs[auditId] || "").trim();
    const severity = obsSeverity[auditId] || "Observation";
    if (!text) return;
    setAudits(prev => prev.map(a =>
      a.id === auditId
        ? { ...a, observations: [...a.observations, { id: genObsId(), text, severity }] }
        : a
    ));
    setObsInputs(p => ({ ...p, [auditId]: "" }));
  };

  const deleteObservation = (auditId, obsId) => {
    setAudits(prev => prev.map(a =>
      a.id === auditId
        ? { ...a, observations: a.observations.filter(o => o.id !== obsId) }
        : a
    ));
  };

  const totalObs     = audits.reduce((s, a) => s + a.observations.length, 0);
  const totalMajeure = audits.reduce((s, a) => s + a.observations.filter(o => o.severity === "Majeure").length, 0);
  const totalTermine = audits.filter(a => a.status === "Terminé").length;
  // ── Fin fonctions ───────────────────────────────────────────────

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: "0 0 40px 0" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .fade { animation: fadeIn .25s ease; }
        input:focus, select:focus, textarea:focus { outline:none; border-color:#1a56db !important; box-shadow:0 0 0 3px rgba(26,86,219,.08); }
        .audit-row:hover { background:#f8faff !important; }
        .obs-item:hover .obs-delete { opacity:1 !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, paddingTop:4 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, color:"#0f1e3d", margin:0 }}>Audit Management</h2>
          <p style={{ color:"#7a96c0", margin:"4px 0 0", fontSize:13 }}>Planification · Suivi · Observations · Traçabilité</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"9px 18px",
            background:"linear-gradient(135deg,#1a56db,#3b7dd8)",
            color:"#fff", border:"none", borderRadius:9,
            fontWeight:600, fontSize:13, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(26,86,219,.25)",
            transition:"box-shadow .2s",
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,86,219,.35)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,86,219,.25)"}
        >
          <Plus size={15}/> Nouvel Audit
        </button>
      </div>

      
      {/* ── LISTE AUDITS ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {audits.map(audit => {
          const isOpen   = expanded[audit.id];
          const sc       = STATUS_COLORS[audit.status];
          const majCount = audit.observations.filter(o => o.severity === "Majeure").length;

          return (
            <div key={audit.id} className="fade" style={{
              background:"#fff", border:"1.5px solid #e8effd",
              borderRadius:14, overflow:"hidden",
              boxShadow:"0 2px 10px rgba(26,86,219,.05)",
              transition:"box-shadow .2s",
            }}>

              {/* Row header */}
              <div
                className="audit-row"
                onClick={() => toggleExpand(audit.id)}
                style={{
                  display:"grid",
                  gridTemplateColumns:"1fr auto auto auto auto auto",
                  gap:14, alignItems:"center",
                  padding:"16px 20px", cursor:"pointer",
                  transition:"background .15s",
                }}
              >
                {/* Titre */}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background:"linear-gradient(135deg,#1a56db,#3b7dd8)",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  }}>
                    <ClipboardCheck size={15} color="#fff"/>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#0f1e3d" }}>{audit.title}</div>
                    <div style={{ fontSize:11, color:"#b0c4de", marginTop:2 }}>{audit.type} · {audit.performedBy}</div>
                  </div>
                </div>

                {/* Date */}
                <div style={{ display:"flex", alignItems:"center", gap:5, color:"#7a96c0", fontSize:12, whiteSpace:"nowrap" }}>
                  <Calendar size={12}/> {audit.date || "—"}
                </div>

                {/* Observations badge */}
                <div>
                  {audit.observations.length === 0 ? (
                    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#22c55e", fontWeight:600 }}>
                      <CheckCircle size={13}/> Aucune observation
                    </span>
                  ) : (
                    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, color: majCount > 0 ? "#DC2626" : "#D97706" }}>
                      <AlertTriangle size={13}/>
                      {audit.observations.length} observation{audit.observations.length > 1 ? "s" : ""}
                      {majCount > 0 && (
                        <span style={{ fontSize:10, background:"#FEF2F2", color:"#DC2626", border:"1px solid #FCA5A5", borderRadius:5, padding:"2px 6px" }}>
                          {majCount} maj.
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Statut */}
                <span style={{
                  fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:7,
                  background:sc.bg, color:sc.color, border:`1.5px solid ${sc.border}`,
                  whiteSpace:"nowrap",
                }}>
                  {audit.status}
                </span>

                {/* Supprimer */}
                <button
                  onClick={e => { e.stopPropagation(); deleteAudit(audit.id); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#c7d9f8", padding:5, borderRadius:7, display:"flex", transition:"all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color="#DC2626"; e.currentTarget.style.background="#FEF2F2"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="#c7d9f8"; e.currentTarget.style.background="none"; }}
                >
                  <Trash2 size={14}/>
                </button>

                {/* Expand */}
                <div style={{ color:"#b0c4de" }}>
                  {isOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                </div>
              </div>

              {/* Panel observations */}
              {isOpen && (
                <div className="fade" style={{ borderTop:"1.5px solid #e8effd", background:"#f8faff", padding:"18px 20px" }}>

                  <div style={{ fontSize:11, fontWeight:700, color:"#7a96c0", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
                    Observations ({audit.observations.length})
                  </div>

                  {audit.observations.length === 0 ? (
                    <div style={{ fontSize:13, color:"#b0c4de", fontStyle:"italic", marginBottom:14 }}>
                      Aucune observation enregistrée pour cet audit.
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                      {audit.observations.map(obs => {
                        const sv = SEVERITY[obs.severity];
                        return (
                          <div key={obs.id} className="obs-item" style={{
                            display:"flex", alignItems:"flex-start", justifyContent:"space-between",
                            gap:10, padding:"11px 14px", borderRadius:9,
                            background:sv.bg, border:`1.5px solid ${sv.border}`,
                          }}>
                            <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1 }}>
                              <span style={{ fontSize:13, marginTop:1 }}>{sv.icon}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, color:"#0f1e3d", lineHeight:1.5 }}>{obs.text}</div>
                                <span style={{ fontSize:10, fontWeight:700, color:sv.color, marginTop:3, display:"inline-block" }}>{obs.severity}</span>
                              </div>
                            </div>
                            <button
                              className="obs-delete"
                              onClick={() => deleteObservation(audit.id, obs.id)}
                              style={{ background:"none", border:"none", cursor:"pointer", color:"#c7d9f8", padding:3, borderRadius:5, opacity:0, transition:"opacity .15s, color .15s" }}
                              onMouseEnter={e => e.currentTarget.style.color="#DC2626"}
                              onMouseLeave={e => e.currentTarget.style.color="#c7d9f8"}
                            >
                              <X size={12}/>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Ajouter observation */}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <select
                      value={obsSeverity[audit.id] || "Observation"}
                      onChange={e => setObsSeverity(p => ({ ...p, [audit.id]: e.target.value }))}
                      style={{
                        padding:"8px 10px", borderRadius:8,
                        border:"1.5px solid #e8effd", fontSize:12, fontWeight:600,
                        fontFamily:"inherit", background:"#fff",
                        color:SEVERITY[obsSeverity[audit.id] || "Observation"].color,
                        cursor:"pointer", flexShrink:0, outline:"none",
                      }}
                    >
                      {Object.keys(SEVERITY).map(s => <option key={s} value={s}>{SEVERITY[s].icon} {s}</option>)}
                    </select>
                    <input
                      placeholder="Décrire l'observation…"
                      value={obsInputs[audit.id] || ""}
                      onChange={e => setObsInputs(p => ({ ...p, [audit.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addObservation(audit.id)}
                      style={{
                        flex:1, padding:"9px 13px",
                        border:"1.5px solid #e8effd", borderRadius:8,
                        fontSize:13, fontFamily:"inherit",
                        background:"#fff", color:"#0f1e3d", outline:"none",
                      }}
                    />
                    <button
                      onClick={() => addObservation(audit.id)}
                      style={{
                        padding:"9px 16px",
                        background:"linear-gradient(135deg,#1a56db,#3b7dd8)",
                        color:"#fff", border:"none", borderRadius:8,
                        fontSize:13, fontWeight:700, fontFamily:"inherit",
                        cursor:"pointer", flexShrink:0,
                        boxShadow:"0 2px 8px rgba(26,86,219,.22)",
                        transition:"box-shadow .2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 14px rgba(26,86,219,.32)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow="0 2px 8px rgba(26,86,219,.22)"}
                    >
                      + Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {audits.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 0", gap:12 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:"#f0f5ff", border:"1.5px solid #c7d9f8", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ClipboardCheck size={22} color="#c7d9f8"/>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#b0c4de" }}>Aucun audit pour le moment</div>
            <div style={{ fontSize:12, color:"#c7d9f8", textAlign:"center", maxWidth:280 }}>
              Créez votre premier audit en cliquant sur "Nouvel Audit"
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{
          position:"fixed", inset:0,
          background:"rgba(15,30,80,.18)", backdropFilter:"blur(4px)",
          display:"flex", justifyContent:"center", alignItems:"center", zIndex:200,
        }}>
          <div className="fade" style={{
            background:"#fff", padding:"28px 30px", borderRadius:16, width:460,
            border:"1.5px solid #e8effd",
            boxShadow:"0 20px 60px rgba(26,86,219,.15)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:"#0f1e3d" }}>Créer un audit</div>
                <div style={{ fontSize:12, color:"#7a96c0", marginTop:3 }}>Renseignez les informations de l'audit</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#b0c4de", fontSize:20, padding:4, borderRadius:6 }}
                onMouseEnter={e => { e.currentTarget.style.color="#DC2626"; e.currentTarget.style.background="#fef2f2"; }}
                onMouseLeave={e => { e.currentTarget.style.color="#b0c4de"; e.currentTarget.style.background="none"; }}
              >×</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={LBL}>Titre de l'audit *</label>
                <input
                  placeholder="Ex : Audit ISO 27001 annuel"
                  value={newAudit.title}
                  onChange={e => setNewAudit(p => ({ ...p, title: e.target.value }))}
                  style={INP}
                />
              </div>
              <div>
                <label style={LBL}>Réalisé par</label>
                <input
                  placeholder="Ex : Équipe interne / Cabinet externe"
                  value={newAudit.performedBy}
                  onChange={e => setNewAudit(p => ({ ...p, performedBy: e.target.value }))}
                  style={INP}
                />
              </div>
              <div>
                <label style={LBL}>Date</label>
                <input
                  type="date"
                  value={newAudit.date}
                  onChange={e => setNewAudit(p => ({ ...p, date: e.target.value }))}
                  style={INP}
                />
              </div>
              <div>
                <label style={LBL}>Type</label>
                <select value={newAudit.type} onChange={e => setNewAudit(p => ({ ...p, type: e.target.value }))} style={INP}>
                  <option>Interne</option>
                  <option>Externe</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Statut initial</label>
                <select value={newAudit.status} onChange={e => setNewAudit(p => ({ ...p, status: e.target.value }))} style={INP}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex:1, padding:"11px", background:"#fafbff",
                  border:"1.5px solid #e8effd", borderRadius:9,
                  fontSize:13, fontWeight:600, color:"#3a5080", cursor:"pointer", fontFamily:"inherit",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor="#c7d9f8"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#e8effd"}
              >
                Annuler
              </button>
              <button
                onClick={addAudit}
                disabled={!newAudit.title.trim()}
                style={{
                  flex:2, padding:"11px", border:"none", borderRadius:9,
                  fontSize:13, fontWeight:700, fontFamily:"inherit",
                  cursor: newAudit.title.trim() ? "pointer" : "not-allowed",
                  background: newAudit.title.trim() ? "linear-gradient(135deg,#1a56db,#3b7dd8)" : "#e8effd",
                  color: newAudit.title.trim() ? "#fff" : "#b0c4de",
                  boxShadow: newAudit.title.trim() ? "0 4px 14px rgba(26,86,219,.25)" : "none",
                  transition:"all .2s",
                }}
              >
                Créer l'audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles partagés ──────────────────────────────────────────────
const LBL = { fontSize:12, fontWeight:600, color:"#3a5080", display:"block", marginBottom:6 };
const INP = {
  width:"100%", padding:"10px 13px",
  border:"1.5px solid #e8effd", borderRadius:9,
  fontSize:13, fontFamily:"inherit",
  color:"#0f1e3d", background:"#fafbff", outline:"none",
  transition:"border-color .2s",
};