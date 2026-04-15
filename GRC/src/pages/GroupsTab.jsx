// GroupsTab.js
import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Shield, X, Check } from "lucide-react";

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

// Utility helpers
const avatarBg = (initials) => {
  const colors = ["#3B6FFF", "#6D28D9", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];
  if (!initials || initials.length < 1) return colors[0];
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || initials.charCodeAt(0))) % colors.length;
  return colors[idx];
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

// Modal: Group Details
function GroupDetailsModal({ group, users, onClose }) {
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await fetch("http://localhost:3000/api/permissions", {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to fetch permissions");
      
      const data = await response.json();
      setAvailablePermissions(data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const getPermissionLabel = (permId) => {
    const perm = availablePermissions.find(p => p.id === permId);
    return perm ? perm.label : permId;
  };

  const getPermissionCategory = (permId) => {
    const perm = availablePermissions.find(p => p.id === permId);
    return perm ? perm.category : "Other";
  };

  const groupMembers = users.filter(u => u.groups?.includes(group.id));
  const permissionsByCategory = group.permissions?.reduce((acc, permId) => {
    const category = getPermissionCategory(permId);
    if (!acc[category]) acc[category] = [];
    acc[category].push(permId);
    return acc;
  }, {}) || {};

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,60,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.card, borderRadius: 20, width: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(59,111,255,0.18)", border: `1px solid ${T.border}` }}>
        <div style={{ padding: "28px 32px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: T.text }}>
              {group.name}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
              Group details and permissions
            </div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: T.muted }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Description */}
          {group.description && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Description
              </div>
              <div style={{ padding: "12px 16px", background: T.bg, borderRadius: 12, fontSize: 13, color: T.text }}>
                {group.description}
              </div>
            </div>
          )}

          {/* Members section */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Members ({groupMembers.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {groupMembers.length > 0 ? (
                groupMembers.map(member => {
                  const avatarInitials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
                  return (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: T.bg, borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg(avatarInitials), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                        {avatarInitials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>
                          {member.first_name} {member.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted }}>{member.email}</div>
                      </div>
                      <RoleBadge role={member.role} />
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "20px", color: T.muted, background: T.bg, borderRadius: 12 }}>
                  No members in this group
                </div>
              )}
            </div>
          </div>

          {/* Permissions section */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Permissions ({group.permissions?.length || 0})
            </div>
            {loadingPermissions ? (
              <div style={{ textAlign: "center", padding: "20px", color: T.muted, background: T.bg, borderRadius: 12 }}>
                Loading permissions...
              </div>
            ) : group.permissions?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
                      {category}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {perms.map(permId => (
                        <div
                          key={permId}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 20,
                            background: (group.color || T.primary) + "16",
                            color: group.color || T.primary,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {getPermissionLabel(permId)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: T.muted, background: T.bg, borderRadius: 12 }}>
                No permissions assigned to this group
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 32px 28px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.muted,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal: Create / Edit Groups
function GroupsModal({ group, users, onClose, onSave }) {
  const filteredUsers = users.filter(u => u.role?.toLowerCase() !== "admin");
  const groupsColors = ["#3B6FFF", "#6D28D9", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [],
    members: [],
    color: groupsColors[0]
  });

  // Charger les permissions disponibles depuis la base de données
  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await fetch("http://localhost:3000/api/permissions", {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to fetch permissions");
      
      const data = await response.json();
      setAvailablePermissions(data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      alert("Failed to load permissions");
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || "",
        description: group.description || "",
        permissions: group.permissions || [],
        members: group.members || [],
        color: group.color || groupsColors[0]
      });
    } else {
      setForm({
        name: "",
        description: "",
        permissions: [],
        members: [],
        color: groupsColors[0]
      });
    }
  }, [group]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleMember = (uid) => set("members", 
    form.members.includes(uid) 
      ? form.members.filter(m => m !== uid) 
      : [...form.members, uid]
  );

  const togglePermission = (permId) => {
    set("permissions",
      form.permissions.includes(permId)
        ? form.permissions.filter(p => p !== permId)
        : [...form.permissions, permId]
    );
  };

  const handleSave = async () => {
    if (!form.name) {
      alert("Please fill in the group name");
      return;
    }

    try {
      const isEdit = !!group?.id;

      const url = isEdit
        ? `http://localhost:3000/api/settings/groups/${group.id}`
        : "http://localhost:3000/api/permissions/groups";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          permissions: form.permissions,
          members: form.members,
          color: form.color,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to save group");
      }

      const savedGroup = await res.json();

      onSave({
        id: isEdit ? group.id : savedGroup.id,
        ...form,
      });

      onClose();
    } catch (error) {
      console.error("Error saving group:", error);
      alert("Failed to save group");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,20,60,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 20,
          width: 640,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(109,40,217,0.18)",
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            padding: "28px 32px 20px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Fraunces, Georgia, serif",
                fontSize: 20,
                fontWeight: 700,
                color: T.text,
              }}
            >
              {group ? "Edit Group" : "New Group"}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
              Define members and permissions
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.bg,
              border: "none",
              borderRadius: 10,
              padding: 8,
              cursor: "pointer",
              color: T.muted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <Field label="Group name" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., Security Team"
              style={inputStyle}
            />
          </Field>
          
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Group description..."
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            />
          </Field>

          <Field label={`Members (${form.members.length} selected)`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto", padding: "8px 0" }}>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleMember(u.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: `2px solid ${form.members.includes(u.id) ? T.purple : T.border}`,
                    background: form.members.includes(u.id) ? T.purple + "15" : "transparent",
                    color: form.members.includes(u.id) ? T.purple : T.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {form.members.includes(u.id) && <Check size={11} />}
                  {u.first_name} {u.last_name}
                </button>
              ))}
            </div>
          </Field>
          
          <Field label="Permissions">
            {loadingPermissions ? (
              <div style={{ textAlign: "center", padding: "20px", color: T.muted }}>
                Loading permissions...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 400, overflowY: "auto", padding: "8px 0" }}>
                {Object.entries(
                  availablePermissions.reduce((acc, perm) => {
                    const category = perm.category || "Other";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(perm);
                    return acc;
                  }, {})
                ).map(([category, perms]) => (
                  <div key={category}>
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: T.muted, 
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      marginBottom: 8,
                      paddingLeft: 4
                    }}>
                      {category}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {perms.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePermission(p.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 20,
                            border: `2px solid ${form.permissions.includes(p.id) ? T.primary : T.border}`,
                            background: form.permissions.includes(p.id)
                              ? T.primary + "15"
                              : "transparent",
                            color: form.permissions.includes(p.id)
                              ? T.primary
                              : T.muted,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {form.permissions.includes(p.id) && <Check size={11} style={{ marginRight: 4 }} />}
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {availablePermissions.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: T.muted }}>
                    No permissions available
                  </div>
                )}
              </div>
            )}
          </Field>
        </div>

        <div
          style={{
            padding: "16px 32px 28px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.muted,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 28px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.purple}, #5B21B6)`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: `0 4px 16px ${T.purple}44`,
            }}
          >
            {group ? "Save Changes" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Groups Tab Component
export default function GroupsTab({ groups, users, setGroups }) {
  const [groupsModal, setGroupsModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/settings/groups", {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Failed to fetch groups");
      
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      alert("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const saveGroups = (g) => {
    setGroups(prev =>
      prev.some(p => p.id === g.id)
        ? prev.map(p => (p.id === g.id ? g : p))
        : [...prev, g]
    );
  };
  
  const deleteGroups = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/api/settings/groups/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to delete group");

      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        <div style={{ color: T.primary }}>Loading groups...</div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => {
            setEditTarget(null);
            setGroupsModal(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: `0 4px 16px ${T.purple}44`,
          }}
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {groups.map((g) => {
          const members = users.filter((u) => u.groups?.includes(g.id));
          const permCount = g.permissions?.length || 0;
          return (
            <div
              key={g.id}
              onClick={() => handleGroupClick(g)}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(59,111,255,0.06)",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,111,255,0.12)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,111,255,0.06)";
              }}
            >
              <div style={{ height: 5, background: g.color || T.primary }} />
              <div style={{ padding: "20px 22px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: T.text,
                        marginBottom: 4,
                      }}
                    >
                      {g.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted }}>
                      {g.description}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(g);
                        setGroupsModal(true);
                      }}
                      style={{
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                        color: g.color || T.primary,
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroups(g.id);
                      }}
                      style={{
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                        color: T.danger,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      marginBottom: 8,
                    }}
                  >
                    Members ({members.length})
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {members.slice(0, 5).map((u, i) => {
                      const avatarInitials =
                        u.avatar ||
                        `${u.first_name?.[0] || ""}${u.last_name?.[0] || ""}`.toUpperCase();
                      return (
                        <div
                          key={u.id}
                          title={`${u.first_name} ${u.last_name}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: avatarBg(avatarInitials),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 11,
                            border: "2px solid #fff",
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: 5 - i,
                          }}
                        >
                          {avatarInitials}
                        </div>
                      );
                    })}
                    {members.length > 5 && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: T.border,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: T.muted,
                          fontWeight: 700,
                          fontSize: 11,
                          border: "2px solid #fff",
                          marginLeft: -8,
                        }}
                      >
                        +{members.length - 5}
                      </div>
                    )}
                    {members.length === 0 && (
                      <span style={{ fontSize: 12, color: T.muted }}>
                        No members
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: T.bg,
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: 12, color: T.muted }}>
                    <Shield
                      size={13}
                      style={{
                        verticalAlign: -2,
                        marginRight: 5,
                        color: g.color || T.primary,
                      }}
                    />
                    {permCount} permission{permCount !== 1 ? "s" : ""}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      maxWidth: 180,
                      justifyContent: "flex-end",
                    }}
                  >
                    {g.permissions?.slice(0, 3).map((pid) => {
                      // Note: PERMISSIONS is not available here, but we keep the structure
                      // This will be handled by the parent component passing the PERMISSIONS data
                      return (
                        <span
                          key={pid}
                          style={{
                            background: (g.color || T.primary) + "16",
                            color: g.color || T.primary,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 20,
                          }}
                        >
                          {pid}
                        </span>
                      );
                    })}
                    {g.permissions?.length > 3 && (
                      <span style={{ fontSize: 9, color: T.muted }}>
                        +{g.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {groupsModal && (
        <GroupsModal
          group={editTarget}
          users={users}
          onClose={() => {
            setGroupsModal(false);
            setEditTarget(null);
          }}
          onSave={saveGroups}
        />
      )}

      {showDetailsModal && selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          users={users}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGroup(null);
          }}
        />
      )}
    </>
  );
}