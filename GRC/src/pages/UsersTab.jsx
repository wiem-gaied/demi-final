// UsersTab.js
import { useState, useEffect } from "react";
import {
  Users, UserPlus, Search,
  Trash2, Edit3, X, Check,
  AlertTriangle
} from "lucide-react";

// Design tokens
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

// Mock data
const ROLES = ["Analyst", "Viewer"];
const DEPARTMENTS = ["IT Security", "Compliance", "Risk Management", "Legal", "Finance", "Operations"];

// Utility helpers
const avatarBg = (initials) => {
  const colors = ["#3B6FFF", "#6D28D9", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];
  if (!initials || initials.length < 1) return colors[0];
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || initials.charCodeAt(0))) % colors.length;
  return colors[idx];
};

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

const RoleBadge = ({ role }) => {
  const map = {
    Admin: "#EF4444", Auditor: "#3B6FFF", Analyst: "#6D28D9", Viewer: "#64748B", CISO: "#F59E0B",
  };
  return (
    <span style={{ background: (map[role] || "#999") + "18", color: map[role] || "#999", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>
      {role}
    </span>
  );
};

// Reusable Field wrapper
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

// Modal: Create / Edit User
function UserModal({ user, groups, onClose, onSave }) {
  const [form, setForm] = useState(user || { 
    first_name: "", 
    last_name: "", 
    email: "", 
    role: "Viewer", 
    department: "", 
    status: "pending", 
    groups: [], 
    
  });
  const [loading, setLoading] = useState(false);
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleGroups = (gid) => {
    set("groups",
      form.groups.includes(gid)
        ? form.groups.filter(g => g !== gid)
        : [...form.groups, gid]
    );
  };

  const handleSave = async () => {
    if (!form.first_name || !form.email) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const userData = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        status: form.status,
        department: form.department
      };

      const isEdit = !!user?.id;

      const res = await fetch(
        isEdit
          ? `http://localhost:3000/api/settings/users/${user.id}`
          : "http://localhost:3000/api/settings/users",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
          credentials: "include"
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Server error");
      }

      const savedUser = await res.json();
      const userId = isEdit ? user.id : savedUser.id;

      if (form.groups) {
        await fetch(`http://localhost:3000/api/settings/users/${userId}/groups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groups: form.groups }),
          credentials: "include"
        });
      }

      const formattedUser = {
        id: userId,
        ...form,
        avatar: `${form.first_name[0]}${form.last_name[0]}`.toUpperCase(),
        lastLogin: "—"
      };

      onSave(formattedUser);
      onClose();

    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Failed");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,60,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.card, borderRadius: 20, width: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(59,111,255,0.18)", border: `1px solid ${T.border}` }}>
        <div style={{ padding: "28px 32px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: T.text }}>{user ? "Edit User" : "New User"}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Fill in the account information</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="First name" required>
              <input value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="First name" style={inputStyle} />
            </Field>
            <Field label="Last name" required>
              <input value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Last name" style={inputStyle} />
            </Field>
          </div>
          
          <Field label="Email" required>
            <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@company.com" style={inputStyle} />
          </Field>
          
          
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Role">
              <select value={form.role} onChange={e => set("role", e.target.value)} style={inputStyle}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={e => set("department", e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          
          {user && ( // 🔥 seulement en mode édition
  <Field label="Status">
    <div style={{ display: "flex", gap: 10 }}>
      {["active", "inactive"].map(s => (
        <button
          key={s}
          onClick={() => set("status", s)}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 10,
            border: `2px solid ${form.status === s ? T.primary : T.border}`,
            background: form.status === s ? T.primary + "12" : "transparent",
            color: form.status === s ? T.primary : T.muted,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer"
          }}
        >
          {s === "active" ? "Active" : "Inactive"}
        </button>
      ))}
    </div>
  </Field>
)}
          
          <Field label="Assign to groups">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {groups.map(g => (
                <button key={g.id} onClick={() => toggleGroups(g.id)} style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${form.groups.includes(g.id) ? g.color : T.border}`, background: form.groups.includes(g.id) ? g.color + "18" : "transparent", color: form.groups.includes(g.id) ? g.color : T.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
                  {form.groups.includes(g.id) && <Check size={12} />}
                  {g.name}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div style={{ padding: "16px 32px 28px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: "10px 28px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: `0 4px 16px ${T.primary}44`, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating..." : (user ? "Save Changes" : "Create User")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Users Tab Component
export default function UsersTab({ users, groups, setUsers }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userModal, setUserModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/settings/users", {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to fetch users");
      
      const data = await response.json();
      const formattedUsers = data.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department || "—",
        status: user.status || "pending",
        groups: user.groups || [],
        
        avatar: `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase(),
        lastLogin: user.last_login || "—"
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filtered = users
    .filter(u => u.role?.toLowerCase() !== "admin")
    .filter(u => {
      const q = search.toLowerCase();
      const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        u.email.toLowerCase().includes(q)
      ) && (roleFilter === "all" || u.role === roleFilter);
    });

  const saveUser = async (u) => {
    if (u.id && users.find(p => p.id === u.id)) {
      setUsers(prev => prev.map(p => p.id === u.id ? u : p));
    } else {
      setUsers(prev => [...prev, u]);
    }
  };
  
  const deleteUser = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to delete user");
      
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        <div style={{ color: T.primary }}>Loading users...</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for a user..." style={{ ...inputStyle, paddingLeft: 38, width: "100%" }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button onClick={() => { setEditTarget(null); setUserModal(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", boxShadow: `0 4px 16px ${T.primary}44` }}>
          <UserPlus size={16} /> New User
        </button>
      </div>

      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["User", "Role", "Department", "Groups", "Status", "Last Login", ""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
             </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const avatarInitials = u.avatar || `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();
              return (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg(avatarInitials), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{avatarInitials}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 18px" }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: T.muted }}>{u.department || "—"}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.groups && u.groups.map(gid => {
                        const g = groups.find(gr => gr.id === gid);
                        return g ? <span key={gid} style={{ background: g.color + "18", color: g.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{g.name}</span> : null;
                      })}
                      {(!u.groups || u.groups.length === 0) && <span style={{ color: T.muted, fontSize: 12 }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: "14px 18px" }}><StatusBadge status={u.status} /></td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: T.muted }}>{u.lastLogin || "—"}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditTarget(u); setUserModal(true); }} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: T.primary }}><Edit3 size={14} /></button>
                      <button onClick={() => setDeleteConfirm(u.id)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: T.danger }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.muted, fontSize: 14 }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,60,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 32, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ background: T.danger + "14", borderRadius: "50%", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.danger }}><AlertTriangle size={24} /></div>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete user?</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteUser(deleteConfirm)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: T.danger, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {userModal && <UserModal user={editTarget} groups={groups} onClose={() => { setUserModal(false); setEditTarget(null); }} onSave={saveUser} />}
    </>
  );
}