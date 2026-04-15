import { useState, useEffect } from "react";

// ─── Design Tokens (garder les mêmes) ─────────────────────────────────────────
const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  accent: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
  purple: "#6D28D9", purpleLight: "#F5F0FF",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#D97706", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  info: "#0891B2", infoLight: "#ECFEFF",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
  shadowMd: "0 4px 12px rgba(15,23,42,0.09)",
  shadowLg: "0 10px 30px rgba(15,23,42,0.13)",
};
const F = { display: "'Fraunces', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" };

const ASSET_TYPES = ["Hardware", "Software", "Data", "Network","Human","IAM"];
const ASSET_ICONS = { Hardware: "🖥️", Application: "⚙️", databases: "🗄️", Network: "🌐" };
const LOCATIONS = ["Cloud", "On-Premise", "Hybrid"];

// ─── Status Badge (inchangé) ──────────────────────────────────────────────────
const StatusBadge = ({ count, type = "info" }) => {
  const config = {
    info: { bg: C.infoLight, color: C.info, label: "No Risk" },
    success: { bg: C.successLight, color: C.success, label: "Low Risk" },
    warning: { bg: C.warningLight, color: C.warning, label: "Medium Risk" },
    danger: { bg: C.dangerLight, color: C.danger, label: "High Risk" },
    critical: { bg: C.dangerLight, color: C.danger, label: "Critical Risk" }  
  };
  const cfg = config[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
      {cfg.label} ({count})
    </span>
  );
};

// ─── Chip Component (inchangé) ────────────────────────────────────────────────
const Chip = ({ label, color = C.accent, bg = C.accentLight }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: bg, color, fontFamily: F.body, whiteSpace: "nowrap" }}>
    {label}
  </span>
);

