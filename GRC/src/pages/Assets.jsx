// Assets.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, X, Edit3, Trash2, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle, Shield, Database, Globe, Users, Key, Cpu
} from "lucide-react";

/* ─── Theme Constants (cohérent avec les autres pages) ───────────────── */
const THEME = {
  colors: {
    primary: "#6366F1",
    primaryDark: "#4F46E5",
    primaryLight: "#818CF8",
    primaryBg: "#EEF2FF",
    textDark: "#0F172A",
    textGray: "#64748B",
    textLight: "#94A3B8",
    white: "#fff",
    background: "#F8FAFC",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEF2F2",
  },
  gradients: {
    button: "linear-gradient(135deg, #6366F1, #4F46E5)",
    cardHover: "linear-gradient(135deg, rgba(99,102,241,0.02), rgba(139,92,246,0.02))",
  },
  shadows: {
    card: "0 2px 12px rgba(0,0,0,0.04)",
    cardHover: "0 8px 24px rgba(0,0,0,0.08)",
    modal: "0 32px 80px rgba(0,0,0,0.18)",
    button: "0 4px 16px rgba(99,102,241,0.3)",
  },
  animation: {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    staggerContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
  },
};

const ASSET_TYPES = ["Hardware", "Software", "Data", "Network", "Human", "IAM"];
const LOCATIONS = ["Cloud", "On-Premise", "Hybrid"];

const getAssetIcon = (type) => {
  const icons = {
    Hardware: <Cpu size={16} />,
    Software: <Database size={16} />,
    Data: <Database size={16} />,
    Network: <Globe size={16} />,
    Human: <Users size={16} />,
    IAM: <Key size={16} />,
  };
  return icons[type] || <Shield size={16} />;
};

/* ─── Status Badge ────────────────────────────────────────────────── */
const StatusBadge = ({ count, type = "info" }) => {
  const config = {
    info: { bg: THEME.colors.primaryBg, color: THEME.colors.primary, label: "No Risk" },
    success: { bg: THEME.colors.primaryBg, color: THEME.colors.primary, label: "Low Risk" },
    warning: { bg: THEME.colors.warningLight, color: THEME.colors.warning, label: "Medium Risk" },
    danger: { bg: THEME.colors.errorLight, color: THEME.colors.error, label: "High Risk" },
    critical: { bg: THEME.colors.errorLight, color: THEME.colors.error, label: "Critical Risk" }
  };
  const cfg = config[type];
  return (
    <span style={{ 
      display: "inline-flex", alignItems: "center", gap: 6, 
      padding: "4px 12px", borderRadius: 20, background: cfg.bg, 
      color: cfg.color, fontSize: 12, fontWeight: 600 
    }}>
      {cfg.label} ({count})
    </span>
  );
};

/* ─── Chip Component ────────────────────────────────────────────────── */
const Chip = ({ label, variant = "default" }) => {
  const variants = {
    primary: { bg: THEME.colors.primaryBg, color: THEME.colors.primary },
    error: { bg: THEME.colors.errorLight, color: THEME.colors.error },
    default: { bg: THEME.colors.borderLight, color: THEME.colors.textGray },
  };
  const style = variants[variant] || variants.default;
  
  return (
    <span style={{ 
      fontSize: 11, fontWeight: 600, padding: "4px 10px", 
      borderRadius: 6, background: style.bg, color: style.color, 
      whiteSpace: "nowrap" 
    }}>
      {label}
    </span>
  );
};

