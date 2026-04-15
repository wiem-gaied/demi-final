import React, { useState, useEffect, useMemo, useCallback } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#F0F4FF",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F5F8FF",
  surfaceGlass:"rgba(255,255,255,0.85)",
  border:      "#E2E8F8",
  borderStrong:"#C7D3F0",
  text:        "#0F1C3F",
  textSub:     "#7B8DB0",
  accent:      "#3B6FFF",
  accentLight: "#EEF3FF",
  accentGlow:  "rgba(59,111,255,0.15)",
  purple:      "#6D28D9",
  purpleLight: "#F3F0FF",
  green:       "#059669",
  greenLight:  "#ECFDF5",
  red:         "#DC2626",
  redLight:    "#FEF2F2",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
};

const LEVEL_META = {
  ERROR:   { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✕", label: "Error" },
  WARNING: { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: "⚠", label: "Warning" },
  INFO:    { color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", icon: "ℹ", label: "Info" },
};

function getLevelFromAction(action) {
  const normalized = action.toUpperCase();
  const baseAction = normalized.split("_")[0];
  const levels = {
    "DELETE": "ERROR",
    "LOGIN_FAILED": "ERROR",
    "ACCESS_DENIED": "ERROR",
    "UPDATE": "WARNING",
    "CREATE": "INFO",
    "LOGIN": "INFO",
    "LOGOUT": "INFO",
    "VIEW": "INFO",
    "EXPORT": "INFO"
  };
  return levels[baseAction] || "INFO";
}

function getSourceFromAction(action) {
  if (action === "LOGIN" || action === "LOGOUT") return "auth";
  if (action === "EXPORT") return "api";
  if (action === "CREATE" || action === "UPDATE" || action === "DELETE") return "system";
  return "system";
}

function formatDate(d) {
  if (!d) return "N/A";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return "Invalid date";
  }
}

function formatRelative(d) {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "min";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  } catch {
    return "";
  }
}


const PER_PAGE = 10;
function formatExtraInfo(extra_info) {
  try {
    const obj = typeof extra_info === "string"
      ? JSON.parse(extra_info)
      : extra_info;

    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" • "); // ou " | "
  } catch {
    return extra_info;
  }
}


// ── Components ─────────────────────────────────────────────────────────────


function LevelBadge({ level }) {
  const m = LEVEL_META[level] || LEVEL_META.INFO;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 9px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: m.bg,
      color: m.color,
      border: `1px solid ${m.border}`,
      letterSpacing: "0.3px",
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 8 }}>{m.icon}</span> {level}
    </span>
  );
}

function SrcTag({ source }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 600,
      background: C.surfaceAlt,
      color: C.textSub,
      border: `1px solid ${C.border}`,
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      letterSpacing: "0.2px",
    }}>
      {source || "system"}
    </span>
  );
}

function ActionTag({ action }) {
  const colors = {
    'CREATE': { bg: C.greenLight, color: C.green, dot: C.green },
    'UPDATE': { bg: C.amberLight, color: C.amber, dot: C.amber },
    'DELETE': { bg: C.redLight, color: C.red, dot: C.red },
    'LOGIN': { bg: C.accentLight, color: C.accent, dot: C.accent },
    'LOGOUT': { bg: C.surfaceAlt, color: C.textSub, dot: C.textSub },
    'VIEW': { bg: C.surfaceAlt, color: C.textSub, dot: C.textSub },
    'EXPORT': { bg: C.purpleLight, color: C.purple, dot: C.purple }
  };
  const style = colors[action] || { bg: C.surfaceAlt, color: C.textSub, dot: C.textSub };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: style.bg,
      color: style.color,
      letterSpacing: "0.4px",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, display: "inline-block", flexShrink: 0 }} />
      {action || "UNKNOWN"}
    </span>
  );
}

