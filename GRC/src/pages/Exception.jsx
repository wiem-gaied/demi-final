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

function ExceptionCard({ exception, onRemove }) {
  const [hov, setHov] = useState(false);
  
  const getLevelIcon = (level) => {
    switch(level) {
      case "package": return "📦";
      case "chapter": return "📄";
      case "item": return "📌";
      default: return "📋";
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case "package": return "#EA580C";
      case "chapter": return "#0891B2";
      case "item": return "#3B6FFF";
      default: return C.textMuted;
    }
  };

  return (
    <div style={{
      borderRadius:12,
      border:`1px solid ${hov ? C.warning : C.border}`,
      background:C.surface,
      padding:"16px 20px",
      transition:"all .2s",
      boxShadow: hov ? C.shadowMd : C.shadow,
    }}
    onMouseEnter={()=>setHov(true)}
    onMouseLeave={()=>setHov(false)}>
      
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        
        
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ fontFamily:F.display, fontSize:16, fontWeight:800, color:C.text }}>{exception.title}</span>
            <span style={{ 
              fontFamily:F.body, fontSize:10, fontWeight:700, 
              background: `${getLevelColor(exception.level)}15`, 
              color: getLevelColor(exception.level), 
              padding:"2px 8px", borderRadius:12,
              border:`1px solid ${getLevelColor(exception.level)}40`
            }}>
              {exception.level}
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
            <span>📅 Excluded on: {new Date(exception.excludedAt).toLocaleDateString()}</span>
            <span>👤 By: {exception.excludedBy || "CISO"}</span>
            {exception.version && <span>📌 Version: v{exception.version}</span>}
          </div>
        </div>
        
        <button
          onClick={() => onRemove(exception)}
          onMouseEnter={()=>setHov(true)}
          onMouseLeave={()=>setHov(false)}
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
      const res = await fetch("http://localhost:3000/api/framauditor/exceptions", {
        credentials: "include"
      });

      const data = await res.json();

      setExceptions(data); // ✅ FIX ICI

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // ✅ important aussi
    }
  };
  

  fetchExceptions();
}, []);

  const saveExceptions = (items) => {
    setExceptions(items);
    localStorage.setItem("auditor_excluded_policies", JSON.stringify(items));
  };

  const handleRemoveException = async (exception) => {
    
  try {
    
    const res = await fetch("http://localhost:3000/api/framauditor/remove-exception", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        policyId: exception.id,
        level: exception.level,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete");
    }

    // ✅ mise à jour UI après succès backend
    const newExceptions = exceptions.filter(
      e => !(e.id === exception.id && e.level === exception.level)
    );

    setExceptions(newExceptions);

  } catch (err) {
    console.error(err);
    alert("Error removing exception");
  }
};

  const filteredExceptions = exceptions
    .filter(e => filterLevel === "all" || e.level === filterLevel)
    .filter(e => e.title?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: exceptions.length,
    packages: exceptions.filter(e => e.level === "package").length,
    chapters: exceptions.filter(e => e.level === "chapter").length,
    items: exceptions.filter(e => e.level === "item").length,
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
      
      {/* Header with back button */}
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

      

      {/* Filters */}
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
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1) + "s"}
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

      {/* Exceptions list */}
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
          {filteredExceptions.map(exception => (
            <ExceptionCard
              key={`${exception.id}-${exception.level}`}
              exception={exception}
              onRemove={handleRemoveException}
            />
          ))}
        </div>
      )}
    </div>
  );
}