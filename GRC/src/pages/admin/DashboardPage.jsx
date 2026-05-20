// DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Trash2, Mail, Globe, Phone, Search, Plus, Building2, 
  Briefcase, Users, TrendingUp, ShieldCheck 
} from "lucide-react";

/* ─── Color System ───────────────────────────── */
const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  wow: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
  purple: "#6D28D9", purpleLight: "#F5F0FF",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#061585", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  info: "#0891B2", infoLight: "#ECFEFF",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
  shadowMd: "0 4px 12px rgba(15,23,42,0.09)",
  shadowLg: "0 10px 30px rgba(15,23,42,0.13)",
};
C.accent = `linear-gradient(135deg, ${C.wow}, ${C.warning})`;

/* ─── Theme Constants ───────────────── */
const THEME = {
  colors: {
    primary: C.wow,
    primaryDark: C.accentHover,
    primaryLight: "#6B93FF",
    primaryBg: C.accentLight,
    textDark: C.text,
    textGray: C.textMid,
    textLight: C.textMuted,
    white: C.surface,
    background: C.bg,
    border: C.border,
    borderLight: C.surfaceAlt,
    error: C.danger,
    errorLight: C.dangerLight,
    errorHover: "#FEE2E2",
  },
  gradients: {
    button: C.accent,
  },
  shadows: {
    card: C.shadow,
    cardHover: C.shadowMd,
    modal: C.shadowLg,
    button: `0 4px 16px rgba(59,111,255,0.35)`,
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

const SECTOR_COLORS = {
  Finance: { icon: TrendingUp },
  Technology: { icon: ShieldCheck },
  Marketing: { icon: Users },
  Other: { icon: Briefcase },
};

/* ─── Add Company Modal ───────────────────────────── */
const AddCompanyModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ 
    name: "", 
    sector: "Finance", 
    email: "", 
    website: "", 
    phone: "" 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Company name is required");
      return;
    }
    setIsSubmitting(true);
    const companyData = { ...form, sector: form.sector || "Other" };
    await onAdd(companyData);
    setIsSubmitting(false);
    onClose();
  };

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modal: {
      background: C.surface,
      borderRadius: "24px",
      width: "500px",
      maxWidth: "90vw",
      boxShadow: C.shadowLg,
      border: `1px solid ${C.border}`,
    },
    header: {
      padding: "24px 28px 0 28px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    titleAccent: {
      display: "inline-block",
      fontSize: "20px",
      fontWeight: "700",
      background: C.accent,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      marginBottom: "4px",
    },
    subtitle: {
      fontSize: "13px",
      color: C.textMuted,
    },
    closeButton: {
      background: C.surfaceAlt,
      border: `1px solid ${C.border}`,
      borderRadius: "10px",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.textMid,
      transition: "all 0.2s",
    },
    form: {
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "600",
      color: C.textMid,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      border: `1.5px solid ${C.border}`,
      borderRadius: "12px",
      fontSize: "14px",
      color: C.text,
      outline: "none",
      fontFamily: "inherit",
      transition: "all 0.2s",
      background: C.surface,
      boxSizing: "border-box",
    },
    select: {
      width: "100%",
      padding: "10px 14px",
      border: `1.5px solid ${C.border}`,
      borderRadius: "12px",
      fontSize: "14px",
      color: C.text,
      outline: "none",
      fontFamily: "inherit",
      background: C.surface,
      cursor: "pointer",
    },
    actions: {
      padding: "0 28px 28px 28px",
      display: "flex",
      gap: "12px",
    },
    cancelButton: {
      flex: 1,
      padding: "11px",
      border: `1.5px solid ${C.border}`,
      borderRadius: "12px",
      background: C.surface,
      color: C.textMid,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    submitButton: {
      flex: 2,
      padding: "11px",
      border: "none",
      borderRadius: "12px",
      background: C.accent,
      color: C.surface,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: `0 4px 16px rgba(59,111,255,0.35)`,
      transition: "all 0.2s",
      opacity: isSubmitting ? 0.7 : 1,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div>
            <h2 style={styles.titleAccent}>New Company</h2>
            <p style={styles.subtitle}>Fill in the company information</p>
          </div>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseEnter={(e) => e.currentTarget.style.background = C.border}
            onMouseLeave={(e) => e.currentTarget.style.background = C.surfaceAlt}
          >
            <X size={16} />
          </button>
        </div>

        <div style={styles.form}>
          {[
            { key: "name", label: "Company Name *", type: "text", placeholder: "Ex: TechCorp Inc." },
            { key: "email", label: "Email", type: "email", placeholder: "contact@company.com" },
            { key: "website", label: "Website", type: "text", placeholder: "https://company.com" },
            { key: "phone", label: "Phone", type: "text", placeholder: "+216" },
          ].map(({ key, label, type, placeholder }) =>
            key === "sector" ? null : (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  style={styles.input}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.wow;
                    e.target.style.boxShadow = `0 0 0 3px rgba(59,111,255,0.12)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            )
          )}

          <div style={styles.field}>
            <label style={styles.label}>Sector</label>
            <select 
              value={form.sector} 
              onChange={(e) => handleChange("sector", e.target.value)}
              style={styles.select}
            >
              {Object.keys(SECTOR_COLORS).map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={onClose} 
            style={styles.cancelButton}
            onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={(e) => e.currentTarget.style.background = C.surface}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            style={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Company"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Company Card ───────────────────────────── */
const CompanyCard = ({ company, onDelete, index }) => {
  const sectorConfig = SECTOR_COLORS[company.sector] || SECTOR_COLORS["Other"];
  const Icon = sectorConfig.icon;
  const initials = company.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const styles = {
    card: {
      background: C.surface,
      borderRadius: "20px",
      border: `1px solid ${C.border}`,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: C.shadow,
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      cursor: "default",
      position: "relative",
      overflow: "hidden",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "3px",
      background: C.accent,
      borderRadius: "20px 20px 0 0",
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    avatar: {
      width: "48px",
      height: "48px",
      borderRadius: "14px",
      background: C.accentLight,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      border: `1px solid ${C.borderStrong}`,
    },
    initials: {
      fontSize: "16px",
      fontWeight: "700",
      background: C.accent,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    iconOverlay: {
      position: "absolute",
      bottom: "-4px",
      right: "-4px",
      background: C.surface,
      borderRadius: "50%",
      padding: "2px",
      boxShadow: C.shadow,
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      color: C.text,
      fontSize: "15px",
      fontWeight: "700",
      marginBottom: "6px",
    },
    sectorBadge: {
      background: C.accentLight,
      color: C.wow,
      fontSize: "10px",
      fontWeight: "600",
      padding: "3px 10px",
      borderRadius: "20px",
      display: "inline-block",
      border: `1px solid ${C.borderStrong}`,
    },
    deleteButton: {
      background: C.dangerLight,
      border: "none",
      borderRadius: "8px",
      width: "30px",
      height: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.danger,
      transition: "all 0.2s",
    },
    details: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    detailRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: C.textMid,
      fontSize: "12px",
    },
    detailText: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };

  return (
    <motion.div
      variants={THEME.animation.fadeUp}
      custom={index}
      whileHover={{ 
        y: -4, 
        boxShadow: C.shadowMd,
        borderColor: C.borderStrong,
      }}
      style={styles.card}
    >
      {/* Accent top bar */}
      <div style={styles.accentBar} />

      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={styles.avatar}>
            <span style={styles.initials}>{initials}</span>
            <div style={styles.iconOverlay}>
              <Icon size={10} color={C.wow} />
            </div>
          </div>
          <div style={styles.companyInfo}>
            <div style={styles.companyName}>{company.name}</div>
            <span style={styles.sectorBadge}>{company.sector}</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(company.id)}
          style={styles.deleteButton}
          onMouseEnter={(e) => e.currentTarget.style.background = "#FEE2E2"}
          onMouseLeave={(e) => e.currentTarget.style.background = C.dangerLight}
        >
          <Trash2 size={13} />
        </motion.button>
      </div>

      <div style={styles.details}>
        {company.email && (
          <div style={styles.detailRow}>
            <Mail size={12} color={C.wow} />
            <span style={styles.detailText}>{company.email}</span>
          </div>
        )}
        {company.website && (
          <div style={styles.detailRow}>
            <Globe size={12} color={C.wow} />
            <span style={styles.detailText}>{company.website}</span>
          </div>
        )}
        {company.phone && (
          <div style={styles.detailRow}>
            <Phone size={12} color={C.wow} />
            <span style={styles.detailText}>{company.phone}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── DashboardPage ───────────────────────────── */
export default function DashboardPage() {
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/companies", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setCompanies(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setCompanies([]);
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/companies/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Server error");
      }
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleAdd = async (companyData) => {
    try {
      const res = await fetch("http://localhost:3000/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
        credentials: "include"
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Server error");
      }
      const newCompany = await res.json();
      setCompanies(prev => [newCompany, ...prev]);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const filteredCompanies = Array.isArray(companies)
    ? companies.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.sector.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const styles = {
    container: {
      padding: "32px 36px",
      minHeight: "100%",
      background: C.bg,
    },
    header: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: "32px",
      flexWrap: "wrap",
      gap: "16px",
    },
    headerLeft: {
      flex: 1,
    },
    badge: {
      display: "inline-block",
      fontSize: "11px",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: "700",
      marginBottom: "8px",
      background: C.accent,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    title: {
      color: C.text,
      fontSize: "28px",
      fontWeight: "800",
      lineHeight: 1.2,
    },
    actions: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
    },
    searchContainer: {
      position: "relative",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: C.textMuted,
    },
    searchInput: {
      paddingLeft: "34px",
      paddingRight: "14px",
      paddingTop: "10px",
      paddingBottom: "10px",
      border: `1.5px solid ${C.border}`,
      borderRadius: "12px",
      fontSize: "13px",
      color: C.text,
      outline: "none",
      fontFamily: "inherit",
      width: "220px",
      background: C.surface,
      transition: "all 0.2s",
    },
    addButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      background: C.accent,
      border: "none",
      borderRadius: "12px",
      color: C.surface,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: `0 4px 16px rgba(59,111,255,0.3)`,
    },
    emptyState: {
      textAlign: "center",
      padding: "80px 20px",
      color: C.textMuted,
    },
    emptyIcon: {
      margin: "0 auto 16px",
      opacity: 0.3,
      color: C.textMid,
    },
    emptyTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: C.textMid,
      marginBottom: "4px",
    },
    emptySubtitle: {
      fontSize: "13px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
      gap: "20px",
    },
  };

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {showModal && (
          <AddCompanyModal 
            onClose={() => setShowModal(false)} 
            onAdd={handleAdd} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Managed Companies</h1>
        </div>
        <div style={styles.actions}>
          <div style={styles.searchContainer}>
            <Search size={14} style={styles.searchIcon} />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
              onFocus={(e) => {
                e.target.style.borderColor = C.wow;
                e.target.style.boxShadow = `0 0 0 3px rgba(59,111,255,0.12)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02, opacity: 0.92 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            style={styles.addButton}
          >
            <Plus size={16} /> Add Company
          </motion.button>
        </div>
      </div>

      {/* Company List */}
      {isLoading ? (
        <div style={styles.emptyState}>
          <Building2 size={48} style={styles.emptyIcon} />
          <p style={styles.emptyTitle}>Loading...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div style={styles.emptyState}>
          <Building2 size={48} style={styles.emptyIcon} />
          <p style={styles.emptyTitle}>
            {search ? "No results found" : "No companies"}
          </p>
          <p style={styles.emptySubtitle}>
            {search ? "Try different search terms" : 'Click "Add Company" to get started'}
          </p>
        </div>
      ) : (
        <motion.div
          variants={THEME.animation.staggerContainer}
          initial="hidden"
          animate="visible"
          style={styles.grid}
        >
          {filteredCompanies.map((company, index) => (
            <CompanyCard 
              key={company.id} 
              company={company} 
              onDelete={handleDelete}
              index={index}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}