// ─── Modal (inchangé) ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(5px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: 28, width: 520, maxWidth: "92vw", boxShadow: C.shadowLg, border: `1px solid ${C.border}`, animation: "slideUp .2s ease" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.surfaceAlt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Asset Modal (inchangé) ───────────────────────────────────────────────────
function AssetModal({ asset, onClose, onSave }) {
  const [form, setForm] = useState(asset || {
    intitule: "",
    type: "",
    owner: "",
    Location: "",
  });

  const handleSave = () => {
    if (!form.intitule.trim()) return;
    onSave(form);
  };

  return (
    <Modal title={asset ? "Edit Asset" : "Add Asset"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Asset Name *</label>
          <input 
            value={form.intitule} 
            onChange={e => setForm({ ...form, intitule: e.target.value })}
            placeholder="e.g., Production databases Server"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 14, background: C.bg, outline: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Type</label>
            <select 
              value={form.type} 
              onChange={e => setForm({ ...form, type: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 13, background: C.bg }}
            >
              <option value="">Select type</option>
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Location</label>
            <select 
              value={form.Location} 
              onChange={e => setForm({ ...form, Location: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 13, background: C.bg }}
            >
              <option value="">Select location</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Owner / Team</label>
          <input 
            value={form.owner} 
            onChange={e => setForm({ ...form, owner: e.target.value })}
            placeholder="e.g., DevOps Team"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 14, background: C.bg, outline: "none" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 24px", borderRadius: 9, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff" }}>
            {asset ? "Update Asset" : "Create Asset"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Risk Item Component (corrigé) ───────────────────────────────────────────
function RiskItem({ risk, onEdit, onDelete }) {
  // Utiliser directement les valeurs 0-4 (comme dans la page Risques)
  const probability = risk.probability !== undefined ? risk.probability : 0;
  const impact = risk.impact !== undefined ? risk.impact : 0;
  
  // Calculer le score avec la même formule que la page Risques
  const score = (impact + 1) * (probability + 1);
  
  // Déterminer le niveau de risque (comme dans la page Risques)
  let label, bgColor, textColor;
  if (score <= 4) {
    label = "Low";
    bgColor = C.successLight;
    textColor = C.success;
  } else if (score <= 9) {
    label = "Moderate";
    bgColor = C.infoLight;
    textColor = C.info;
  } else if (score <= 16) {
    label = "High";
    bgColor = C.warningLight;
    textColor = C.warning;
  } else {
    label = "Critical";
    bgColor = C.dangerLight;
    textColor = C.danger;
  }
  
  // Couleurs pour les statuts (comme dans la page Risques)
  const status = risk.status || risk.statut || "Open";
  const statusColors = {
    Open: { bg: "#fee2e2", color: "#dc2626" },
    "In progress": { bg: "#fef3c7", color: "#d97706" },
    Resolved: { bg: "#dcfce7", color: "#16a34a" }
  };
  
  // Normaliser le statut pour correspondre aux clés
  let statusKey = status;
  if (status.toLowerCase() === "open") statusKey = "Open";
  else if (status.toLowerCase() === "in progress") statusKey = "In progress";
  else if (status.toLowerCase() === "resolved") statusKey = "Resolved";
  else if (status.toLowerCase() === "mitigated") statusKey = "Resolved";
  
  const currentStatusColor = statusColors[statusKey] || statusColors.Open;

  return (
    <div style={{ borderRadius: 12, padding: "14px 16px", background: bgColor, border: `1px solid ${textColor}40`, transition: "all .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{risk.title || risk.intitule}</span>
            
            {/* Niveau de risque */}
            <span style={{ 
              background: bgColor, 
              color: textColor, 
              border: `1px solid ${textColor}55`, 
              borderRadius: 6, 
              padding: "3px 9px", 
              fontSize: 11, 
              fontWeight: 700 
            }}>
              {label}
            </span>
            
            {/* Statut du risque */}
            <span style={{
              borderRadius: 6, 
              padding: "3px 9px", 
              fontSize: 11, 
              fontWeight: 700,
              background: currentStatusColor.bg,
              color: currentStatusColor.color,
            }}>
              {statusKey}
            </span>
          </div>
          
          {/* Description */}
          {risk.description && (
            <p style={{ fontSize: 12, color: C.textMid, margin: "0 0 8px", lineHeight: 1.5 }}>{risk.description}</p>
          )}
          
          {/* Probabilité et Impact */}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted }}>
            <span>Probability: <b>{probability}</b></span>
            <span>Impact: <b>{impact}</b></span>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div style={{ display: "flex", gap: 6 }}>
          <button 
            onClick={onEdit} 
            style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`, 
              borderRadius: 6, 
              padding: "4px 8px", 
              cursor: "pointer", 
              fontSize: 12 
            }}
          >
            ✏️
          </button>
          <button 
            onClick={onDelete} 
            style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`, 
              borderRadius: 6, 
              padding: "4px 8px", 
              cursor: "pointer", 
              fontSize: 12 
            }}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Card Component (inchangé) ──────────────────────────────────────────
// ─── Asset Card Component (corrigé) ──────────────────────────────────────────
function AssetCard({ asset, isOpen, onToggle, onEdit, onDelete, onEditRisk, onDeleteRisk }) {
  const riskCount = asset.risks?.length || 0;
  
  // Calculer le niveau de risque le plus élevé parmi les risques de l'asset
  const getHighestRiskLevel = () => {
    if (!asset.risks || asset.risks.length === 0) return "info";
    
    let highestScore = 0;
    for (const risk of asset.risks) {
      const probability = risk.probability !== undefined ? risk.probability : 0;
      const impact = risk.impact !== undefined ? risk.impact : 0;
      const score = (impact + 1) * (probability + 1);
      highestScore = Math.max(highestScore, score);
    }
    
    // Retourner le type correspondant au score
    if (highestScore <= 4) return "success";     // Low Risk
    if (highestScore <= 9) return "warning";     // Medium Risk
    if (highestScore <= 16) return "danger";     // High Risk
    return "critical";                           // Critical Risk
  };
  
  const riskLevel = getHighestRiskLevel();
  const colors = ["#3B6FFF", "#059669", "#EA580C", "#7C3AED", "#0891B2", "#D97706"];
  const assetColor = asset.color || colors[asset.id % colors.length];

  return (
    <div style={{ 
      background: C.surface, 
      borderRadius: 16, 
      border: `1.5px solid ${isOpen ? assetColor : C.border}`,
      overflow: "hidden",
      transition: "all .2s",
      boxShadow: isOpen ? `0 4px 12px ${assetColor}20` : C.shadow
    }}>
      <div 
        onClick={onToggle}
        style={{ 
          padding: "18px 22px", 
          cursor: "pointer",
          background: isOpen ? `linear-gradient(to right, ${assetColor}08, transparent)` : C.surface
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{asset.intitule}</span>
                <span style={{ fontSize: 11, color: assetColor, background: `${assetColor}15`, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>v{asset.version || "1.0"}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip label={asset.type} bg={C.borderLight} color={C.textMuted} />
                <span>•</span>
                <span>{asset.Location}</span>
                <span>•</span>
                <span><b>{asset.owner}</b></span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: C.danger }}>Delete</button>
            <div style={{ 
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .2s",
              marginLeft: 4
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 1, height: 32, background: C.border }} />
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>RISKS</div>
            <StatusBadge count={riskCount} type={riskLevel} />
          </div>
          <div style={{ width: 1, height: 32, background: C.border }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
            {asset.risks?.slice(0, 2).map(r => (
              <Chip key={r.id} label={r.title || r.intitule} bg={C.borderLight} color={C.textMuted} />
            ))}
            {riskCount > 2 && <Chip label={`+${riskCount - 2} more`} bg={C.infoLight} color={C.info} />}
            {riskCount === 0 && <span style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No risks</span>}
          </div>
        </div>
      </div>

      {isOpen && (
        <div style={{ 
          padding: "0 22px 22px 22px",
          borderTop: `1px solid ${C.borderLight}`,
          background: `linear-gradient(135deg, ${assetColor}02, ${C.purple}02)`,
          animation: "expand .25s ease-out"
        }}>
          <style>{`
            @keyframes expand {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          
          <div style={{ marginTop: 20 }}>
            <div>
              <div style={{ 
                marginBottom: 16, 
                paddingBottom: 12, 
                borderBottom: `2px solid ${C.borderLight}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Linked Risks</span>
              </div>
              
              {riskCount === 0 ? (
                <div style={{ textAlign: "center", color: C.textMuted, padding: "48px 24px", background: C.bg, borderRadius: 12 }}>
                  No risks linked to this asset
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {asset.risks.map(risk => (
                    <RiskItem 
                      key={risk.id} 
                      risk={risk} 
                      onEdit={() => onEditRisk(asset, risk)}
                      onDelete={() => onDeleteRisk(asset.id, risk.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [openAssetId, setOpenAssetId] = useState(null);
  const [assetModal, setAssetModal] = useState(null);
  const [riskModal, setRiskModal] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [targetAsset, setTargetAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchAssetsWithRisks();
  }, [refreshTrigger]);

  const fetchAssetsWithRisks = async () => {
  setLoading(true);
  try {
    const res = await fetch("http://localhost:3000/api/assets/assets-withrisks", {
      credentials: "include"
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    console.log("Assets with risks from API:", data);

    const colors = ["#3B6FFF", "#059669", "#EA580C", "#7C3AED", "#0891B2", "#D97706"];

    const coloredAssets = data.map((asset, idx) => ({
      ...asset,
      color: colors[idx % colors.length],
      risks: (asset.risks || []).map(risk => ({
        ...risk,
        title: risk.intitule,
        // Garder les valeurs telles quelles (0-4)
        probability: risk.probabilite,  // Déjà en 0-4
        impact: risk.impact,            // Déjà en 0-4
        status: risk.statut || "open",
      }))
    }));

    setAssets(coloredAssets);
  } catch (err) {
    console.error("Error fetching assets with risks:", err);
    alert("Erreur lors du chargement des assets");
  } finally {
    setLoading(false);
  }
};
  const handleAddAsset = async (formData) => {
    try {
      const res = await fetch("http://localhost:3000/api/assets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Error adding asset");
      
      setRefreshTrigger(prev => prev + 1);
      setAssetModal(null);
    } catch (err) {
      console.error("Error adding asset:", err);
      alert("Error adding asset");
    }
  };

  const handleEditAsset = async (formData) => {
    try {
      const res = await fetch(`http://localhost:3000/api/assets/${editingAsset.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Error updating asset");
      
      setRefreshTrigger(prev => prev + 1);
      setAssetModal(null);
      setEditingAsset(null);
    } catch (err) {
      console.error("Error updating asset:", err);
      alert("Error updating asset");
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Error deleting asset");
      
      if (openAssetId === id) setOpenAssetId(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error deleting asset:", err);
      alert("Error deleting asset");
    }
  };

  const handleEditRisk = async (asset, riskData) => {
    try {
      const res = await fetch(`http://localhost:3000/api/risks/${editingRisk.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: riskData.title,
          description: riskData.description,
          probability: riskData.probability,
          impact: riskData.impact,
          status: riskData.status
        })
      });
      
      if (!res.ok) throw new Error("Error updating risk");
      
      setRefreshTrigger(prev => prev + 1);
      setRiskModal(null);
      setEditingRisk(null);
    } catch (err) {
      console.error("Error updating risk:", err);
      alert("Error updating risk");
    }
  };

  const handleDeleteRisk = async (assetId, riskId) => {
    if (!window.confirm("Are you sure you want to delete this risk?")) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/risks/${riskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Error deleting risk");
      
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error deleting risk:", err);
      alert("Error deleting risk");
    }
  };

  const filtered = assets.filter(a => {
    const matchType = typeFilter === "All" || a.type === typeFilter;
    const matchSearch = a.intitule?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalRisks = assets.reduce((s, a) => s + (a.risks?.length || 0), 0);
  const assetsWithRisks = assets.filter(a => (a.risks?.length || 0) > 0).length;

  if (loading) {
    return (
      <div style={{ fontFamily: F.body, background: C.bg, minHeight: "100vh", padding: "26px 30px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div>Loading assets...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: F.body, background: C.bg, minHeight: "100vh", padding: "26px 30px" }}>
      
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: C.text, margin: 0 }}>Assets Management</h1>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMid, margin: "5px 0 0" }}>
              Manage organizational assets and track associated risks. Click on an asset to expand and view its details.
            </p>
          </div>
          <button 
            onClick={() => { setEditingAsset(null); setAssetModal(true); }}
            style={{ padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", fontWeight: 600, fontSize: 14 }}
          >
            + Add Asset
          </button>
        </div>
      </div>

      

      <div style={{ background: C.surface, borderRadius: 14, padding: "14px 20px", border: `1px solid ${C.border}`, display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <input 
            placeholder="Search assets..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240, padding: "8px 12px 8px 32px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 13, background: C.bg, outline: "none" }}
          />
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke={C.textMuted} strokeWidth="1.4"/>
            <path d="M9 9L12 12" stroke={C.textMuted} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", ...ASSET_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: typeFilter === t ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.surfaceAlt,
              color: typeFilter === t ? "#fff" : C.textMuted,
              border: "none"
            }}>{t}</button>
          ))}
        </div>
        {(search || typeFilter !== "All") && (
          <button onClick={() => { setSearch(""); setTypeFilter("All"); }} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "none", cursor: "pointer", fontSize: 12 }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: C.textMuted, fontFamily: F.body, fontSize: 14 }}>
            No assets match your search.
          </div>
        ) : (
          filtered.map(asset => (
            <AssetCard 
              key={asset.id}
              asset={asset}
              isOpen={openAssetId === asset.id}
              onToggle={() => setOpenAssetId(openAssetId === asset.id ? null : asset.id)}
              onEdit={(a) => { setEditingAsset(a); setAssetModal(true); }}
              onDelete={handleDeleteAsset}
              onEditRisk={(a, r) => { setTargetAsset(a); setEditingRisk(r); setRiskModal(true); }}
              onDeleteRisk={handleDeleteRisk}
            />
          ))
        )}
      </div>

      {assetModal && (
        <AssetModal 
          asset={editingAsset}
          onClose={() => { setAssetModal(null); setEditingAsset(null); }}
          onSave={editingAsset ? handleEditAsset : handleAddAsset}
        />
      )}

      {riskModal && (
        <RiskModal 
          risk={editingRisk}
          onClose={() => { setRiskModal(null); setEditingRisk(null); setTargetAsset(null); }}
          onSave={(riskData) => {
            if (editingRisk) {
              handleEditRisk(targetAsset, riskData);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Risk Modal ───────────────────────────────────────────────────────────────
function RiskModal({ risk, onClose, onSave }) {
  const [form, setForm] = useState(risk || {
    title: "",
    description: "",
    probability: 3,
    impact: 3,
    status: "open"
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <Modal title={risk ? "Edit Risk" : "Add Risk"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Risk Title *</label>
          <input 
            value={form.title} 
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., SQL Injection Attack"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 14, background: C.bg, outline: "none" }}
          />
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the risk scenario..."
            rows={3}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontFamily: F.body, fontSize: 13, background: C.bg, outline: "none", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Probability (1-5)</label>
            <input 
              type="range" min={1} max={5} value={form.probability}
              onChange={e => setForm({ ...form, probability: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: C.accent }}
            />
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 4 }}>{form.probability}/5</div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Impact (1-5)</label>
            <input 
              type="range" min={1} max={5} value={form.impact}
              onChange={e => setForm({ ...form, impact: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: C.purple }}
            />
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: C.purple, marginTop: 4 }}>{form.impact}/5</div>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Status</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["open", "mitigated"].map(s => (
              <button 
                key={s}
                onClick={() => setForm({ ...form, status: s })}
                style={{
                  padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: form.status === s ? (s === "open" ? C.warningLight : C.successLight) : C.surfaceAlt,
                  color: form.status === s ? (s === "open" ? C.warning : C.success) : C.textMuted,
                  border: `1.5px solid ${form.status === s ? (s === "open" ? C.warning : C.success) : C.border}`,
                  fontFamily: F.body
                }}
              >
                {s === "open" ? "⚠ Open" : "✓ Mitigated"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 24px", borderRadius: 9, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff" }}>
            {risk ? "Update Risk" : "Add Risk"}
          </button>
        </div>
      </div>
    </Modal>
  );
}