import React, { useState, useEffect } from "react";
import { X, ShieldAlert, TrendingUp, AlertTriangle, CheckCircle, Plus, Trash2, Edit3 } from "lucide-react";

const IMPACT_LEVELS = ["0", "1", "2", "3", "4"];
const PROBA_LEVELS  = ["0", "1", "2", "3", "4"];

const getRiskColor = (impact, proba) => {
  const score = (impact + 1) * (proba + 1);
  if (score <= 4)  return { bg: "#22c55e", label: "Low",   text: "#fff" };
  if (score <= 9)  return { bg: "#f59e0b", label: "Moderate",   text: "#fff" };
  if (score <= 16) return { bg: "#f97316", label: "High",    text: "#fff" };
  return               { bg: "#ef4444", label: "Critical",  text: "#fff" };
};

const getRiskScore = (impact, proba) => (impact + 1) * (proba + 1);

// ─── StatCard ─────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: "#fff",
    border: "1.5px solid #e8effd",
    borderRadius: 14,
    padding: "18px 22px",
    display: "flex", alignItems: "center", gap: 16,
    boxShadow: "0 2px 10px rgba(26,86,219,.05)",
    flex: 1, minWidth: 150,
  }}>
    <div style={{
      width: 46, height: 46, borderRadius: 12,
      background: color + "15",
      border: `1.5px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#0f1e3d", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#7a96c0", marginTop: 3 }}>{label}</div>
    </div>
  </div>
);

// ─── Main page ──────────────────────────────────────────────
const Risques = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [hoveredRisk, setHoveredRisk] = useState(null);
  const [risques, setRisques]     = useState([]);
  const [form, setForm]           = useState({ intitule: "", categorie: "", actif: "", source: "",owner:"", description: "",
  dueDate: "",     
    impact: "0", probabilite: "0" });
  const [hoveredCell, setHoveredCell] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [threats, setThreats] = useState([""]);
  const [vulnerabilities, setVulnerabilities] = useState([ ""]);
  

  const openModal  = () => setModalOpen(true);
  const closeModal = () => {
    setModalOpen(false);
    setForm({ intitule: "", categorie: "", actif: "", source: "",owner:"", description: "",
  dueDate: "" , impact: "0", probabilite: "0" });setMitigations([""]); setVulnerabilities([""]); setVulnerabilities([""])
  };
  const [mitigations, setMitigations] = useState([""]);
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  const handleAddThreat = () => setThreats([...threats, ""]);

const handleChangeThreat = (index, value) => {
  const updated = [...threats];
  updated[index] = value;
  setThreats(updated);
};

const handleRemoveThreat = (index) => {
  setThreats(threats.filter((_, i) => i !== index));
};
const handleAddVulnerability = () => setVulnerabilities([...vulnerabilities, ""]);

const handleChangeVulnerability = (index, value) => {
  const updated = [...vulnerabilities];
  updated[index] = value;
  setVulnerabilities(updated);
};

const handleRemoveVulnerability = (index) => {
  setVulnerabilities(vulnerabilities.filter((_, i) => i !== index));
};

  const handleAddMitigation = () => {
  setMitigations([...mitigations, ""]);

};

  const handleChangeMitigation = (index, value) => {
  const updated = [...mitigations];
  updated[index] = value;
  setMitigations(updated);
};
 const handleRemoveMitigation = (index) => {
  const updated = mitigations.filter((_, i) => i !== index);
  setMitigations(updated);
};
useEffect(() => {
  const fetchAssets = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/assets");
      const data = await res.json();
      setAssetsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchAssets();
}, []);
  
  useEffect(() => {
    const fetchRisques = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/risks/getrisks");
        const data = await res.json();
        const grouped = {};

data.forEach(row => {
  if (!grouped[row.id]) {
    grouped[row.id] = {
      ...row,
      mitigations: []
    };
  }

  if (row.mitigation_id) {
    grouped[row.id].mitigations.push({
      id: row.mitigation_id,
      action: row.action,
      priority: row.priority,
      status: row.mitigation_status,
      progress: row.progress
    });
  }
});

const risks = Object.values(grouped);
setRisques(risks);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRisques();
  }, []);

  const handleAdd = async() => {
    if (!form.intitule) return;
    try{
      const res = await fetch("http://localhost:3000/api/risks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          intitule: form.intitule,
          categorie: form.categorie,
          assets: selectedAssets,
          source: form.source,
          owner: form.owner,
          description: form.description,
          dueDate: form.dueDate,

          impact: parseInt(form.impact),
          probabilite: parseInt(form.probabilite),
          MitigationPlan: mitigations.filter((m) => m.trim() !== ""),
          threats: threats
            .filter((t) => t.trim() !== "")
            .map((t) => ({ name: t })),

          vulnerabilities: vulnerabilities
            .filter((v) => v.trim() !== "")
            .map((v) => ({ name: v })),
        }),
      });
     const data = await res.json();
      if (!res.ok) {
      throw new Error(data.error || "Erreur lors de l'ajout");
    }
    await handleFetchRisques();
    closeModal();
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'ajout du risque");
  }
};
const handleFetchRisques = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/risks/getrisks");
    const data = await res.json();

    const grouped = {};

    data.forEach(row => {
      if (!grouped[row.id]) {
        grouped[row.id] = { ...row, mitigations: [] };
      }

      if (row.mitigation_id) {
        grouped[row.id].mitigations.push({
          id: row.mitigation_id,
          action: row.action,
          priority: row.priority,
          status: row.mitigation_status,
          progress: row.progress
        });
      }
    });

    setRisques(Object.values(grouped));
  } catch (err) {
    console.error(err);
  }
};

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this risk?")) {
      try {
        const res = await fetch(`http://localhost:3000/api/risks/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error("Error deleting risk");
        }
        
        setRisques(prev => prev.filter(risk => risk.id !== id));
      } catch (err) {
        console.error(err);
        alert("Error deleting risk");
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3000/api/risks/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ statut: newStatus }),
      });
      
      if (!res.ok) {
        throw new Error("Error updating status");
      }
      
      const updatedRisk = await res.json();
      setRisques(prev => prev.map(risk => 
        risk.id === id ? { ...risk, statut: newStatus } : risk
      ));
      setEditingStatus(null);
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const total       = risques.length;
  const critiques   = risques.filter(r => getRiskScore(r.impact, r.probabilite) > 16).length;
  const enTraitement = risques.filter(r => r.statut === "In progress").length;
  const resolus     = risques.filter(r => r.statut === "Resolved").length;

  const getRisquesInCell = (i, j) => risques.filter(r => r.impact === i && r.probabilite === j);

  // Preview color in modal
  const previewColor = getRiskColor(parseInt(form.impact), parseInt(form.probabilite));

  return (
    <div
      style={{ background: "#F8FAFC", minHeight: "100%", paddingBottom: 40 }}
    >
      <style>{`
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #1a56db !important; outline: none; box-shadow: 0 0 0 3px rgba(26,86,219,.08); }
        input[type=range] { accent-color: #1a56db; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .fade { animation: fadeIn .25s ease; }
        .risk-row:hover { background: #f8faff !important; }
        .action-btn { opacity: 0; transition: opacity 0.2s ease; margin-left: 4px; }
        .risk-row:hover .action-btn { opacity: 1; }
        .status-select {
          border: 1px solid #e8effd;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          background: #fff;
          cursor: pointer;
          outline: none;
        }
        .status-select:focus {
          border-color: #1a56db;
          box-shadow: 0 0 0 2px rgba(26,86,219,.1);
        }
      `}</style>

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          paddingTop: 4,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f1e3d",
              margin: 0,
            }}
          >
            Risk Management
          </h1>
          <p style={{ color: "#7a96c0", margin: "4px 0 0", fontSize: 13 }}>
            Identification, assessment and monitoring of risks
          </p>
        </div>
        <button
          onClick={openModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "linear-gradient(135deg,#1a56db,#3b7dd8)",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(26,86,219,.25)",
            transition: "box-shadow .2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,86,219,.35)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,86,219,.25)")
          }
        >
          <Plus size={15} /> Add a risk
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      <div
        style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}
      >
        <StatCard
          icon={ShieldAlert}
          label="Total risks"
          value={total}
          color="#1a56db"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical risks"
          value={critiques}
          color="#ef4444"
        />
        <StatCard
          icon={TrendingUp}
          label="In progress"
          value={enTraitement}
          color="#f59e0b"
        />
        <StatCard
          icon={CheckCircle}
          label="Resolved"
          value={resolus}
          color="#22c55e"
        />
      </div>

      {/* ── MATRIX + LEGEND ── */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Matrix */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1.5px solid #e8effd",
            padding: "20px 22px",
            boxShadow: "0 2px 10px rgba(26,86,219,.05)",
            flex: "1 1 480px",
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#0f1e3d",
              margin: "0 0 16px",
            }}
          >
            Impact × Probability Matrix
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {/* Y-axis label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: 10,
                  color: "#b0c4de",
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Probability
              </span>
            </div>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[4, 3, 2, 1, 0].map((j) => (
                  <div
                    key={j}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <div
                      style={{
                        width: 80,
                        textAlign: "right",
                        fontSize: 11,
                        color: "#7a96c0",
                        paddingRight: 8,
                      }}
                    >
                      {PROBA_LEVELS[j]}
                    </div>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const { bg } = getRiskColor(i, j);
                      const cellRisques = getRisquesInCell(i, j);
                      const isHovered =
                        hoveredCell?.i === i && hoveredCell?.j === j;
                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredCell({ i, j })}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            width: 58,
                            height: 48,
                            background: bg,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor:
                              cellRisques.length > 0 ? "pointer" : "default",
                            position: "relative",
                            transition: "transform .15s, box-shadow .15s",
                            transform: "none",
                            boxShadow: isHovered
  ? "0 4px 12px rgba(0,0,0,.15)"
  : "none",
                            border: isHovered
                              ? "2px solid #0f1e3d"
                              : "2px solid transparent",
                          }}
                        >
                          {cellRisques.length > 0 && (
                            <span
                              style={{
                                background: "rgba(0,0,0,.32)",
                                color: "#fff",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {cellRisques.length}
                            </span>
                          )}
                          {isHovered && cellRisques.length > 0 && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "110%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "#0f1e3d",
                                color: "#fff",
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 11,
                                zIndex: 100,
                                whiteSpace: "nowrap",
                                boxShadow: "0 4px 16px rgba(0,0,0,.2)",
                                minWidth: 150,
                              }}
                            >
                              {cellRisques.map((r) => (
                                
                                <div key={r.id} style={{ marginBottom: 2 }}>
                                  • {r.intitule}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {/* X-axis labels */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <div style={{ width: 80 }} />
                  {IMPACT_LEVELS.map((label, i) => (
                    <div
                      key={i}
                      style={{
                        width: 58,
                        textAlign: "center",
                        fontSize: 11,
                        color: "#7a96c0",
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#b0c4de",
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    Impact →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend + Statuses */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: "0 0 190px",
          }}
        >
          {/* Risk levels */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1.5px solid #e8effd",
              padding: "18px",
              boxShadow: "0 2px 10px rgba(26,86,219,.05)",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "#0f1e3d",
                margin: "0 0 12px",
              }}
            >
              Risk levels
            </h3>
            {[
              { label: "Critical", color: "#ef4444" },
              { label: "High", color: "#f97316" },
              { label: "Moderate", color: "#f59e0b" },
              { label: "Low", color: "#22c55e" },
            ].map(({ label, color }) => {
              const count = risques.filter((r) => {
                const s = getRiskScore(r.impact, r.probabilite);
                if (label === "Critical") return s > 16;
                if (label === "High") return s > 9 && s <= 16;
                if (label === "Moderate") return s > 4 && s <= 9;
                return s <= 4;
              }).length;
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 9,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: color,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#3a5080" }}>
                      {label}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12, color }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Statuses */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1.5px solid #e8effd",
              padding: "18px",
              boxShadow: "0 2px 10px rgba(26,86,219,.05)",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "#0f1e3d",
                margin: "0 0 12px",
              }}
            >
              Statuses
            </h3>
            {["Open", "In progress", "Resolved"].map((s) => {
              const count = risques.filter((r) => r.statut === s).length;
              const color =
                s === "Open"
                  ? "#ef4444"
                  : s === "In progress"
                    ? "#f59e0b"
                    : "#22c55e";
              return (
                <div key={s} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#3a5080" }}>{s}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>
                      {count}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#e8effd",
                      borderRadius: 999,
                      height: 5,
                    }}
                  >
                    <div
                      style={{
                        background: color,
                        borderRadius: 999,
                        height: 5,
                        width: total > 0 ? `${(count / total) * 100}%` : "0%",
                        transition: "width .5s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1.5px solid #e8effd",
          overflow: "visible",
          boxShadow: "0 2px 10px rgba(26,86,219,.05)",
        }}
      >
        <div
          style={{ padding: "16px 22px", borderBottom: "1.5px solid #e8effd" }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#0f1e3d",
              margin: 0,
            }}
          >
            Risk list
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8faff" }}>
              {[
                "ID",
                "Risk",
                "Category",
                "Source",
                "Impact",
                "Probability",
                "Level",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "11px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7a96c0",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    borderBottom: "1.5px solid #e8effd",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risques.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#b0c4de",
                    fontSize: 13,
                  }}
                >
                  No risks recorded
                </td>
              </tr>
            ) : (
              risques.map((r, idx) => {
                const isLastRow = hoveredRisk === r.id && idx === risques.length - 1;
                const { bg, label } = getRiskColor(r.impact, r.probabilite);
                const statusColors = {
                  Open: { bg: "#fee2e2", color: "#dc2626" },
                  "In progress": { bg: "#fef3c7", color: "#d97706" },
                  Resolved: { bg: "#dcfce7", color: "#16a34a" },
                };
                const currentStatusColor =
                  statusColors[r.statut] || statusColors.Open;

                return (
                  <tr
  key={r.id}
  className="risk-row"
  onMouseEnter={() => setHoveredRisk(r.id)}
  onMouseLeave={() => setHoveredRisk(null)}
  style={{
    borderTop: "1px solid #f0f5ff",
    background: idx % 2 === 0 ? "#fff" : "#fafbff",
    transition: "background .15s",
    position: "relative",
    

  }}
>
                    <td
                      style={{
                        padding: "11px 16px",
                        color: "#b0c4de",
                        fontSize: 12,
                      }}
                    >
                      #{r.id}
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        fontWeight: 600,
                        color: "#0f1e3d",
                        fontSize: 13,
                        position: "relative"
                      }}
                    >
                      {r.intitule}
                      
                      {hoveredRisk === r.id && r.description && (
  <div
    style={{
      position: "absolute",
      
      // ✅ IMPORTANT: ne jamais dépasser vers le bas
      bottom: isLastRow ? "100%" : "auto",
      top: isLastRow ? "auto" : "100%",

      marginBottom: isLastRow ? 10 : 0,
      marginTop: !isLastRow ? 10 : 0,

      left: 0,
      width: 250,

      background: "#fff",
      color: "#0f1e3d",
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 11,

      zIndex: 9999,
      boxShadow: "0 4px 16px rgba(0,0,0,.2)",

      pointerEvents: "none",

      // ✅ FIX stabilité rendering
      transform: "translateZ(0)",
      willChange: "transform, opacity",
    }}
  >
    {r.description}
  </div>
)}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span
                        style={{
                          background: "#f0f5ff",
                          borderRadius: 6,
                          padding: "3px 9px",
                          fontSize: 11,
                          color: "#3a5080",
                          fontWeight: 600,
                        }}
                      >
                        {r.categorie || "—"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        fontSize: 12,
                        color: "#7a96c0",
                      }}
                    >
                      {r.source || "—"}
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        fontSize: 12,
                        color: "#3a5080",
                      }}
                    >
                      {IMPACT_LEVELS[r.impact]}
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        fontSize: 12,
                        color: "#3a5080",
                      }}
                    >
                      {PROBA_LEVELS[r.probabilite]}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span
                        style={{
                          background: bg + "22",
                          color: bg,
                          border: `1px solid ${bg}55`,
                          borderRadius: 6,
                          padding: "3px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "11px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      {editingStatus === r.id ? (
                        <select
                          value={r.statut}
                          onChange={(e) =>
                            handleStatusUpdate(r.id, e.target.value)
                          }
                          onBlur={() => setEditingStatus(null)}
                          className="status-select"
                          autoFocus
                          style={{
                            background: currentStatusColor.bg,
                            color: currentStatusColor.color,
                            border: `1px solid ${currentStatusColor.color}40`,
                            fontWeight: 600,
                          }}
                        >
                          <option value="Open">Open</option>
                          <option value="In progress">In progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      ) : (
                        <>
                          <span
                            style={{
                              borderRadius: 6,
                              padding: "4px 9px",
                              fontSize: 11,
                              fontWeight: 700,
                              background: currentStatusColor.bg,
                              color: currentStatusColor.color,
                              flex: 1,
                            }}
                          >
                            {r.statut}
                          </span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => setEditingStatus(r.id)}
                              className="action-btn"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#3b82f6",
                                transition: "all .2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#eff6ff";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              title="Edit status"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="action-btn"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ef4444",
                                transition: "all .2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fee2e2";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              title="Delete risk"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div
          style={{
            
  position: "fixed",
  left: "auto",
  top: "auto",
  transform: "none",

            inset: 0,
            background: "rgba(15,30,80,.18)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            className="fade"
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 740,
              borderRadius: 20,
              padding: "32px 36px",
              border: "1.5px solid #e8effd",
              boxShadow: "0 20px 60px rgba(26,86,219,.15)",
              position: "relative",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#b0c4de",
                padding: 4,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#dc2626";
                e.currentTarget.style.background = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#b0c4de";
                e.currentTarget.style.background = "none";
              }}
            >
              <X size={18} />
            </button>

            <h2
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#0f1e3d",
                margin: "0 0 20px",
              }}
            >
              New risk
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Risk title *"
                value={form.intitule}
                onChange={(e) =>
                  setForm((f) => ({ ...f, intitule: e.target.value }))
                }
                style={INP}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <select
                  value={form.categorie}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categorie: e.target.value }))
                  }
                  style={{ ...INP, flex: 1 }}
                >
                  <option value="">Category</option>
                  <option value="Financial">Financial</option>
                  <option value="HR">HR</option>
                  <option value="SOC">SOC</option>
                  <option value="IT">IT</option>
                  <option value="Information Security">
                    Information Security
                  </option>
                  <option value="Application Security">Application Security</option>
                  <option value="Access Control">Access Control</option>
                </select>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      ...INP,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      minHeight: 42,
                      alignItems: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {/* Placeholder */}
                    {selectedAssets.length === 0 && (
                      <span style={{ color: "#7a96c0", fontSize: 13 }}>
                        Asset concerned
                      </span>
                    )}

                    {/* Selected tags */}
                    {selectedAssets.map((assetId) => {
                      const asset = assetsList.find((a) => a.id === assetId);

                      return (
                        <span
                          key={assetId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#e8effd",
                            color: "#1a56db",
                            border: "1.5px solid #c7d9f8",
                            borderRadius: 20,
                            padding: "3px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          {asset?.intitule}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssets((prev) =>
                                prev.filter((id) => id !== assetId),
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#7a96c0",
                              padding: 0,
                              lineHeight: 1,
                              fontSize: 14,
                              position: "relative",
                              zIndex: 3,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}

                    {/* Select overlay */}
                    <select
                      value=""
                      onChange={(e) => {
                        const val = Number(e.target.value);

                        if (val && !selectedAssets.includes(val)) {
                          setSelectedAssets((prev) => [...prev, val]);
                        }
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    >
                      <option value="">Asset concerned</option>

                      {assetsList
                        .filter((a) => !selectedAssets.includes(a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.intitule}
                          </option>
                        ))}
                    </select>
                  </div>

                                  </div>
              </div>

              <select
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: e.target.value }))
                }
                style={INP}
              >
                <option value="">Source</option>
                <option value="Manual entry">Manual entry</option>
                <option value="Compliance gap">Compliance gap</option>
                <option value="Best practices">Best practices</option>
              </select>
              <input
                placeholder="Owner"
                value={form.owner}
                onChange={(e) =>
                  setForm((f) => ({ ...f, owner: e.target.value }))
                }
                style={INP}
              ></input>

              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                style={{ ...INP, resize: "none", height: 74 }}
                rows={3}
              />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <label style={{ fontSize: 14, fontWeight: 500 }}>
                  Vulnerabilities
                </label>

                {vulnerabilities.map((vuln, index) => (
                  <div key={`${vuln}-${index}`} style={{ position: "relative" }}>
                    <input
                      type="text"
                      
                      value={vuln}
                      onChange={(e) =>
                        handleChangeVulnerability(index, e.target.value)
                      }
                      placeholder={`Vulnerability ${index + 1}`}
                      style={{ ...INP, paddingRight: 80 }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      {index === vulnerabilities.length - 1 && (
                        <button type="button" onClick={handleAddVulnerability}>
                          <Plus size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveVulnerability(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <label style={{ fontSize: 14, fontWeight: 500 }}>Threats</label>

                {threats.map((threat, index) => (
                  <div key={`${threat}-${index}`} style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={threat}
                      onChange={(e) =>
                        handleChangeThreat(index, e.target.value)
                      }
                      placeholder={`Threat ${index + 1}`}
                      style={{ ...INP, paddingRight: 80 }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      {index === threats.length - 1 && (
                        <button type="button" onClick={handleAddThreat}>
                          <Plus size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveThreat(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <label style={{ fontSize: 14, fontWeight: 500 }}>
                  Mitigation Plans
                </label>

                {mitigations.map((mitigation, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={mitigation}
                      onChange={(e) =>
                        handleChangeMitigation(index, e.target.value)
                      }
                      placeholder={`Mitigation ${index + 1}`}
                      style={{
                        ...INP,
                        paddingRight: 80, // espace pour les boutons
                      }}
                    />

                    {/* Actions inside input */}
                    <div
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      {/* Add */}
                      {index === mitigations.length - 1 && (
                        <button
                          type="button"
                          onClick={handleAddMitigation}
                          style={{
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMitigation(index)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ef4444",
                          transition: "all .2s",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <input
                placeholder="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                style={INP}
              />

              {/* Impact slider */}
              <div>
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: "#3a5080" }}
                >
                  Impact:{" "}
                  <span style={{ color: previewColor.bg }}>
                    {IMPACT_LEVELS[form.impact]}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={form.impact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, impact: e.target.value }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>

              {/* Probability slider */}
              <div>
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: "#3a5080" }}
                >
                  Probability:{" "}
                  <span style={{ color: previewColor.bg }}>
                    {PROBA_LEVELS[form.probabilite]}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={form.probabilite}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, probabilite: e.target.value }))
                  }
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>

              {/* Preview level */}
              <div
                style={{
                  background: previewColor.bg + "15",
                  border: `1.5px solid ${previewColor.bg}44`,
                  borderRadius: 9,
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: previewColor.bg,
                }}
              >
                Calculated level: {previewColor.label}
                &nbsp;(score{" "}
                {getRiskScore(
                  parseInt(form.impact),
                  parseInt(form.probabilite),
                )}
                /25)
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <button
                  onClick={closeModal}
                  style={{
                    padding: "10px 18px",
                    border: "1.5px solid #e8effd",
                    borderRadius: 9,
                    background: "#fafbff",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#3a5080",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#c7d9f8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#e8effd")
                  }
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  style={{
                    padding: "10px 20px",
                    background: form.intitule.trim()
                      ? "linear-gradient(135deg,#1a56db,#3b7dd8)"
                      : "#e8effd",
                    color: form.intitule.trim() ? "#fff" : "#b0c4de",
                    border: "none",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: form.intitule.trim() ? "pointer" : "not-allowed",
                    boxShadow: form.intitule.trim()
                      ? "0 4px 14px rgba(26,86,219,.25)"
                      : "none",
                    transition: "all .2s",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Risques;

// ─── Shared styles ──────────────────────────────────────────────
const INP = {
  border: "1.5px solid #e8effd",
  borderRadius: 9,
  padding: "10px 13px",
  fontSize: 13,
  background: "#fafbff",
  color: "#0f1e3d",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  transition: "border-color .2s",
};