function DetailPanel({ log }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #F5F8FF 0%, #EEF3FF 100%)",
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[
          ["ID", `#${log.id || "N/A"}`],
          ["Date", formatDate(log.created_at)],
          ["IP Address", log.ip_address || "N/A"],
          ["User", log.user_email || "N/A"],
          ["Name", log.name || "N/A"],
          ["Role", log.role || "N/A"],
          ["Action", log.action || "N/A"],
          ["Source", log.source || "N/A"],
          ["Level", log.level || "N/A"],
          ["Target", log.target || "N/A"]
        ].map(([k, v]) => (
          <div key={k} style={{
            background: "rgba(255,255,255,0.7)",
            borderRadius: 10,
            padding: "10px 12px",
            border: `1px solid ${C.border}`,
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px" }}>{k}</div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: "'DM Mono', 'Fira Code', monospace", wordBreak: "break-all", fontWeight: 500 }}>{v}</div>
          </div>
        ))}
        {log.extra_info && (
          <div style={{
            gridColumn: "1/-1",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.8)",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>Additional Data</div>
            <div style={{ fontSize: 11, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'DM Mono', 'Fira Code', monospace" }}>
              {formatExtraInfo(log.extra_info)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log, expanded, onToggle }) {
  const isExpanded = expanded === log.id;
  const level = log.level || getLevelFromAction(log.action);
  const levelColor = LEVEL_META[level]?.color || C.accent;

  return (
    <React.Fragment>
      <tr
        onClick={() => onToggle(log.id)}
        style={{
          borderBottom: `1px solid ${C.border}`,
          cursor: "pointer",
          background: isExpanded ? C.accentLight : C.surface,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "#F5F8FF";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = C.surface;
        }}
      >
        {/* Left accent strip */}
        <td style={{ padding: 0, width: 3 }}>
          {isExpanded && (
            <div style={{ width: 3, height: "100%", background: C.accent, borderRadius: "2px 0 0 2px" }} />
          )}
        </td>
        <td style={{ padding: "11px 12px", fontSize: 11, color: C.textSub, whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 500, color: C.text, fontSize: 12 }}>{formatDate(log.created_at)}</div>
          <div style={{ fontSize: 10, color: C.textSub, marginTop: 2, opacity: 0.7 }}>{formatRelative(log.created_at)} ago</div>
        </td>
        <td style={{ padding: "11px 12px" }}><LevelBadge level={level} /></td>
        <td style={{ padding: "11px 12px" }}><SrcTag source={log.source || getSourceFromAction(log.action)} /></td>
        <td style={{ padding: "11px 12px" }}><ActionTag action={log.action} /></td>
        <td style={{ padding: "11px 12px", fontSize: 12, color: C.text, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
          {log.target || <span style={{ color: C.textSub, fontStyle: "italic" }}>—</span>}
        </td>
        <td style={{ padding: "11px 12px" }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{log.user_email}</div>
        </td>
        <td style={{ padding: "11px 12px" }}>
          <span style={{ fontSize: 10, color: C.purple, fontWeight: 600, background: C.purpleLight, padding: "2px 8px", borderRadius: 20 }}>
            {log.role}
          </span>
        </td>
        <td style={{ padding: "11px 16px", textAlign: "center" }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: isExpanded ? C.accent : C.surfaceAlt,
            color: isExpanded ? "#fff" : C.textSub,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
            transition: "all 0.15s",
          }}>
            {isExpanded ? "▲" : "▼"}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0 }}>
            <DetailPanel log={{ ...log, level }} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function Pagination({ current, total, onPage }) {
  const pages = Math.ceil(total / PER_PAGE) || 1;
  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - current) <= 1) range.push(i);
    else if (range[range.length - 1] !== "…") range.push("…");
  }

  const btnStyle = (active, disabled = false) => ({
    width: 34,
    height: 34,
    borderRadius: 9,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accent : C.surface,
    color: active ? "#fff" : C.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: active ? `0 3px 12px ${C.accentGlow}` : "none",
    transition: "all 0.15s",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 28px",
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      borderRadius: "0 0 16px 16px",
    }}>
      <span style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>
        Showing <strong style={{ color: C.text }}>{total > 0 ? `${Math.min((current - 1) * PER_PAGE + 1, total)}–${Math.min(current * PER_PAGE, total)}` : 0}</strong> of <strong style={{ color: C.text }}>{total}</strong> logs
      </span>
      <div style={{ display: "flex", gap: 5 }}>
        <button
          style={btnStyle(false, current === 1)}
          disabled={current === 1}
          onClick={() => onPage(current - 1)}
        >‹</button>
        {range.map((p, i) =>
          p === "…" ? (
            <span key={i} style={{ padding: "0 4px", fontSize: 13, color: C.textSub, display: "flex", alignItems: "center" }}>…</span>
          ) : (
            <button key={p} style={btnStyle(p === current)} onClick={() => onPage(p)}>{p}</button>
          )
        )}
        <button
          style={btnStyle(false, current === pages)}
          disabled={current === pages}
          onClick={() => onPage(current + 1)}
        >›</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function LogsAuditor() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch logs - Enhanced version with error handling
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching logs from /api/logs...");

      const response = await fetch("http://localhost:3000/api/logs", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers.get("content-type"));

      if (!response.ok) {
        if (response.status === 401) throw new Error("Not authenticated. Please log in.");
        if (response.status === 403) throw new Error("Access denied. You don't have the necessary permissions.");
        if (response.status === 404) throw new Error("Route /api/logs not found. Check that the backend server is running.");
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 500));
        throw new Error("The server returned a non-JSON response. Verify that the API is correctly configured.");
      }

      const data = await response.json();
      console.log("Data received:", data);

      let logsData = [];
      if (Array.isArray(data)) {
        logsData = data;
      } else if (data?.data && Array.isArray(data.data)) {
        logsData = data.data;
      } else if (data?.logs && Array.isArray(data.logs)) {
        logsData = data.logs;
      } else {
        console.warn("Unexpected data format:", data);
        logsData = [];
      }

      const enrichedLogs = logsData.map(log => ({
        ...log,
        created_at: log.created_at ? new Date(log.created_at) : new Date(),
        level: log.level || getLevelFromAction(log.action),
        source: log.source || getSourceFromAction(log.action),
        ip_address: log.ip_address || "N/A"
      }));

      setLogs(enrichedLogs);

    } catch (err) {
      console.error("Error loading logs:", err);
      setError(err.message || "Error loading logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action).filter(a => a));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(logs.map(l => l.role).filter(r => r));
    return Array.from(roles).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs = {
      "1h": now - 3600000,
      "6h": now - 21600000,
      "24h": now - 86400000,
      "today": new Date().setHours(0, 0, 0, 0)
    };

    let list = logs.filter(log => {
      const logTime = log.created_at instanceof Date ? log.created_at.getTime() : 0;
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (roleFilter !== "all" && log.role !== roleFilter) return false;
      if (dateFilter !== "all" && logTime < cutoffs[dateFilter]) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          (log.user_email || "").toLowerCase().includes(searchLower) ||
          (log.action || "").toLowerCase().includes(searchLower) ||
          (log.target || "").toLowerCase().includes(searchLower) ||
          (log.role || "").toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === "created_at") {
        va = va instanceof Date ? va.getTime() : 0;
        vb = vb instanceof Date ? vb.getTime() : 0;
      } else {
        va = String(va || "");
        vb = String(vb || "");
      }
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return list;
  }, [logs, levelFilter, actionFilter, roleFilter, dateFilter, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const page = Math.min(currentPage, totalPages);
  const pageSlice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const selectStyle = {
    padding: "8px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 12,
    background: C.surface,
    color: C.text,
    fontWeight: 500,
    outline: "none",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  };

  const thStyle = (field) => ({
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: sortField === field ? C.accent : C.textSub,
    background: "linear-gradient(to bottom, #F8FBFF, #F1F5FF)",
    borderBottom: `1px solid ${C.border}`,
    cursor: field ? "pointer" : "default",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    userSelect: "none",
  });

  if (loading && logs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 26,
            boxShadow: `0 4px 20px ${C.accentGlow}`,
          }}>📋</div>
          <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>Loading logs...</div>
          <div style={{ color: C.textSub, fontSize: 12, marginTop: 6 }}>Fetching activity data</div>
        </div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          textAlign: "center", maxWidth: 500,
          padding: 32, background: C.surface, borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: C.red, marginBottom: 12, fontWeight: 600, fontSize: 15 }}>{error}</div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 24 }}>
            Check that:
            <ul style={{ textAlign: "left", marginTop: 10, lineHeight: 2 }}>
              <li>The backend server is running (npm run dev:backend)</li>
              <li>The /api/logs route exists</li>
              <li>You are logged in</li>
              <li>The API proxy is correctly configured in vite.config.js</li>
            </ul>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div style={{
  
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
}}>
      

      {/* Header */}
      <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 4,
  }}
