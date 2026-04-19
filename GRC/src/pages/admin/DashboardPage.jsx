// DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Trash2, Mail, Globe, Phone, Search, Plus, Building2, 
  Briefcase, Users, TrendingUp, ShieldCheck 
} from "lucide-react";

/* ─── Theme Constants ───────────────── */
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
    error: "#EF4444",
    errorLight: "#FEF2F2",
    errorHover: "#FEE2E2",
  },
  gradients: {
    button: "linear-gradient(135deg, #6366F1, #4F46E5)",
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
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modal: {
      background: THEME.colors.white,
      borderRadius: "24px",
      width: "500px",
      maxWidth: "90vw",
      boxShadow: THEME.shadows.modal,
    },
    header: {
      padding: "24px 28px 0 28px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    title: {
      fontSize: "20px",
      fontWeight: "700",
      color: THEME.colors.textDark,
      marginBottom: "4px",
    },
    subtitle: {
      fontSize: "13px",
      color: THEME.colors.textLight,
    },
    closeButton: {
      background: THEME.colors.borderLight,
      border: "none",
      borderRadius: "10px",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: THEME.colors.textGray,
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
      color: THEME.colors.textGray,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      border: `1.5px solid ${THEME.colors.border}`,
      borderRadius: "12px",
      fontSize: "14px",
      color: THEME.colors.textDark,
      outline: "none",
      fontFamily: "inherit",
      transition: "all 0.2s",
    },
    select: {
      width: "100%",
      padding: "10px 14px",
      border: `1.5px solid ${THEME.colors.border}`,
      borderRadius: "12px",
      fontSize: "14px",
      color: THEME.colors.textDark,
      outline: "none",
      fontFamily: "inherit",
      background: THEME.colors.white,
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
      border: `1.5px solid ${THEME.colors.border}`,
      borderRadius: "12px",
      background: THEME.colors.white,
      color: THEME.colors.textGray,
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
      background: THEME.gradients.button,
      color: THEME.colors.white,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: THEME.shadows.button,
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
            <h2 style={styles.title}>New Company</h2>
            <p style={styles.subtitle}>Fill in the company information</p>
          </div>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseEnter={(e) => e.currentTarget.style.background = THEME.colors.border}
            onMouseLeave={(e) => e.currentTarget.style.background = THEME.colors.borderLight}
          >
            <X size={16} />
          </button>
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Company Name *</label>
            <input
              type="text"
              placeholder="Ex: TechCorp Inc."
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              style={styles.input}
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>

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

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="contact@company.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              style={styles.input}
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Website</label>
            <input
              type="text"
              placeholder="https://company.com"
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
              style={styles.input}
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            <input
              type="text"
              placeholder="+216"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              style={styles.input}
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={onClose} 
            style={styles.cancelButton}
            onMouseEnter={(e) => e.currentTarget.style.background = THEME.colors.borderLight}
            onMouseLeave={(e) => e.currentTarget.style.background = THEME.colors.white}
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
      background: THEME.colors.white,
      borderRadius: "20px",
      border: `1px solid ${THEME.colors.borderLight}`,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: THEME.shadows.card,
      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      cursor: "default",
      position: "relative",
      overflow: "hidden",
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
      background: THEME.colors.primaryBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    initials: {
      fontSize: "16px",
      fontWeight: "700",
      color: THEME.colors.primary,
    },
    iconOverlay: {
      position: "absolute",
      bottom: "-4px",
      right: "-4px",
      background: THEME.colors.white,
      borderRadius: "50%",
      padding: "2px",
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      color: THEME.colors.textDark,
      fontSize: "15px",
      fontWeight: "700",
      marginBottom: "6px",
    },
    sectorBadge: {
      background: THEME.colors.primaryBg,
      color: THEME.colors.primary,
      fontSize: "10px",
      fontWeight: "600",
      padding: "3px 10px",
      borderRadius: "20px",
      display: "inline-block",
    },
    deleteButton: {
      background: THEME.colors.errorLight,
      border: "none",
      borderRadius: "8px",
      width: "30px",
      height: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: THEME.colors.error,
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
      color: THEME.colors.textGray,
      fontSize: "12px",
    },
    detailIcon: {
      color: THEME.colors.primary,
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
        boxShadow: THEME.shadows.cardHover,
        borderColor: THEME.colors.primary + "20"
      }}
      style={styles.card}
    >
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={styles.avatar}>
            <span style={styles.initials}>{initials}</span>
            <div style={styles.iconOverlay}>
              <Icon size={10} color={THEME.colors.primary} />
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
          onMouseEnter={(e) => e.currentTarget.style.background = THEME.colors.errorHover}
          onMouseLeave={(e) => e.currentTarget.style.background = THEME.colors.errorLight}
        >
          <Trash2 size={13} />
        </motion.button>
      </div>

      <div style={styles.details}>
        {company.email && (
          <div style={styles.detailRow}>
            <Mail size={12} style={styles.detailIcon} />
            <span style={styles.detailText}>{company.email}</span>
          </div>
        )}
        {company.website && (
          <div style={styles.detailRow}>
            <Globe size={12} style={styles.detailIcon} />
            <span style={styles.detailText}>{company.website}</span>
          </div>
        )}
        {company.phone && (
          <div style={styles.detailRow}>
            <Phone size={12} style={styles.detailIcon} />
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

  // Fetch companies
  useEffect(() => {
    fetch("http://localhost:3000/api/companies", {
      credentials: "include"
    })
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

  // Delete company
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

  // Add company
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

  // Filter companies
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
      background: THEME.colors.background,
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
      color: THEME.colors.primary,
      fontSize: "11px",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: "700",
      marginBottom: "8px",
    },
    title: {
      color: THEME.colors.textDark,
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
      color: THEME.colors.textLight,
    },
    searchInput: {
      paddingLeft: "34px",
      paddingRight: "14px",
      paddingTop: "10px",
      paddingBottom: "10px",
      border: `1.5px solid ${THEME.colors.border}`,
      borderRadius: "12px",
      fontSize: "13px",
      color: THEME.colors.textDark,
      outline: "none",
      fontFamily: "inherit",
      width: "220px",
      background: THEME.colors.white,
      transition: "all 0.2s",
    },
    addButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      background: THEME.gradients.button,
      border: "none",
      borderRadius: "12px",
      color: THEME.colors.white,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    emptyState: {
      textAlign: "center",
      padding: "80px 20px",
      color: THEME.colors.textLight,
    },
    emptyIcon: {
      margin: "0 auto 16px",
      opacity: 0.3,
      color: THEME.colors.textGray,
    },
    emptyTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: THEME.colors.textGray,
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
          <div style={styles.badge}>Dashboard</div>
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
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
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
            {search ? "Try different search terms" : "Click \"Add Company\" to get started"}
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