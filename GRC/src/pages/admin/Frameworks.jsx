import { useState, useEffect } from "react";
import { Edit3, Shield, Search, ChevronDown, ChevronRight, Plus } from "lucide-react";

// ── Icons (inline SVGs to avoid external deps) ──────────────────────────────
const Icon = ({ d, size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  package:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chapter:   "M4 19.5A2.5 2.5 0 016.5 17H20",
  policy:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
  plus:      "M12 5v14M5 12h14",
  chevron:   "M6 9l6 6 6-6",
  trash:     "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check:     "M20 6L9 17l-5-5",
  close:     "M18 6L6 18M6 6l12 12",
};

// ── Palette matching your GRC platform ──────────────────────────────────────
const C = {
  accent:   "#3B6FFF",
  purple:   "#6D28D9",
  bg:       "#F8FAFF",
  card:     "#FFFFFF",
  border:   "#E2E8F8",
  text:     "#1E2A4A",
  muted:    "#64748B",
  success:  "#10B981",
  warning:  "#F59E0B",
  danger:   "#EF4444",
  tag_pol:  "#EFF6FF",
  tag_prf:  "#F5F3FF",
  chip:     "#EEF2FF",
};

// ── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: C.card, borderRadius: 16, width: 440, maxWidth: "95vw",
        boxShadow: "0 24px 60px rgba(59,111,255,.18)",
        border: `1px solid ${C.border}`,
        animation: "fadeUp .22s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, padding: 4, borderRadius: 8,
          }}><Icon d={icons.close} size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

const input = {
  width: "100%", boxSizing: "border-box",
  border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "9px 13px", fontSize: 14, color: C.text,
  fontFamily: "DM Sans, sans-serif", outline: "none",
  background: C.bg,
};