>
  {/* Left side */}
  <div>
    <h1
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#0f1e3d",
        margin: 0,
      }}
    >
      Activity Log
    </h1>
    <p style={{ color: "#7a96c0", margin: "4px 0 0", fontSize: 13 }}>
      Monitor system activities, user actions and security events
    </p>
  </div>

            
          </div>
          
        

        {/* Stats */}
        
      

      {/* Filters */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        boxShadow: "0 1px 8px rgba(0,0,0,0.03)",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.textSub }}>🔍</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by user, action, target or role..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              fontSize: 13,
              background: C.surfaceAlt,
              outline: "none",
              color: C.text,
              fontWeight: 400,
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Level pills */}
        <div style={{
          display: "flex", gap: 3,
          background: C.surfaceAlt,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: "3px 4px",
        }}>
          {["all", "INFO", "WARNING", "ERROR"].map(l => {
            const meta = LEVEL_META[l];
            const isActive = levelFilter === l;
            return (
              <button
                key={l}
                onClick={() => { setLevelFilter(l); setCurrentPage(1); }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 18,
                  border: "none",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  background: isActive ? (meta?.bg || C.accentLight) : "transparent",
                  color: isActive ? (meta?.color || C.accent) : C.textSub,
                  transition: "all 0.15s",
                  letterSpacing: "0.2px",
                }}
              >
                {l === "all" ? "All" : l}
              </button>
            );
          })}
        </div>

        {uniqueActions.length > 0 && (
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }} style={selectStyle}>
            <option value="all">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {uniqueRoles.length > 0 && (
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} style={selectStyle}>
            <option value="all">All roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }} style={selectStyle}>
          <option value="all">All time</option>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="today">Today</option>
        </select>

        <span style={{
          fontSize: 12, color: C.accent, marginLeft: "auto",
          background: C.accentLight,
          padding: "5px 12px", borderRadius: 20, fontWeight: 600,
        }}>
          {filtered.length} log{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{
  flex: 1,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(59,111,255,0.07)",
          display: "flex",
          flexDirection: "column",
}}>
 <div style={{
    flex: 1,
    overflow: "auto"
  }}>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <colgroup>
            <col style={{ width: 3 }} />
            <col style={{ width: 175 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 165 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...thStyle(null), padding: 0, width: 3 }} />
              {[
                ["created_at", "Date / Time"],
                ["level", "Level"],
                ["source", "Source"],
                ["action", "Action"],
                ["target", "Target"],
                ["user_email", "User"],
                ["role", "Role"],
                [null, ""]
              ].map(([field, label]) => (
                <th key={label} style={thStyle(field)} onClick={() => field && handleSort(field)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {label}
                    {field && sortField === field && (
                      <span style={{ color: C.accent, fontSize: 10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 56, textAlign: "center", color: C.textSub }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 6 }}>No logs found</div>
                  <div style={{ fontSize: 12 }}>No logs match your current filters.</div>
                </td>
              </tr>
            ) : (
              pageSlice.map(log => (
                <LogRow
                  key={log.id}
                  log={log}
                  expanded={expanded}
                  onToggle={(id) => setExpanded(expanded === id ? null : id)}
                />
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination inside card */}
        <Pagination
          current={page}
          total={filtered.length}
          onPage={(p) => { setCurrentPage(p); setExpanded(null); }}
        />
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}