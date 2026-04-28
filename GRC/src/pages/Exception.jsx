import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

// Composant pour afficher un contrôle enfant
function ChildControl({ control, level = 2 }) {
  const [open, setOpen] = useState(false);
  const hasDesc = control.description?.length > 0;
  const indent = level * 20;

  const displayId = (() => {
    if (control.ref_id) return control.ref_id;

    if (control.id?.includes("__")) {
      const ref = control.id.split("__").pop();
      if (/^[A-Z]\.[0-9]+/.test(ref)) return ref;
    }

    return null;
  })();
  return (
    <div style={{ marginLeft: indent, marginBottom: 8 }}>
      <div
        style={{
          padding: "8px 12px",
          background: "#FEF2F2",
          borderRadius: 8,
          borderLeft: `3px solid ${C.warning}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div 
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: hasDesc ? "pointer" : "default" }}
          onClick={() => hasDesc && setOpen(!open)}
        >
          {hasDesc && (
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "0.2s" }}>
              <path d="M4 2L8 6L4 10" stroke={C.textMid} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
            {displayId || "—"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{control.name}</span>
          <span style={{ fontSize: 9, background: C.warning, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>
            Exception
          </span>
        </div>
      </div>
      {open && hasDesc && (
        <p style={{ marginTop: 6, fontSize: 11, color: C.textMid, lineHeight: 1.4, paddingLeft: 24 }}>
          {control.description}
        </p>
      )}
    </div>
  );
}

// ExceptionCard pour les chapitres
function ChapterExceptionCard({ exception, onRemove, childControls = [] }) {
  const [hov, setHov] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  
  const getDisplayTitle = () => {
    // 1. priorité au ref_id propre
    if (exception.ref_id && exception.ref_id !== exception.title) {
      return `${exception.ref_id} ${exception.title}`;
    }

    // 2. essayer d'extraire depuis id (ex: "chapter__A.5")
    if (exception.id && exception.id.includes("__")) {
      const ref = exception.id.split("__").pop();
      if (/^[A-Z]\.[0-9]+/.test(ref)) {
        return `${ref} ${exception.title}`;
      }
    }

    // 3. si le titre contient déjà A.5
    if (/^[A-Z]\.[0-9]+/.test(exception.title)) {
      return exception.title;
    }

    // 4. fallback → éviter duplication
    return exception.title;
  };

  return (
    <div style={{
      borderRadius:12,
      border:`1px solid ${hov ? C.warning : C.border}`,
      background:C.surface,
      overflow: "hidden",
      transition:"all .2s",
      boxShadow: hov ? C.shadowMd : C.shadow,
    }}
    onMouseEnter={()=>setHov(true)}
    onMouseLeave={()=>setHov(false)}>
      
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 10,
          background: "#0891B215",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18
        }}>
          📄
        </div>
        
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ fontFamily:F.display, fontSize:16, fontWeight:800, color:C.text }}>
              {getDisplayTitle()}
            </span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:700, 
              background: "#0891B215", 
              color: "#0891B2", 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid #0891B240`
            }}>
              chapter
            </span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:600, 
              background: C.warningLight, color:C.warning, 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid ${C.warning}40`
            }}>
              Excluded
            </span>
            {childControls.length > 0 && (
              <button
                onClick={() => setShowChildren(!showChildren)}
                style={{
                  fontSize:10,
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "2px 10px",
                  cursor: "pointer",
                  color: C.accent
                }}
              >
                {showChildren ? "Hide" : "Show"} ({childControls.length}) controls
              </button>
            )}
          </div>
          
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textMid, marginBottom:8 }}>
            <strong>Reason:</strong> {exception.reason}
          </div>
          
          <div style={{ display:"flex", gap:16, fontFamily:F.body, fontSize:11, color:C.textMuted, flexWrap:"wrap" }}>
            <span>📅 Excluded on: {exception.excludedAt ? new Date(exception.excludedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            <span>👤 By: {exception.excludedBy || "CISO"}</span>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(exception)}
          style={{
            flexShrink:0,
            padding:"6px 12px",
            borderRadius:8,
            border:`1px solid ${C.danger}40`,
            background: C.dangerLight,
            color: C.danger,
            cursor:"pointer",
            fontFamily:F.body,
            fontSize:11,
            fontWeight:600,
            display:"flex",
            alignItems:"center",
            gap:5,
            transition:"all .15s"
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Remove exception
        </button>
      </div>
      
      {showChildren && childControls.length > 0 && (
        <div style={{ padding: "12px 20px 20px 20px", background: "#FEF8F0", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 12, paddingLeft: 40 }}>
            Controls in this chapter:
          </div>
          {childControls.map(control => (
            <ChildControl key={control.id} control={control} level={1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ExceptionCard pour les items (contrôles)
function ItemExceptionCard({ exception, onRemove }) {
  const [hov, setHov] = useState(false);
  const [open, setOpen] = useState(false);
  const hasDesc = exception.description?.length > 0;

  const getDisplayTitle = () => {
    // Si on a un ref_id du contrôle
    if (exception.ref_id) {
      return `${exception.ref_id} - ${exception.title}`;
    }
    return exception.title;
  };

  return (
    <div style={{
      borderRadius:12,
      border:`1px solid ${hov ? C.accent : C.border}`,
      background:C.surface,
      overflow: "hidden",
      transition:"all .2s",
      boxShadow: hov ? C.shadowMd : C.shadow,
    }}
    onMouseEnter={()=>setHov(true)}
    onMouseLeave={()=>setHov(false)}>
      
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 10,
          background: `${C.accent}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18
        }}>
          📌
        </div>
        
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
            <div 
              style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: hasDesc ? "pointer" : "default" }}
              onClick={() => hasDesc && setOpen(!open)}
            >
              {hasDesc && (
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "0.2s" }}>
                  <path d="M4 2L8 6L4 10" stroke={C.textMid} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              )}
              <span style={{ fontFamily:F.display, fontSize:16, fontWeight:800, color:C.text }}>
                {getDisplayTitle()}
              </span>
            </div>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:700, 
              background: `${C.accent}15`, 
              color: C.accent, 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid ${C.accent}40`
            }}>
              control
            </span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:600, 
              background: C.warningLight, color:C.warning, 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid ${C.warning}40`
            }}>
              Excluded
            </span>
          </div>
          
          {open && hasDesc && (
            <p style={{ marginTop: 6, marginBottom: 8, fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
              {exception.description}
            </p>
          )}
          
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textMid, marginBottom:8 }}>
            <strong>Reason:</strong> {exception.reason}
          </div>
          
          <div style={{ display:"flex", gap:16, fontFamily:F.body, fontSize:11, color:C.textMuted, flexWrap:"wrap" }}>
            <span>📅 Excluded on: {exception.excludedAt ? new Date(exception.excludedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            <span>👤 By: {exception.excludedBy || "CISO"}</span>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(exception)}
          style={{
            flexShrink:0,
            padding:"6px 12px",
            borderRadius:8,
            border:`1px solid ${C.danger}40`,
            background: C.dangerLight,
            color: C.danger,
            cursor:"pointer",
            fontFamily:F.body,
            fontSize:11,
            fontWeight:600,
            display:"flex",
            alignItems:"center",
            gap:5,
            transition:"all .15s"
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Remove exception
        </button>
      </div>
    </div>
  );
}

// ExceptionCard pour les packages (frameworks)
function PackageExceptionCard({ exception, onRemove }) {
  const [hov, setHov] = useState(false);

  return (
    <div style={{
      borderRadius:12,
      border:`1px solid ${hov ? "#EA580C" : C.border}`,
      background:C.surface,
      overflow: "hidden",
      transition:"all .2s",
      boxShadow: hov ? C.shadowMd : C.shadow,
    }}
    onMouseEnter={()=>setHov(true)}
    onMouseLeave={()=>setHov(false)}>
      
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 10,
          background: "#EA580C15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18
        }}>
          📦
        </div>
        
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ fontFamily:F.display, fontSize:16, fontWeight:800, color:C.text }}>
              {exception.title}
            </span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:700, 
              background: "#EA580C15", 
              color: "#EA580C", 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid #EA580C40`
            }}>
              framework
            </span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:600, 
              background: C.warningLight, color:C.warning, 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid ${C.warning}40`
            }}>
              Excluded
            </span>
          </div>
          
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textMid, marginBottom:8 }}>
            <strong>Reason:</strong> {exception.reason}
          </div>
          
          <div style={{ display:"flex", gap:16, fontFamily:F.body, fontSize:11, color:C.textMuted, flexWrap:"wrap" }}>
            <span>📅 Excluded on: {exception.excludedAt ? new Date(exception.excludedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            <span>👤 By: {exception.excludedBy || "CISO"}</span>
          </div>
        </div>
        
        <button
          onClick={() => onRemove(exception)}
          style={{
            flexShrink:0,
            padding:"6px 12px",
            borderRadius:8,
            border:`1px solid ${C.danger}40`,
            background: C.dangerLight,
            color: C.danger,
            cursor:"pointer",
            fontFamily:F.body,
            fontSize:11,
            fontWeight:600,
            display:"flex",
            alignItems:"center",
            gap:5,
            transition:"all .15s"
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Remove exception
        </button>
      </div>
    </div>
  );
}

export default function Exceptions() {
  const navigate = useNavigate();
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  useEffect(() => {
    const fetchExceptions = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/framauditor/all-exceptions", {
          credentials: "include"
        });
        
        if (res.ok) {
          const data = await res.json();
          setExceptions(data);
        } else {
          console.error("Failed to fetch exceptions:", res.status);
          setExceptions([]);
        }
      } catch (err) {
        console.error("Error fetching exceptions:", err);
        setExceptions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExceptions();
  }, []);

  const handleRemoveException = async (exception) => {
    try {
      const response = await fetch("http://localhost:3000/api/framauditor/remove-exception", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: exception.id,
          standardId: exception.standardId,
          entity_type: exception.level,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove exception");
      }

      // Mettre à jour l'état local
      if (exception.level === "chapter" && exception.childIds) {
        const allIdsToRemove = new Set([exception.id, ...exception.childIds]);
        const newExceptions = exceptions.filter(e => !allIdsToRemove.has(String(e.id)));
        setExceptions(newExceptions);
      } else {
        const newExceptions = exceptions.filter(e => !(String(e.id) === String(exception.id) && e.level === exception.level));
        setExceptions(newExceptions);
      }
      
    } catch (err) {
      console.error("Error removing exception:", err);
      alert("Error removing exception: " + err.message);
    }
  };

  // Organiser les exceptions
  const getOrganizedExceptions = () => {
  const chapterExceptions = exceptions.filter(e => e.level === "chapter" || e.level === "family");    const itemExceptions = exceptions.filter(e => e.level === "control" || e.level === "item");
  const packageExceptions = exceptions.filter(e => e.level === "package");
    
    const result = [];
    
    // Pour chaque chapitre, trouver ses contrôles enfants
    for (const chapter of chapterExceptions) {
      const childControls = itemExceptions
        .filter(item => chapter.childIds && chapter.childIds.includes(String(item.id)))
        .map(item => ({
          id: item.id,
          ref_id: item.ref_id,
          name: item.title,
          description: item.description || ""
        }));
      
      result.push({
        type: "chapter",
        data: chapter,
        childControls
      });
    }
    
    // Trouver les IDs des contrôles déjà liés à un chapitre
    const allChildIds = new Set();
    for (const chapter of chapterExceptions) {
      if (chapter.childIds) {
        chapter.childIds.forEach(id => allChildIds.add(String(id)));
      }
    }
    
    // Items sans chapitre parent
    const standaloneItems = itemExceptions.filter(item => !allChildIds.has(String(item.id)));
    for (const item of standaloneItems) {
      result.push({
        type: "item",
        data: item,
        childControls: []
      });
    }
    
    // Packages
    for (const pkg of packageExceptions) {
      result.push({
        type: "package",
        data: pkg,
        childControls: []
      });
    }
    
    return result;
  };

  const organizedExceptions = getOrganizedExceptions();

  const filteredExceptions = organizedExceptions
    .filter(item => {
      if (filterLevel === "all") return true;
      if (filterLevel === "package") return item.type === "package";
      if (filterLevel === "chapter") return item.type === "chapter";
      if (filterLevel === "item") return item.type === "item";
      return true;
    })
    .filter(item => item.data.title?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: exceptions.length,
    packages: exceptions.filter(e => e.level === "package").length,
    chapters: exceptions.filter(e => e.level === "chapter").length,
    items: exceptions.filter(e => e.level === "control" || e.level === "item").length,
  };

  if (loading) {
    return (
      <div style={{ fontFamily:F.body, background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:16 }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:C.textMid }}>Loading exceptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:F.body, background:C.bg, minHeight:"100vh", padding:"26px 30px" }}>
      
      <div style={{ marginBottom:24 }}>
        <button 
          onClick={() => navigate("/layout/conformite/Politiques")}
          style={{
            display:"flex",
            alignItems:"center",
            gap:6,
            background:"none",
            border:"none",
            cursor:"pointer",
            color:C.textMid,
            fontFamily:F.body,
            fontSize:13,
            marginBottom:16,
            padding:"4px 0"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Policy Library
        </button>
        
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <h1 style={{ fontFamily:F.display, fontSize:28, fontWeight:900, color:C.text, margin:0 }}>Policy Exceptions</h1>
            </div>
            <p style={{ fontFamily:F.body, fontSize:13, color:C.textMid, margin:0 }}>
              Policies that have been excluded from compliance scope. These will not be considered in compliance checks.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <div style={{ background:C.surface, borderRadius:12, padding:"12px 20px", border:`1px solid ${C.border}`, flex:1, minWidth:100 }}>
          <div style={{ fontSize:24, fontWeight:800, color:C.text }}>{stats.total}</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Total exceptions</div>
        </div>
        <div style={{ background:C.surface, borderRadius:12, padding:"12px 20px", border:`1px solid ${C.border}`, flex:1, minWidth:100 }}>
          <div style={{ fontSize:24, fontWeight:800, color:"#EA580C" }}>{stats.packages}</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Frameworks</div>
        </div>
        <div style={{ background:C.surface, borderRadius:12, padding:"12px 20px", border:`1px solid ${C.border}`, flex:1, minWidth:100 }}>
          <div style={{ fontSize:24, fontWeight:800, color:"#0891B2" }}>{stats.chapters}</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Chapters</div>
        </div>
        <div style={{ background:C.surface, borderRadius:12, padding:"12px 20px", border:`1px solid ${C.border}`, flex:1, minWidth:100 }}>
          <div style={{ fontSize:24, fontWeight:800, color:C.accent }}>{stats.items}</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Controls</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {["all", "package", "chapter", "item"].map(level => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              style={{
                padding:"5px 14px",
                borderRadius:20,
                border:"none",
                cursor:"pointer",
                background: filterLevel === level ? `linear-gradient(135deg,${C.accent},${C.accentHover})` : C.surfaceAlt,
                color: filterLevel === level ? "#fff" : C.textMid,
                fontFamily:F.body,
                fontSize:12,
                fontWeight:600,
                transition:"all .15s"
              }}
            >
              {level === "all" ? "All" : level === "item" ? "Controls" : level.charAt(0).toUpperCase() + level.slice(1) + "s"}
            </button>
          ))}
        </div>
        
        <div style={{ marginLeft:"auto", position:"relative" }}>
          <input
            placeholder="Search exceptions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width:220,
              padding:"7px 12px 7px 30px",
              border:`1px solid ${C.border}`,
              borderRadius:9,
              fontFamily:F.body,
              fontSize:13,
              color:C.text,
              background:C.surface,
              outline:"none"
            }}
          />
          <svg style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)" }} width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke={C.textMuted} strokeWidth="1.4"/>
            <path d="M9 9L12 12" stroke={C.textMuted} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {filteredExceptions.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:C.surface, borderRadius:16, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
          <div style={{ fontFamily:F.display, fontSize:18, fontWeight:700, color:C.text, marginBottom:8 }}>No exceptions found</div>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textMuted }}>
            {search ? "No exceptions match your search criteria." : "No policies have been excluded from compliance scope yet."}
          </div>
          {!search && (
            <button
              onClick={() => navigate("/layout/conformite/Politiques")}
              style={{
                marginTop:20,
                padding:"8px 20px",
                borderRadius:9,
                border:`1px solid ${C.accent}`,
                background:C.accentLight,
                color:C.accent,
                cursor:"pointer",
                fontFamily:F.body,
                fontSize:13,
                fontWeight:600
              }}
            >
              Go to Policy Library
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filteredExceptions.map((item, idx) => {
            if (item.type === "chapter") {
              return (
                <ChapterExceptionCard
                  key={`${item.data.id}-${idx}`}
                  exception={item.data}
                  onRemove={handleRemoveException}
                  childControls={item.childControls}
                />
              );
            } else if (item.type === "item") {
              return (
                <ItemExceptionCard
                  key={`${item.data.id}-${idx}`}
                  exception={item.data}
                  onRemove={handleRemoveException}
                />
              );
            } else {
              return (
                <PackageExceptionCard
                  key={`${item.data.id}-${idx}`}
                  exception={item.data}
                  onRemove={handleRemoveException}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}