// ── Buttons ──────────────────────────────────────────────────────────────────
function Btn({ label, icon, onClick, variant = "primary", small, disabled }) {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}` },
    danger:  { background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}` },
    outline: { background: "transparent", color: C.text, border: `1.5px solid ${C.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      ...styles[variant],
      borderRadius: 10, padding: small ? "5px 11px" : "8px 16px",
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      fontFamily: "DM Sans, sans-serif",
      transition: "opacity .15s",
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = ".82")}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = "1")}
    >
      {icon && <Icon d={icons[icon]} size={small ? 13 : 15} />}
      {label}
    </button>
  );
}

// ── Control Item (Level 3) ───────────────────────────────────────────────────
const ControlItem = ({ item, isReadOnly = true }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = item.description?.length > 0;

  return (
    <div style={{ marginLeft: 40, marginBottom: 6 }}>
      <div
        onClick={() => hasDesc && setOpen(!open)}
        style={{
          cursor: hasDesc ? "pointer" : "default",
          padding: "6px 10px",
          borderLeft: `3px solid ${C.accent}`,
          background: "#F9FBFF",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
          {hasDesc && (
            <ChevronRight
              size={12}
              style={{
                transform: open ? "rotate(90deg)" : "rotate(0)",
                transition: "0.2s",
              }}
            />
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
            {item.ref_id}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
        </div>
      </div>

      {open && hasDesc && (
        <p style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.5, paddingLeft: 20 }}>
          {item.description}
        </p>
      )}
    </div>
  );
};

// ── Sub Chapter (Level 2) - VERSION CORRIGÉE ─────────────────────────────────
const SubChapter = ({ sub, isReadOnly = true }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = sub.description?.length > 0;

  return (
    <div style={{ marginLeft: 20, marginBottom: 8 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
          fontSize: 13,
          color: C.text,
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
        <span style={{ fontWeight: 700, color: C.purple }}>{sub.ref_id}</span>
        <span>{sub.title}</span>
      </div>

      {open && (
        <div style={{ marginLeft: 16 }}>
          {/* ✅ AJOUT: Afficher la description du sous-chapitre */}
          {hasDesc && (
            <p style={{ 
              fontSize: 11, 
              color: C.muted, 
              marginBottom: 8, 
              paddingLeft: 8, 
              borderLeft: `2px solid ${C.border}`,
              lineHeight: 1.5
            }}>
              {sub.description}
            </p>
          )}
          {sub.items?.map((item) => (
            <ControlItem key={item.id} item={item} isReadOnly={isReadOnly} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Chapter Section (Level 1) ────────────────────────────────────────────────
// ── Chapter Section (Level 1) - VERSION CORRIGÉE ─────────────────────────────
const ChapterSection = ({ chapter, isReadOnly = true }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = chapter.description?.length > 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "8px 12px",
          background: open ? "#E9EEFF" : "#F3F6FF",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
        <span>{chapter.title}</span>
      </div>

      {open && (
        <div style={{ marginLeft: 16, marginTop: 8 }}>
          {/* ✅ AJOUT: Afficher la description du chapitre */}
          {hasDesc && (
            <p style={{ 
              fontSize: 12, 
              color: C.muted, 
              marginBottom: 12, 
              paddingLeft: 8, 
              borderLeft: `2px solid ${C.accent}30`,
              lineHeight: 1.5
            }}>
              {chapter.description}
            </p>
          )}
          {chapter.children?.map((sub) => (
            <SubChapter key={sub.id} sub={sub} isReadOnly={isReadOnly} />
          ))}
          {chapter.items?.map((item) => (
            <ControlItem key={item.id} item={item} isReadOnly={isReadOnly} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Level 1 Section (Core / Annex) ───────────────────────────────────────────
const Level1Section = ({ section, isReadOnly = true }) => {
  const [open, setOpen] = useState(true);
  const isCore = section.title?.toLowerCase().includes("core");
  const color = isCore ? C.accent : C.purple;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        }}
      >
        <ChevronDown size={14} color={color} style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }} />
        <Shield size={14} color={color} />
        <span style={{ fontWeight: 800 }}>{section.title}</span>
      </div>

      {open && (
        <div style={{ paddingLeft: 12, marginTop: 6 }}>
          {section.children?.map((ch) => (
            <ChapterSection key={ch.id} chapter={ch} isReadOnly={isReadOnly} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Package Card ─────────────────────────────────────────────────────────────
const PackageCard = ({ standard, isReadOnly = true }) => {
  const [open, setOpen] = useState(false);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && !hierarchy) {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/ciso/packages/${standard.id}/hierarchy`, {
          credentials: "include",
        });
        const data = await res.json();
        setHierarchy(data);
      } catch (error) {
        console.error("Error loading hierarchy:", error);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  return (
    <div style={{
      background: C.card, borderRadius: 14,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(59,111,255,.07)",
      marginBottom: 20, overflow: "hidden",
    }}>
      <div
        onClick={toggle}
        style={{
          background: `linear-gradient(135deg, ${C.accent}14, ${C.purple}0d)`,
          borderBottom: open ? `1.5px solid ${C.border}` : "none",
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Shield size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 800, color: C.text }}>{standard.name}</div>
          {standard.description && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{standard.description}</div>
          )}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {standard.version && <span>v{standard.version} · </span>}
            {standard.provider && <span>{standard.provider} · </span>}
            {standard.controls_count} controls
          </div>
          {standard.ref_id && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Ref: {standard.ref_id}</div>
          )}
        </div>
        <ChevronDown size={16} style={{
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform .2s",
          color: C.muted,
        }} />
      </div>

      {open && (
        <div style={{ padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{
                width: 32, height: 32,
                border: `3px solid ${C.border}`,
                borderTopColor: C.accent,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }} />
            </div>
          ) : hierarchy?.hierarchy?.length > 0 ? (
            hierarchy.hierarchy.map((section) => (
              <Level1Section key={section.id} section={section} isReadOnly={isReadOnly} />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#A0AEC0", fontSize: 14 }}>
              No hierarchy data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Frameworks() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ packages: 0, chapters: 0, policies: 0 });

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/ciso/packages", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setPackages(data);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/ciso/stats", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchStats();
  }, []);

  const filteredPackages = packages.filter(pkg =>
    pkg.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,255,.13); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 6px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "0 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64,
        position: "sticky", top: 0, zIndex: 100,
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ color: "#0F172A", fontSize: "26px", fontWeight: "800", lineHeight: 1.1 }}>
            Frameworks
          </span>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
            <input
              placeholder="Search standard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                width: 250,
                fontSize: 13,
                background: C.card,
              }}
            />
          </div>
        </div>
        
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
          {[
            { label: "Standards", value: stats.packages, color: C.accent, icon: "package" },
            { label: "Chapters", value: stats.chapters, color: "#0EA5E9", icon: "chapter" },
            { label: "Controls", value: stats.policies, color: C.accent, icon: "shield" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: C.card, borderRadius: 18, padding: "20px 24px",
              border: `1.5px solid ${C.border}`,
              boxShadow: "0 1px 8px rgba(59,111,255,.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: kpi.color + "1a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon d={icons[kpi.icon]} size={14} color={kpi.color} />
                </div>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, fontFamily: "Fraunces, Georgia, serif" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }} />
            <p style={{ marginTop: 16, color: C.muted }}>Loading standards...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredPackages.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            background: C.card, borderRadius: 16, border: `1.5px dashed ${C.border}`,
          }}>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              {search ? "No standards found" : "No standards available"}
            </div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
              {search ? "Try a different search term" : "Use the /reimport endpoint to load standards from JSON"}
            </div>
          </div>
        )}

        {/* Packages list */}
        {!loading && filteredPackages.map(pkg => (
          <PackageCard key={pkg.id} standard={pkg} isReadOnly={true} />
        ))}
      </div>
    </div>
  );
}