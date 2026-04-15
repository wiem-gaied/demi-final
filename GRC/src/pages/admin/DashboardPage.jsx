// DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { X, Trash2, Mail, Globe, Phone, Search, Plus, Building2 } from "lucide-react";

const SECTOR_COLORS = {
  Finance: { accent: "#3B82F6", light: "#DBEAFE", bg: "#EFF6FF" },
  Technologie: { accent: "#8B5CF6", light: "#EDE9FE", bg: "#F5F3FF" },
  Marketing: { accent: "#F97316", light: "#FFEDD5", bg: "#FFF7ED" },
  Autre: { accent: "#6B7280", light: "#F3F4F6", bg: "#F9FAFB" },
};

// ─── Add Company Modal ─────────────────────────────
function AddCompanyModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", sector: "Finance", email: "", website: "", phone: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAddClick = async () => {
    if (!form.name.trim()) return alert("Le nom est requis");
    const companyData = { ...form, sector: form.sector || "Autre" };
    await onAdd(companyData); // Appelle la fonction transmise par le Dashboard
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "36px", width: "480px", boxShadow: "0 32px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>New Company</h2>
            <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>Fill in the company information</p>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "Company Name *", key: "name", type: "text" },
            { label: "Email", key: "email", placeholder: "contact@company.com", type: "email" },
            { label: "Website", key: "website", placeholder: "https://company.com", type: "text" },
            { label: "Phone", key: "phone", placeholder: "+216", type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: "10px", fontSize: "13px", color: "#0F172A", outline: "none", fontFamily: "inherit", transition: "border 0.15s" }}
                onFocus={e => e.target.style.border = "1.5px solid #3B6FFF"}
                onBlur={e => e.target.style.border = "1.5px solid #E2E8F0"}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>Sector</label>
            <select value={form.sector} onChange={e => set("sector", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: "10px", fontSize: "13px", color: "#0F172A", outline: "none", fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
              {Object.keys(SECTOR_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", border: "1.5px solid #E2E8F0", borderRadius: "10px", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleAddClick} style={{ flex: 2, padding: "11px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 16px rgba(59,111,255,0.3)" }}>Add Company</button>
        </div>
      </div>
    </div>
  );
}

// ─── Company Card ─────────────────────────────
function CompanyCard({ company, onDelete }) {
  const theme = SECTOR_COLORS[company.sector] || SECTOR_COLORS["Autre"];
  const initials = company.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid #F1F5F9", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all 0.2s", cursor: "default", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}80)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: theme.light, display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, fontSize: "15px", fontWeight: "700" }}>{initials}</div>
          <div>
            <div style={{ color: "#0F172A", fontSize: "14px", fontWeight: "700" }}>{company.name}</div>
            <span style={{ background: theme.bg, color: theme.accent, fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", border: `1px solid ${theme.light}` }}>{company.sector}</span>
          </div>
        </div>
        <button onClick={() => onDelete(company.id)} style={{ background: "#FEF2F2", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#EF4444" }}
          onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
          onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {company.email && <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#64748B", fontSize: "12px" }}><Mail size={12} color={theme.accent} />{company.email}</div>}
        {company.website && <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#64748B", fontSize: "12px" }}><Globe size={12} color={theme.accent} />{company.website}</div>}
        {company.phone && <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#64748B", fontSize: "12px" }}><Phone size={12} color={theme.accent} />{company.phone}</div>}
      </div>
    </div>
  );
}

// ─── DashboardPage ─────────────────────────────
export default function DashboardPage() {
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  // fetch companies
  useEffect(() => {
    fetch("http://localhost:3000/api/companies", {
    credentials: "include"
  })

      .then(res => res.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(err => { console.error(err); setCompanies([]); });
  }, []);

  // delete company
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/companies/${id}`, {
      method: "DELETE",
      credentials: "include",      // ← envoie le cookie de session
      headers: {
        "Content-Type": "application/json"
      }
    });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur serveur");
      }
      setCompanies(cs => cs.filter(c => c.id !== id));
    } catch (err) { console.error(err); alert(err.message); }
  };

  // filter search
  const filtered = Array.isArray(companies)
    ? companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.sector.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div style={{ padding: "36px", display: "flex", flexDirection: "column", gap: "28px", minHeight: "100%" }}>
      {showModal && <AddCompanyModal onClose={() => setShowModal(false)} onAdd={async (companyData) => {
        try {
          const res = await fetch("http://localhost:3000/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(companyData),
            credentials: "include" 
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Erreur serveur");
          }
          const newCompany = await res.json();
          setCompanies(cs => [newCompany, ...cs]);
        } catch (err) { console.error(err); alert(err.message); }
      }} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#94A3B8", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", fontWeight: "600" }}>Dashboard</p>
          <h1 style={{ color: "#0F172A", fontSize: "26px", fontWeight: "800", lineHeight: 1.1 }}>Managed Companies</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: "34px", paddingRight: "14px", paddingTop: "9px", paddingBottom: "9px", border: "1.5px solid #E2E8F0", borderRadius: "10px", fontSize: "13px", color: "#0F172A", outline: "none", fontFamily: "inherit", width: "200px", background: "#fff" }}
            />
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            <Plus size={15} /> Add Company
          </button>
        </div>
      </div>

      {/* Company List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
          <Building2 size={40} style={{ margin: "0 auto 14px", opacity: 0.3 }} />
          <p style={{ fontSize: "14px", fontWeight: "500" }}>{search ? "No results found" : "No companies added"}</p>
          <p style={{ fontSize: "12px", marginTop: "4px" }}>Click “Add Company” to get started</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {filtered.map(c => <CompanyCard key={c.id} company={c} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}