import React, { useState, useEffect, useMemo, useCallback } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#F8FAFF",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F1F5FF",
  border:      "#DDE3F5",
  text:        "#0F1C3F",
  textSub:     "#6B7A99",
  accent:      "#3B6FFF",
  accentLight: "#EEF3FF",
  purple:      "#6D28D9",
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

function exportCSV(logs) {
  if (!logs || logs.length === 0) {
    alert("No logs to export");
    return;
  }
  
  const header = "ID,Date,Level,Source,Action,Message/Target,User,Role,IP,Extra Info";
  const rows = logs.map(l => {
    return `"${l.id || ""}","${formatDate(l.created_at)}","${l.level || ""}","${l.source || ""}","${l.action || ""}","${(l.target || "").replace(/"/g, '""')}","${l.user_email || ""}","${l.role || ""}","${l.ip_address || ""}","${typeof l.extra_info === 'string' ? l.extra_info.replace(/"/g, '""') : JSON.stringify(l.extra_info || {}).replace(/"/g, '""')}"`;
  });
  const csv = [header, ...rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + csv);
  a.download = `logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  a.click();
}

const PER_PAGE = 10;

// ── Components ─────────────────────────────────────────────────────────────
function StatChip({ icon, label, count, color, bg }) {
  return (
    <div style={{
      flex: 1,
      borderRadius: 8,
      padding: "9px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: bg,
      border: `0.5px solid ${color}22`
    }}>
      <div style={{ fontSize: 16, color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 500, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 10, fontWeight: 500, color, opacity: 0.75, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function LevelBadge({ level }) {
  const m = LEVEL_META[level] || LEVEL_META.INFO;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: "2px 7px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: m.bg,
      color: m.color,
      border: `0.5px solid ${m.border}`
    }}>
      {m.icon} {level}
    </span>
  );
}

function SrcTag({ source }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 6px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      background: C.surfaceAlt,
      color: C.textSub,
      border: `0.5px solid ${C.border}`,
      fontFamily: "monospace"
    }}>
      {source || "system"}
    </span>
  );
}

function ActionTag({ action }) {
  const colors = {
    'CREATE': { bg: C.greenLight, color: C.green },
    'UPDATE': { bg: C.amberLight, color: C.amber },
    'DELETE': { bg: C.redLight, color: C.red },
    'LOGIN': { bg: C.accentLight, color: C.accent },
    'LOGOUT': { bg: C.surfaceAlt, color: C.textSub },
    'VIEW': { bg: C.surfaceAlt, color: C.textSub },
    'EXPORT': { bg: C.purple, color: "#fff" }
  };
  const style = colors[action] || { bg: C.surfaceAlt, color: C.textSub };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 9,
      fontWeight: 600,
      background: style.bg,
      color: style.color
    }}>
      {action || "UNKNOWN"}
    </span>
  );
}

function DetailPanel({ log }) {
  return (
    <div style={{
      background: C.surfaceAlt,
      borderTop: `0.5px solid ${C.border}`,
      borderBottom: `0.5px solid ${C.border}`
    }}>
      <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          ["ID", `#${log.id || "N/A"}`],
          ["Date", formatDate(log.created_at)],
          ["IP", log.ip_address || "N/A"],
          ["User", log.user_email || "N/A"],
          ["Name", log.name || "N/A"],
          ["Role", log.role || "N/A"],
          ["Action", log.action || "N/A"],
          ["Source", log.source || "N/A"],
          ["Level", log.level || "N/A"],
          ["Target", log.target || "N/A"]
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textSub, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace", wordBreak: "break-all" }}>{v}</div>
          </div>
        ))}
        {log.extra_info && (
          <div style={{ gridColumn: "1/-1", padding: "8px 12px", background: C.surface, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.textSub, marginBottom: 5 }}>ADDITIONAL DATA</div>
            <div style={{ fontSize: 11, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
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
  
  return (
    <React.Fragment>
      <tr
        onClick={() => onToggle(log.id)}
        style={{
          borderBottom: `0.5px solid ${C.border}`,
          cursor: "pointer",
          background: isExpanded ? C.accentLight : C.surface
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = C.surfaceAlt;
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = C.surface;
        }}
      >
        <td style={{ padding: "10px 12px", fontSize: 11, color: C.textSub, whiteSpace: "nowrap" }}>
          {formatDate(log.created_at)} <span style={{ opacity: 0.5, fontSize: 10 }}>({formatRelative(log.created_at)})</span>
        </td>
        <td style={{ padding: "10px 12px" }}><LevelBadge level={level} /></td>
        <td style={{ padding: "10px 12px" }}><SrcTag source={log.source || getSourceFromAction(log.action)} /></td>
        <td style={{ padding: "10px 12px" }}><ActionTag action={log.action} /></td>
        <td style={{ padding: "10px 12px", fontSize: 12, color: C.text, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {log.target || "-"}
        </td>
        <td style={{ padding: "10px 12px", fontSize: 11, color: C.textSub }}>{log.user_email}</td>
        <td style={{ padding: "10px 12px", fontSize: 10, color: C.textSub }}>{log.role}</td>
        <td style={{ padding: "10px 12px", textAlign: "center", color: C.textSub }}>{isExpanded ? "▲" : "▼"}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} style={{ padding: 0 }}>
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
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `0.5px solid ${active ? C.accent : C.border}`,
    background: active ? C.accent : C.surface,
    color: active ? "#fff" : C.text,
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
      <span style={{ fontSize: 12, color: C.textSub }}>
        {total > 0 ? `${Math.min((current - 1) * PER_PAGE + 1, total)}–${Math.min(current * PER_PAGE, total)}` : 0} of {total} logs
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button 
          style={btnStyle(false, current === 1)} 
          disabled={current === 1} 
          onClick={() => onPage(current - 1)}
        >‹</button>
        {range.map((p, i) =>
          p === "…" ? (
            <span key={i} style={{ padding: "0 4px", fontSize: 12, color: C.textSub }}>…</span>
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
export default function Logs() {
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
      
      // Check if response is OK
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Not authenticated. Please log in.");
        }
        if (response.status === 403) {
          throw new Error("Access denied. You don't have the necessary permissions.");
        }
        if (response.status === 404) {
          throw new Error("Route /api/logs not found. Check that the backend server is running.");
        }
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // If not JSON, read as text for debugging
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 500));
        throw new Error("The server returned a non-JSON response. Verify that the API is correctly configured.");
      }
      
      const data = await response.json();
      console.log("Data received:", data);
      
      // Verify that response is an array
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
      
      // Enrich logs with missing metadata
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

  // Unique filters
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action).filter(a => a));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(logs.map(l => l.role).filter(r => r));
    return Array.from(roles).sort();
  }, [logs]);

  // Filtering
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
    
    // Sorting
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

  // Statistics
  const stats = useMemo(() => ({
    total: logs.length,
    errors: logs.filter(l => l.level === "ERROR").length,
    warnings: logs.filter(l => l.level === "WARNING").length,
    infos: logs.filter(l => l.level === "INFO").length
  }), [logs]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const headerBtn = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: `0.5px solid ${active ? C.accent : C.border}`,
    background: active ? C.accent : C.surface,
    color: active ? "#fff" : C.text
  });

  const thStyle = (field) => ({
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: sortField === field ? C.accent : C.textSub,
    background: C.surfaceAlt,
    borderBottom: `0.5px solid ${C.border}`,
    cursor: field ? "pointer" : "default",
    whiteSpace: "nowrap"
  });

  if (loading && logs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>📋</div>
          <div style={{ color: C.text }}>Loading logs...</div>
        </div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 500, padding: 24, background: C.surface, borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: C.red, marginBottom: 16, fontWeight: 500 }}>{error}</div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 20 }}>
            Check that:
            <ul style={{ textAlign: "left", marginTop: 8 }}>
              <li>The backend server is running (npm run dev:backend)</li>
              <li>The /api/logs route exists</li>
              <li>You are logged in</li>
              <li>The API proxy is correctly configured in vite.config.js</li>
            </ul>
          </div>
          <button onClick={fetchLogs} style={headerBtn(true)}>🔄 Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `0.5px solid ${C.border}`, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: C.text }}>Activity Log</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSub }}>
              {logs.length} total logs
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            
            <button style={headerBtn(false)} onClick={() => exportCSV(filtered)}>🔄 Refresh</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatChip icon="📋" label="Total" count={stats.total} color={C.accent} bg={C.accentLight} />
          <StatChip icon="✕" label="Errors" count={stats.errors} color={LEVEL_META.ERROR.color} bg={LEVEL_META.ERROR.bg} />
          <StatChip icon="⚠" label="Warnings" count={stats.warnings} color={LEVEL_META.WARNING.color} bg={LEVEL_META.WARNING.bg} />
          <StatChip icon="ℹ" label="Information" count={stats.infos} color={LEVEL_META.INFO.color} bg={LEVEL_META.INFO.bg} />
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: C.surface,
        borderBottom: `0.5px solid ${C.border}`,
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap"
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textSub }}>🔍</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by user, action, target or role..."
            style={{
              width: "100%",
              padding: "8px 10px 8px 32px",
              border: `0.5px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 12,
              background: C.surfaceAlt,
              outline: "none"
            }}
          />
        </div>

        {/* Level filters */}
        <div style={{ display: "flex", gap: 4, background: C.surfaceAlt, border: `0.5px solid ${C.border}`, borderRadius: 20, padding: "2px 4px" }}>
          {["all", "INFO", "WARNING", "ERROR"].map(l => {
            const meta = LEVEL_META[l];
            return (
              <button
                key={l}
                onClick={() => { setLevelFilter(l); setCurrentPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  border: "none",
                  fontSize: 11,
                  fontWeight: levelFilter === l ? 600 : 500,
                  cursor: "pointer",
                  background: levelFilter === l ? (meta?.bg || C.accentLight) : "transparent",
                  color: levelFilter === l ? (meta?.color || C.accent) : C.textSub
                }}
              >
                {l === "all" ? "All" : l}
              </button>
            );
          })}
        </div>

        {/* Action filter */}
        {uniqueActions.length > 0 && (
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 11, background: C.surface }}
          >
            <option value="all">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* Role filter */}
        {uniqueRoles.length > 0 && (
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 11, background: C.surface }}
          >
            <option value="all">All roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}

        {/* Date filter */}
        <select
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 11, background: C.surface }}
        >
          <option value="all">All time</option>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="today">Today</option>
        </select>

        <span style={{ fontSize: 12, color: C.textSub, marginLeft: "auto" }}>
          {filtered.length} log{filtered.length > 1 ? "s" : ""} displayed
        </span>
      </div>

      {/* Table */}
      <div style={{ margin: "16px 24px", background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <colgroup>
            <col style={{ width: 170 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 85 }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 85 }} />
            <col style={{ width: 32 }} />
          </colgroup>
          <thead>
            <tr>
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
                  {label}
                  {field && sortField === field && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 48, textAlign: "center", color: C.textSub }}>
                  No logs match your criteria.
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

      {/* Pagination */}
      <Pagination
        current={page}
        total={filtered.length}
        onPage={(p) => { setCurrentPage(p); setExpanded(null); }}
      />
    </div>
  );
}