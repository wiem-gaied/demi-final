import { useState, useEffect,useRef } from "react";
import {
  Users, Shield, Settings,  X,
  Lock, Globe, 
   Layers,
   ShieldCheck
} from "lucide-react";



import UsersTab from "./UsersTab";
import PermissionsTab from "./PermissionsTab";
import GroupsTab from "./GroupsTab";
// ─── Design tokens (matching GRC platform) ──────────────────────────────────
const T = {
  primary: "#3B6FFF",
  primaryDark: "#2A5AE8",
  purple: "#6D28D9",
  bg: "#F8FAFF",
  card: "#FFFFFF",
  border: "#E2E8F5",
  text: "#1A2340",
  muted: "#64748B",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#06B6D4",
};

// ─── Mock data ───────────────────────────────────────────────────────────────


const INITIAL_USERS = [];
const INITIAL_GROUPS = [];


// ─── Reusable Field wrapper ──────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 13, color: T.text, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" };
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}{required && <span style={{ color: T.danger }}> *</span>}
      </label>
      {children}
    </div>
  );
}
const StatusBadge = ({ status }) => {
  const map = {
    active: { color: T.success, bg: "#D1FAE5", label: "Active" },
    inactive: { color: T.muted, bg: "#F1F5F9", label: "Inactive" },
    pending: { color: T.warning, bg: "#FEF3C7", label: "Pending" },
  };
  const s = map[status] || map.inactive;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
};



// ─── Groups Tab ──────────────────────────────────────────────────────────────


// ─── Security Tab ────────────────────────────────────────────────────────────
function SecurityTab({sessionTimeout, setSessionTimeout,updateTimeout}) {
  const [mfa, setMfa] = useState(true);
  
  const [passPolicy, setPassPolicy] = useState({ minLength: 12, uppercase: true, numbers: true, symbols: true, expiry: 90 });
  const [ipWhitelist, setIpWhitelist] = useState(["192.168.1.0/24", "10.0.0.1"]);
  const [newIp, setNewIp] = useState("");

  const setPass = (k, v) => setPassPolicy(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SettingsCard icon={<Lock size={18} />} title="Authentication & Sessions" color={T.primary}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>Two-Factor Authentication (MFA)</div>
                <div style={{ fontSize: 12, color: T.muted }}>Mandatory for all users</div>
              </div>
              <Toggle value={mfa} onChange={setMfa} color={T.primary} />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.text, marginBottom: 4 }}>Session Timeout</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Auto-logout after inactivity</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[5, 30, 60, 120].map(t => (
                <button key={t} onClick={() => updateTimeout(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${sessionTimeout === t ? T.primary : T.border}`, background: sessionTimeout === t ? T.primary + "12" : "transparent", color: sessionTimeout === t ? T.primary : T.muted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{t}m</button>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      
      <SettingsCard icon={<Globe size={18} />} title="IP Whitelist" color={T.success}>
        <div style={{ marginBottom: 12 }}>
          {ipWhitelist.map((ip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: T.bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: T.text }}>{ip}</span>
              <button onClick={() => setIpWhitelist(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: T.danger }}><X size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="e.g., 192.168.1.0/24" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => { if (newIp.trim()) { setIpWhitelist(p => [...p, newIp.trim()]); setNewIp(""); } }} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: T.success, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add</button>
        </div>
      </SettingsCard>
    </div>
  );
}


// ─── Advanced Tab ─────────────────────────────────────────────────────────────

// ─── Settings Card wrapper ────────────────────────────────────────────────────
function SettingsCard({ icon, title, color, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ background: color + "16", color, borderRadius: 10, padding: 8 }}>{icon}</div>
        <div style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 700, fontSize: 16, color: T.text }}>{title}</div>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ value, onChange, color }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: value ? color : "#CBD5E1", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const timeoutRef = useRef(sessionTimeout);
  const timerRef = useRef(null);
  const handleLogout = () => {
    alert("Session expired");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const timeoutMs = timeoutRef.current * 60 * 1000;

    timerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  };
  useEffect(() => {
  resetTimer();
}, [sessionTimeout]);
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // démarrage

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);
  useEffect(() => {
  timeoutRef.current = sessionTimeout;
}, [sessionTimeout]);
  useEffect(() => {
    fetch("http://localhost:3000/api/security")
      .then((res) => res.json())
      .then((data) => {
        setSessionTimeout(data.session_timeout);
      });
  }, []);
  const updateTimeout = async (t) => {
    console.log("Sending timeout:", t);
    setSessionTimeout(t);

    await fetch("http://localhost:3000/api/security", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_timeout: t }),
      credentials:'include',
    });
  };


  const tabs = [
    { id: "users", label: "Users", icon: <Users size={16} /> },
    { id: "groups", label: "Groups", icon: <Layers size={16} /> },
    { id: "permissions", label: "Permissions", icon: <ShieldCheck size={16} /> },
    { id: "security", label: "Security", icon: <Shield size={16} /> },
    
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          background: T.card,
          borderBottom: `1px solid ${T.border}`,
          padding: "28px 40px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${T.primary}, ${T.purple})`,
              borderRadius: 14,
              padding: 12,
              color: "#fff",
            }}
          >
            <Settings size={22} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "Fraunces, Georgia, serif",
                fontSize: 26,
                fontWeight: 800,
                color: T.text,
                lineHeight: 1.1,
              }}
            >
              Settings
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              User management, groups & GRC platform configuration
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)} // ← Simplifié : pas de condition spéciale
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: "12px 12px 0 0",
                border: "none",
                borderBottom:
                  tab === t.id
                    ? `3px solid ${T.primary}`
                    : "3px solid transparent", // ← Simplifié
                background: tab === t.id ? T.primary + "10" : "transparent", // ← Simplifié
                color: tab === t.id ? T.primary : T.muted, // ← Simplifié
                fontWeight: tab === t.id ? 700 : 500, // ← Simplifié
                fontSize: 14,
                cursor: "pointer",
                transition: "all .2s",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px" }}>
        {tab === "users" && (
          <UsersTab users={users} groups={groups} setUsers={setUsers} />
        )}
        {tab === "groups" && (
          <GroupsTab groups={groups} users={users} setGroups={setGroups} />
        )}
        {tab === "permissions" && (
          <PermissionsTab groups={groups} setGroups={setGroups} />
        )}
        {tab === "security" && (
          <SecurityTab
            sessionTimeout={sessionTimeout}
            setSessionTimeout={setSessionTimeout}
            updateTimeout={updateTimeout}

          />
        )}
      </div>
    </div>
  );
}