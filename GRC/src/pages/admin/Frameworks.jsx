// Frameworks.jsx — admin page
// Same visual identity as your original. Adds:
//   - "Scrape Framework" button  (calls /api/scraper/scrape)
//   - "Add Custom Framework" button  (calls /api/framauditor/add-custom-framework)
//   - Visibility-aware listing  (server filters by current user; admin scrapes
//     produce public rows visible to everyone)
// All endpoints require auth (handled server-side by authenticateToken).

import { useState, useEffect } from "react";
import {
  Shield, Search, ChevronDown, ChevronRight, Plus,
  CheckCircle, X, AlertCircle, Database
} from "lucide-react";

// ── Inline icons ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  package: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chapter: "M4 19.5A2.5 2.5 0 016.5 17H20",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  close:   "M18 6L6 18M6 6l12 12",
};

// ── Palette (unchanged) ──────────────────────────────────────────────────────
const C = {
  accent: "#3B6FFF", purple: "#6D28D9",
  bg: "#F8FAFF", card: "#FFFFFF", border: "#E2E8F8",
  text: "#1E2A4A", muted: "#64748B",
  success: "#10B981", warning: "#F59E0B", danger: "#EF4444",
  chip: "#EEF2FF",
};

// ============================================================
// ScrapeFrameworkModal (admin scrape — produces public rows)
// ============================================================
function ScrapeFrameworkModal({ onClose, onConfirm }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("http://localhost:3000/api/scraper/available", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const frameworks = Array.isArray(data) ? data : (data.frameworks || []);
        setList(frameworks.map((f, i) => ({
          id: f.id || f.frameworkId || `fw-${i}`,
          name: f.name || f.title || "Untitled",
          provider: f.provider || "",
          description: f.description || "",
          version: Array.isArray(f.versions) ? f.versions[0] : (f.version || "1.0"),
        })));
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selected = list.find(f => f.id === selectedId);
  const filtered = list.filter(f => {
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) ||
           (f.provider || "").toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (!selected) return alert("Please select a framework");
    setIsScraping(true);
    try {
      await onConfirm({
        frameworkId: selected.id,
        name: selected.name,
        provider: selected.provider,
        version: selected.version,
        description: selected.description,
      });
      onClose();
    } catch (e) {
      alert("Error scraping framework: " + e.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalBox(640)} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <span style={modalTitle}>Scrape Security Framework</span>
          <button onClick={onClose} style={iconButton}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Pick a framework. Its full hierarchy is scraped and stored. Admin scrapes are visible to all users.
          </p>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={16} style={searchIcon} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search frameworks..."
              disabled={loading}
              style={{ ...inputStyle, paddingLeft: 36, background: loading ? C.bg : C.card }}
            />
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16, minHeight: 120 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={spinner} />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Loading available frameworks...</div>
              </div>
            ) : loadError ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <AlertCircle size={20} color={C.danger} />
                <div style={{ fontSize: 13, color: C.danger, fontWeight: 600, marginTop: 8 }}>Failed to load</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{loadError}</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>
                {list.length === 0 ? "No frameworks available." : "No matches."}
              </div>
            ) : filtered.map(fw => {
              const sel = fw.id === selectedId;
              return (
                <div key={fw.id} onClick={() => setSelectedId(fw.id)}
                  style={{
                    padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", background: sel ? `${C.accent}10` : "transparent",
                    borderLeft: sel ? `3px solid ${C.accent}` : "3px solid transparent",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${sel ? C.accent : C.border}`,
                    background: sel ? C.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{sel && <CheckCircle size={10} color="#fff" />}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fw.name}</span>
                      {fw.provider && (
                        <span style={{
                          fontSize: 10, background: C.chip, color: C.accent,
                          padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                        }}>{fw.provider}</span>
                      )}
                    </div>
                    {fw.description && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fw.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={handleSubmit} disabled={!selected || isScraping || loading}
              style={{ ...btnPrimary, opacity: (!selected || loading) ? 0.6 : 1 }}>
              {isScraping ? "Scraping..." : "Start Scraping"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AddCustomFrameworkModal (Core mandatory + Annex optional)
// Identical UX to the user page — admin's custom is public.
// ============================================================


// ============================================================
// Read-only viewer components (kept identical to your original)
// ============================================================
const ControlItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = item.description?.length > 0;
  return (
    <div style={{ marginLeft: 40, marginBottom: 6 }}>
      <div onClick={() => hasDesc && setOpen(!open)} style={{
        cursor: hasDesc ? "pointer" : "default",
        padding: "6px 10px", borderLeft: `3px solid ${C.accent}`,
        background: "#F9FBFF", borderRadius: 6,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
          {hasDesc && <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "0.2s" }} />}
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

const SubChapter = ({ sub }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = sub.description?.length > 0;
  return (
    <div style={{ marginLeft: 20, marginBottom: 8 }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6,
        fontWeight: 600, fontSize: 13, color: C.text, cursor: "pointer", padding: "4px 0",
      }}>
        <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
        <span style={{ fontWeight: 700, color: C.purple }}>{sub.ref_id}</span>
        <span>{sub.title}</span>
      </div>
      {open && (
        <div style={{ marginLeft: 16 }}>
          {hasDesc && (
            <p style={{
              fontSize: 11, color: C.muted, marginBottom: 8,
              paddingLeft: 8, borderLeft: `2px solid ${C.border}`, lineHeight: 1.5
            }}>{sub.description}</p>
          )}
          {sub.children?.map(s => <SubChapter key={s.id} sub={s} />)}
          {sub.items?.map(it => <ControlItem key={it.id} item={it} />)}
        </div>
      )}
    </div>
  );
};

const ChapterSection = ({ chapter }) => {
  const [open, setOpen] = useState(false);
  const hasDesc = chapter.description?.length > 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "8px 12px", background: open ? "#E9EEFF" : "#F3F6FF",
        borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
        <span>{chapter.title}</span>
      </div>
      {open && (
        <div style={{ marginLeft: 16, marginTop: 8 }}>
          {hasDesc && (
            <p style={{
              fontSize: 12, color: C.muted, marginBottom: 12,
              paddingLeft: 8, borderLeft: `2px solid ${C.accent}30`, lineHeight: 1.5
            }}>{chapter.description}</p>
          )}
          {chapter.children?.map(s => <SubChapter key={s.id} sub={s} />)}
          {chapter.items?.map(it => <ControlItem key={it.id} item={it} />)}
        </div>
      )}
    </div>
  );
};

const Level1Section = ({ section }) => {
  const [open, setOpen] = useState(true);
  const isAnnex = section.isAnnex === true || section.title?.toLowerCase()?.includes("annex");
  const color = isAnnex ? C.purple : C.accent;
  return (
    <div style={{ marginBottom: 14 }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "10px 14px", borderRadius: 8, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      }}>
        <ChevronDown size={14} color={color} style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }} />
        <Shield size={14} color={color} />
        <span style={{ fontWeight: 800 }}>{section.title}</span>
      </div>
      {open && (
        <div style={{ paddingLeft: 12, marginTop: 6 }}>
          {section.children?.map(ch => <ChapterSection key={ch.id} chapter={ch} />)}
          {section.items?.map(it => <ControlItem key={it.id} item={it} />)}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PackageCard — shows one framework with a "Public" or "Private" tag
// ============================================================
const PackageCard = ({ standard }) => {
  const [open, setOpen] = useState(false);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(false);

  const isPublic = standard.created_by_user_id == null;

  const toggle = async () => {
    if (!open && !hierarchy) {
      setLoading(true);
      try {
        const r = await fetch(`http://localhost:3000/api/ciso/packages/${standard.id}/hierarchy`, { credentials: "include" });
        const data = await r.json();
        setHierarchy(data);
      } catch (e) {
        console.error("hierarchy error:", e);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  return (
    <div style={{
      background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(59,111,255,.07)", marginBottom: 20, overflow: "hidden",
    }}>
      <div onClick={toggle} style={{
        background: `linear-gradient(135deg, ${C.accent}14, ${C.purple}0d)`,
        borderBottom: open ? `1.5px solid ${C.border}` : "none",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><Shield size={18} color="#fff" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 800, color: C.text }}>
              {standard.name}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: isPublic ? C.success : C.warning, color: "#fff",
              padding: "2px 8px", borderRadius: 12,
            }}>
              {isPublic ? "Public" : "Private"}
            </span>
            {standard.is_custom === 1 && (
              <span style={{
                fontSize: 10, fontWeight: 700, background: C.purple, color: "#fff",
                padding: "2px 8px", borderRadius: 12,
              }}>Custom</span>
            )}
          </div>
          {standard.description && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{standard.description}</div>
          )}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {standard.version && <span>v{standard.version} · </span>}
            {standard.provider && <span>{standard.provider} · </span>}
            {standard.controls_count} controls
          </div>
        </div>
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", color: C.muted }} />
      </div>
      {open && (
        <div style={{ padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={spinner} />
            </div>
          ) : hierarchy?.hierarchy?.length > 0 ? (
            hierarchy.hierarchy.map(s => <Level1Section key={s.id} section={s} />)
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

// ============================================================
// Main page
// ============================================================
export default function Frameworks() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ standards: 0, families: 0, controls: 0, coreChapters: 0 });
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const r = await fetch("http://localhost:3000/api/ciso/packages", { credentials: "include" });
      if (r.status === 401) { setPackages([]); setNeedsLogin(true); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPackages(data);
      setNeedsLogin(false);
    } catch (e) {
      console.error("packages error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const r = await fetch("http://localhost:3000/api/ciso/stats", { credentials: "include" });
      if (r.ok) setStats(await r.json());
    } catch (e) {
      console.error("stats error:", e);
    }
  };

  useEffect(() => { fetchPackages(); fetchStats(); }, []);

  const handleScrape = async (data) => {
    const r = await fetch("http://localhost:3000/api/scraper/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (r.status === 401) { setNeedsLogin(true); throw new Error("Login required"); }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || "Scrape failed");
    }
    await fetchPackages();
    await fetchStats();
  };

  const handleAddCustom = async (payload) => {
    const r = await fetch("http://localhost:3000/api/framauditor/add-custom-framework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (r.status === 401) { setNeedsLogin(true); throw new Error("Login required"); }
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Backend error ${r.status}: ${text}`);
    }
    await fetchPackages();
    await fetchStats();
  };

  const filteredPackages = packages.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
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

      <div style={{
        padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64, position: "sticky", top: 0, zIndex: 100,
        background: C.bg, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ color: "#0F172A", fontSize: "26px", fontWeight: "800", lineHeight: 1.1 }}>
            Frameworks
          </span>
          <div style={{ position: "relative" }}>
            <Search size={16} style={searchIcon} />
            <input
              placeholder="Search standard..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32, width: 250 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setScrapeOpen(true)}
            disabled={needsLogin}
            style={{ ...btnPrimary, opacity: needsLogin ? 0.5 : 1, cursor: needsLogin ? "not-allowed" : "pointer" }}
          >
            <Plus size={14} style={{ marginRight: 6 }} /> Scrape Framework
          </button>
          
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {needsLogin && (
          <div style={{
            background: C.card, borderRadius: 16,
            border: `1.5px solid ${C.border}`,
            padding: "60px 24px", textAlign: "center",
            boxShadow: "0 2px 16px rgba(59,111,255,.07)",
            marginBottom: 32,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.accent}1a, ${C.purple}1a)`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8,
            }}>
              Authentication required
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              You must be logged in to view this page.<br />
              Please sign in to your account to access frameworks.
            </div>
            <button
              onClick={() => { window.location.href = "/login"; }}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          </div>
        )}

        {!needsLogin && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
          {[
            { label: "Standards", value: stats.standards ?? stats.packages, color: C.accent, icon: "package" },
            { label: "Chapters",  value: stats.coreChapters ?? stats.chapters, color: "#0EA5E9", icon: "chapter" },
            { label: "Controls",  value: stats.controls ?? stats.policies, color: C.accent, icon: "shield" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: C.card, borderRadius: 18, padding: "20px 24px",
              border: `1.5px solid ${C.border}`, boxShadow: "0 1px 8px rgba(59,111,255,.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: kpi.color + "1a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon d={icons[kpi.icon]} size={14} color={kpi.color} /></div>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, fontFamily: "Fraunces, Georgia, serif" }}>
                {kpi.value ?? 0}
              </div>
            </div>
          ))}
        </div>}

        {!needsLogin && loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={spinner} />
            <p style={{ marginTop: 16, color: C.muted }}>Loading standards...</p>
          </div>
        )}

        {!needsLogin && !loading && filteredPackages.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            background: C.card, borderRadius: 16, border: `1.5px dashed ${C.border}`,
          }}>
            <Database size={36} color={C.muted} style={{ opacity: 0.6, marginBottom: 12 }} />
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              {search ? "No standards found" : "No frameworks yet"}
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              {search ? "Try a different search term."
                      : 'Click "Scrape Framework" to fetch one from CISO Assistant, or "Add Custom Framework" to build your own.'}
            </div>
          </div>
        )}

        {!needsLogin && !loading && filteredPackages.map(pkg => (
          <PackageCard key={pkg.id} standard={pkg} />
        ))}
      </div>

      {scrapeOpen && <ScrapeFrameworkModal onClose={() => setScrapeOpen(false)} onConfirm={handleScrape} />}
      {customOpen && <AddCustomFrameworkModal onClose={() => setCustomOpen(false)} onConfirm={handleAddCustom} />}
    </div>
  );
}