/* ─── Modal ────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{ 
      position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", 
      display: "flex", alignItems: "center", justifyContent: "center", 
      zIndex: 1000, backdropFilter: "blur(8px)" 
    }} onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: THEME.colors.white, borderRadius: 24, padding: 28, 
          width: 520, maxWidth: "90vw", boxShadow: THEME.shadows.modal, 
          border: `1px solid ${THEME.colors.border}` 
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: THEME.colors.textDark, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ 
            width: 32, height: 32, borderRadius: 10, border: "none", 
            background: THEME.colors.borderLight, cursor: "pointer", 
            display: "flex", alignItems: "center", justifyContent: "center" 
          }}>
            <X size={16} color={THEME.colors.textGray} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Asset Modal ──────────────────────────────────────────────────── */
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

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1.5px solid ${THEME.colors.border}`,
    fontSize: 14,
    background: THEME.colors.white,
    outline: "none",
    transition: "all 0.2s",
  };

  return (
    <Modal title={asset ? "Edit Asset" : "Add Asset"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Asset Name *</label>
          <input 
            value={form.intitule} 
            onChange={e => setForm({ ...form, intitule: e.target.value })}
            placeholder="e.g., Production Database Server"
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
            onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Type</label>
            <select 
              value={form.type} 
              onChange={e => setForm({ ...form, type: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select type</option>
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Location</label>
            <select 
              value={form.Location} 
              onChange={e => setForm({ ...form, Location: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select location</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Owner / Team</label>
          <input 
            value={form.owner} 
            onChange={e => setForm({ ...form, owner: e.target.value })}
            placeholder="e.g., DevOps Team"
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
            onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ 
            padding: "8px 20px", borderRadius: 10, border: `1.5px solid ${THEME.colors.border}`, 
            background: THEME.colors.white, cursor: "pointer", fontWeight: 600, fontSize: 13,
            color: THEME.colors.textGray
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ 
            padding: "8px 24px", borderRadius: 10, border: "none", cursor: "pointer", 
            background: THEME.gradients.button, color: THEME.colors.white, fontWeight: 600, fontSize: 13,
            boxShadow: THEME.shadows.button
          }}>
            {asset ? "Update Asset" : "Create Asset"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Risk Item Component ──────────────────────────────────────────── */
function RiskItem({ risk, onEdit, onDelete }) {
  const probability = risk.probability !== undefined ? risk.probability : 0;
  const impact = risk.impact !== undefined ? risk.impact : 0;
  const score = (impact + 1) * (probability + 1);
  
  let label, bgColor, textColor;
  if (score <= 4) {
    label = "Low";
    bgColor = THEME.colors.primaryBg;
    textColor = THEME.colors.primary;
  } else if (score <= 9) {
    label = "Moderate";
    bgColor = THEME.colors.primaryBg;
    textColor = THEME.colors.primary;
  } else if (score <= 16) {
    label = "High";
    bgColor = THEME.colors.errorLight;
    textColor = THEME.colors.error;
  } else {
    label = "Critical";
    bgColor = THEME.colors.errorLight;
    textColor = THEME.colors.error;
  }
  
  const status = risk.status || risk.statut || "Open";
  const statusColors = {
    Open: { bg: THEME.colors.errorLight, color: THEME.colors.error },
    "In progress": { bg: THEME.colors.warningLight, color: THEME.colors.warning },
    Resolved: { bg: THEME.colors.primaryBg, color: THEME.colors.primary }
  };
  
  let statusKey = status;
  if (status.toLowerCase() === "open") statusKey = "Open";
  else if (status.toLowerCase() === "in progress") statusKey = "In progress";
  else if (status.toLowerCase() === "resolved") statusKey = "Resolved";
  else if (status.toLowerCase() === "mitigated") statusKey = "Resolved";
  
  const currentStatusColor = statusColors[statusKey] || statusColors.Open;

  return (
    <div style={{ 
      borderRadius: 12, padding: "14px 16px", background: bgColor, 
      border: `1px solid ${textColor}40`, transition: "all 0.2s" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: THEME.colors.textDark }}>{risk.title || risk.intitule}</span>
            
            <span style={{ 
              background: bgColor, color: textColor, border: `1px solid ${textColor}55`, 
              borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700 
            }}>
              {label}
            </span>
            
            <span style={{
              borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700,
              background: currentStatusColor.bg, color: currentStatusColor.color,
            }}>
              {statusKey}
            </span>
          </div>
          
          {risk.description && (
            <p style={{ fontSize: 12, color: THEME.colors.textGray, margin: "0 0 8px", lineHeight: 1.5 }}>{risk.description}</p>
          )}
          
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: THEME.colors.textLight }}>
            <span>Probability: <b>{probability}</b></span>
            <span>Impact: <b>{impact}</b></span>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 6 }}>
          <button 
            onClick={onEdit} 
            style={{ 
              background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`, 
              borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12,
              color: THEME.colors.primary
            }}
          >
            <Edit3 size={14} />
          </button>
          <button 
            onClick={onDelete} 
            style={{ 
              background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`, 
              borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12,
              color: THEME.colors.error
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Asset Card Component ──────────────────────────────────────────── */
function AssetCard({ asset, isOpen, onToggle, onEdit, onDelete, onEditRisk, onDeleteRisk }) {
  const riskCount = asset.risks?.length || 0;
  
  const getHighestRiskLevel = () => {
    if (!asset.risks || asset.risks.length === 0) return "info";
    
    let highestScore = 0;
    for (const risk of asset.risks) {
      const probability = risk.probability !== undefined ? risk.probability : 0;
      const impact = risk.impact !== undefined ? risk.impact : 0;
      const score = (impact + 1) * (probability + 1);
      highestScore = Math.max(highestScore, score);
    }
    
    if (highestScore <= 4) return "success";
    if (highestScore <= 9) return "warning";
    if (highestScore <= 16) return "danger";
    return "critical";
  };
  
  const riskLevel = getHighestRiskLevel();
  const assetColor = THEME.colors.primary;

  return (
    <motion.div 
      variants={THEME.animation.fadeUp}
      style={{ 
        background: THEME.colors.white, borderRadius: 20, 
        border: `1.5px solid ${isOpen ? assetColor : THEME.colors.borderLight}`,
        overflow: "hidden", transition: "all 0.2s",
        boxShadow: isOpen ? `0 4px 12px ${assetColor}20` : THEME.shadows.card
      }}
    >
      <div 
        onClick={onToggle}
        style={{ 
          padding: "18px 22px", cursor: "pointer",
          background: isOpen ? `linear-gradient(to right, ${assetColor}08, transparent)` : THEME.colors.white
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: THEME.colors.primaryBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: THEME.colors.primary
            }}>
              {getAssetIcon(asset.type)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: THEME.colors.textDark }}>{asset.intitule}</span>
                <span style={{ fontSize: 11, color: assetColor, background: `${assetColor}15`, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  v{asset.version || "1.0"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: THEME.colors.textGray, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip label={asset.type} variant="default" />
                <span>•</span>
                <span>{asset.Location}</span>
                <span>•</span>
                <span><b>{asset.owner}</b></span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(asset); }} 
              style={{ 
                background: THEME.colors.borderLight, border: `1px solid ${THEME.colors.border}`, 
                borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12,
                color: THEME.colors.primary
              }}
            >
              <Edit3 size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} 
              style={{ 
                background: THEME.colors.borderLight, border: `1px solid ${THEME.colors.border}`, 
                borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, 
                color: THEME.colors.error
              }}
            >
              <Trash2 size={14} />
            </button>
            <div style={{ 
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s", marginLeft: 4, color: THEME.colors.textLight
            }}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 1, height: 32, background: THEME.colors.border }} />
          <div>
            <div style={{ fontSize: 11, color: THEME.colors.textGray, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>RISKS</div>
            <StatusBadge count={riskCount} type={riskLevel} />
          </div>
          <div style={{ width: 1, height: 32, background: THEME.colors.border }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
            {asset.risks?.slice(0, 2).map(r => (
              <Chip key={r.id} label={r.title || r.intitule} variant="default" />
            ))}
            {riskCount > 2 && <Chip label={`+${riskCount - 2} more`} variant="primary" />}
            {riskCount === 0 && <span style={{ fontSize: 12, color: THEME.colors.textLight, fontStyle: "italic" }}>No risks</span>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ 
              borderTop: `1px solid ${THEME.colors.borderLight}`,
              background: `linear-gradient(135deg, ${assetColor}02, transparent)`,
              overflow: "hidden"
            }}
          >
            <div style={{ padding: "0 22px 22px 22px" }}>
              <div style={{ marginTop: 20 }}>
                <div style={{ 
                  marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${THEME.colors.borderLight}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.colors.textGray, textTransform: "uppercase" }}>Linked Risks</span>
                </div>
                
                {riskCount === 0 ? (
                  <div style={{ textAlign: "center", color: THEME.colors.textLight, padding: "48px 24px", background: THEME.colors.borderLight, borderRadius: 12 }}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Risk Modal ───────────────────────────────────────────────────── */
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

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1.5px solid ${THEME.colors.border}`,
    fontSize: 14,
    background: THEME.colors.white,
    outline: "none",
    transition: "all 0.2s",
  };

  return (
    <Modal title={risk ? "Edit Risk" : "Add Risk"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Risk Title *</label>
          <input 
            value={form.title} 
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., SQL Injection Attack"
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
            onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
          />
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the risk scenario..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Probability (1-5)</label>
            <input 
              type="range" min={1} max={5} value={form.probability}
              onChange={e => setForm({ ...form, probability: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: THEME.colors.primary }}
            />
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: THEME.colors.primary, marginTop: 4 }}>{form.probability}/5</div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Impact (1-5)</label>
            <input 
              type="range" min={1} max={5} value={form.impact}
              onChange={e => setForm({ ...form, impact: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: THEME.colors.primary }}
            />
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: THEME.colors.primary, marginTop: 4 }}>{form.impact}/5</div>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.colors.textGray, marginBottom: 6, textTransform: "uppercase" }}>Status</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["open", "mitigated"].map(s => (
              <button 
                key={s}
                onClick={() => setForm({ ...form, status: s })}
                style={{
                  padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: form.status === s ? (s === "open" ? THEME.colors.errorLight : THEME.colors.primaryBg) : THEME.colors.borderLight,
                  color: form.status === s ? (s === "open" ? THEME.colors.error : THEME.colors.primary) : THEME.colors.textGray,
                  border: `1.5px solid ${form.status === s ? (s === "open" ? THEME.colors.error : THEME.colors.primary) : THEME.colors.border}`,
                }}
              >
                {s === "open" ? "⚠ Open" : "✓ Mitigated"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ 
            padding: "8px 20px", borderRadius: 10, border: `1.5px solid ${THEME.colors.border}`, 
            background: THEME.colors.white, cursor: "pointer", fontWeight: 600, fontSize: 13,
            color: THEME.colors.textGray
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ 
            padding: "8px 24px", borderRadius: 10, border: "none", cursor: "pointer", 
            background: THEME.gradients.button, color: THEME.colors.white, fontWeight: 600, fontSize: 13,
            boxShadow: THEME.shadows.button
          }}>
            {risk ? "Update Risk" : "Add Risk"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Assets Page ──────────────────────────────────────────────── */
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

      const coloredAssets = data.map((asset) => ({
        ...asset,
        risks: (asset.risks || []).map(risk => ({
          ...risk,
          title: risk.intitule,
          probability: risk.probabilite,
          impact: risk.impact,
          status: risk.statut || "open",
        }))
      }));

      setAssets(coloredAssets);
    } catch (err) {
      console.error("Error fetching assets with risks:", err);
      alert("Error loading assets");
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

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: THEME.colors.background, minHeight: "100vh", padding: "26px 30px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${THEME.colors.border}`, borderTopColor: THEME.colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: THEME.colors.textGray }}>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: THEME.colors.background, minHeight: "100vh", padding: "26px 30px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus, select:focus { 
          border-color: ${THEME.colors.primary} !important; 
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1); 
        }
      `}</style>
      
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ color: THEME.colors.primary, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>Asset Management</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.colors.textDark, margin: 0 }}>Assets Management</h1>
            <p style={{ fontSize: 14, color: THEME.colors.textGray, margin: "5px 0 0" }}>
              Manage organizational assets and track associated risks. Click on an asset to expand and view its details.
            </p>
          </div>
          <button 
            onClick={() => { setEditingAsset(null); setAssetModal(true); }}
            style={{ 
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", 
              background: THEME.gradients.button, color: THEME.colors.white, fontWeight: 600, fontSize: 14,
              boxShadow: THEME.shadows.button
            }}
          >
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      <div style={{ 
        background: THEME.colors.white, borderRadius: 16, padding: "14px 20px", 
        border: `1px solid ${THEME.colors.border}`, display: "flex", gap: 16, 
        flexWrap: "wrap", marginBottom: 24, alignItems: "center" 
      }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: THEME.colors.textLight }} />
          <input 
            placeholder="Search assets..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: 240, padding: "8px 12px 8px 32px", borderRadius: 10, 
              border: `1.5px solid ${THEME.colors.border}`, fontSize: 13, 
              background: THEME.colors.white, outline: "none" 
            }}
            onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
            onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", ...ASSET_TYPES].map(t => (
            <button 
              key={t} 
              onClick={() => setTypeFilter(t)} 
              style={{
                padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: typeFilter === t ? THEME.gradients.button : THEME.colors.borderLight,
                color: typeFilter === t ? THEME.colors.white : THEME.colors.textGray,
                border: "none", transition: "all 0.2s",
                boxShadow: typeFilter === t ? THEME.shadows.button : "none"
              }}
            >{t}</button>
          ))}
        </div>
        {(search || typeFilter !== "All") && (
          <button onClick={() => { setSearch(""); setTypeFilter("All"); }} style={{ 
            marginLeft: "auto", padding: "6px 12px", borderRadius: 8, 
            border: `1.5px solid ${THEME.colors.border}`, background: "none", 
            cursor: "pointer", fontSize: 12, color: THEME.colors.textGray
          }}>
            Clear filters
          </button>
        )}
      </div>

      <motion.div 
        variants={THEME.animation.staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: THEME.colors.textLight, fontSize: 14 }}>
            No assets match your search.
          </div>
        ) : (
          filtered.map((asset, index) => (
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
      </motion.div>

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
}