// ============================================================
// Shared inline styles
// ============================================================
const modalBackdrop = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  overflow: "auto", padding: 20,
};
const modalBox = (width) => ({
  background: C.card, borderRadius: 16, width, maxWidth: "95vw",
  maxHeight: "90vh", overflow: "auto",
  boxShadow: "0 24px 60px rgba(59,111,255,.18)",
  border: `1px solid ${C.border}`,
});
const modalHeader = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
};
const modalTitle = { fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text };
const iconButton = { background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 8 };
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "9px 13px", fontSize: 13, color: C.text,
  fontFamily: "DM Sans, sans-serif", outline: "none", background: C.card,
};
const smallInput = { padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12 };
const tinyInput  = { padding: "4px 8px",  border: `1px solid ${C.border}`,   borderRadius: 6, fontSize: 11 };
const controlRow = {
  display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 6,
  marginBottom: 4, padding: 6, background: "#F0FDF4", borderRadius: 6,
};
const dashedButton = (color) => ({
  padding: "4px 10px", border: `1px dashed ${color}`, background: "transparent",
  color, borderRadius: 6, fontSize: 11, cursor: "pointer",
});
const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 10, border: "none",
  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnSecondary = {
  padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${C.border}`,
  background: "transparent", cursor: "pointer", fontSize: 13,
};
const searchIcon = { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted };
const spinner = {
  width: 32, height: 32, margin: "0 auto",
  border: `3px solid ${C.border}`, borderTopColor: C.accent,
  borderRadius: "50%", animation: "spin 0.8s linear infinite",
};