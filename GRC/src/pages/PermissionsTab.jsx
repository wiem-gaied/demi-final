// PermissionsTab.jsx
import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Plus,
  Check,
  X,
  ChevronDown,
  Users,
  Trash2,
} from "lucide-react";

const T = {
  primary: "#3B6FFF",
  primaryDark: "#2A5AE8",
  primaryLight: "#E8F0FF",
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E9ECF0",
  text: "#1E293B",
  textLight: "#475569",
  muted: "#64748B",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  success: "#10B981",
  successLight: "#F0FDF4",
  warning: "#F59E0B",
  hover: "#F8FAFC",
  borderDark: "#E2E8F0",
};

const CATEGORIES = [
  "Risks",
  "Policies",
  "Reports",
  "Administration",
  "Frameworks",
];

const generateId = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid ${T.borderDark}`,
  fontSize: 14,
  color: T.text,
  background: T.bg,
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s",
};

/* ── Side panel: Add Permission ───────────────────────────────────────── */
function GlobalPermissionPanel({ open, onClose, onAdd }) {
  const [permId, setPermId] = useState("");
  const [permLabel, setPermLabel] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (loading || error || !permId.trim() || !permLabel.trim()) return;
    setLoading(true);
    try {
      await onAdd({ id: permId.trim(), label: permLabel.trim(), category });
      setPermId("");
      setPermLabel("");
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: T.card,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .3s ease",
        }}
      >
        <div
          style={{
            padding: "28px 28px 20px",
            borderBottom: `1px solid ${T.border}`,
            background: T.card,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: T.text }}>
              Add Permission
            </h3>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textLight }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            Create a new permission that can be assigned to groups
          </p>
        </div>

        <div style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8, display: "block" }}>Display Label</label>
            <input
              value={permLabel}
              onChange={(e) => {
                const value = e.target.value;
                setError(!/^[a-zA-Z ]*$/.test(value) ? "Only letters and spaces are allowed" : "");
                setPermLabel(value);
                setPermId(generateId(value));
              }}
              placeholder="e.g., Export Data"
              style={inputStyle}
            />
            {error && <div style={{ color: T.danger, fontSize: 12, marginTop: 6 }}>{error}</div>}
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8, display: "block" }}>Permission ID</label>
            <input value={permId} readOnly style={{ ...inputStyle, background: T.hover, color: T.muted }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8, display: "block" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: "20px 28px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", fontSize: 14, fontWeight: 500, cursor: "pointer", color: T.muted }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading || !!error}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: `0 4px 16px ${T.primary}44`, opacity: loading || error ? 0.6 : 1, cursor: loading || error ? "not-allowed" : "pointer" }}
          >
            {loading ? "Adding..." : "Add Permission"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Assign-to-group dropdown for one permission ──────────────────────── */
function AssignGroupDropdown({ perm, groups, onToggleGroup, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const assignedCount = groups.filter((g) => (g.permissions || []).includes(perm.id)).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.bg,
          fontSize: 12,
          fontWeight: 500,
          color: T.textLight,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.color = T.primary; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textLight; }}
      >
        <Users size={12} />
        {assignedCount === 0 ? "Assign to group" : `${assignedCount} group${assignedCount > 1 ? "s" : ""}`}
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 210,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {groups.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: T.muted }}>No groups available</div>
          ) : (
            groups.map((group) => {
              const isAssigned = (group.permissions || []).includes(perm.id);
              const isSaving = saving === group.id;
              return (
                <div
                  key={group.id}
                  onClick={() => !isSaving && onToggleGroup(perm.id, group, isAssigned)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    fontSize: 13,
                    color: T.text,
                    background: isAssigned ? T.primaryLight : "transparent",
                    transition: "background 0.15s",
                    opacity: isSaving ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isAssigned && !isSaving) e.currentTarget.style.background = T.hover; }}
                  onMouseLeave={(e) => { if (!isAssigned) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: T.hover, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{group.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span style={{ fontWeight: isAssigned ? 600 : 400 }}>{group.name}</span>
                  </div>
                  {isAssigned && (
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={11} color="#fff" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single permission row ────────────────────────────────────────────── */
function PermissionRow({ perm, groups, onToggleGroup, saving, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const assignedGroups = groups.filter((g) => (g.permissions || []).includes(perm.id));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        gap: 12,
        background: hovered ? T.hover : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setDeleteHovered(false); }}
    >
      {/* Left: label + id */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{perm.label}</span>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{perm.id}</span>
      </div>

      {/* Right: assigned badges + dropdown + delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {assignedGroups.map((g) => (
          <span
            key={g.id}
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              background: T.primaryLight,
              color: T.primary,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${T.primary}33`,
              whiteSpace: "nowrap",
            }}
          >
            {g.name}
          </span>
        ))}

        <AssignGroupDropdown perm={perm} groups={groups} onToggleGroup={onToggleGroup} saving={saving} />

        {/* Trash — invisible until row is hovered */}
        <button
          onClick={() => onDelete(perm)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            border: `1px solid ${deleteHovered ? T.danger : T.border}`,
            background: deleteHovered ? T.dangerLight : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: deleteHovered ? T.danger : T.muted,
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          title="Delete permission"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Category card ────────────────────────────────────────────────────── */
function CategorySection({ category, permissions, groups, onToggleGroup, saving, onDelete }) {
  if (permissions.length === 0) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 20px", background: T.hover, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>{category}</span>
        <span style={{ fontSize: 12, color: T.muted }}>{permissions.length} permission{permissions.length !== 1 ? "s" : ""}</span>
      </div>
      {permissions.map((perm, idx) => (
        <div key={perm.id} style={{ borderBottom: idx < permissions.length - 1 ? `1px solid ${T.border}` : "none" }}>
          <PermissionRow perm={perm} groups={groups} onToggleGroup={onToggleGroup} saving={saving} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────── */
export default function PermissionsTab({ groups, setGroups }) {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(null); // groupId currently being saved

  useEffect(() => {
    fetchGroups();
    fetchPermissions();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/settings/groups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      setGroups(await res.json());
    } catch (e) {
      console.error(e);
      alert("Failed to load groups");
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/permissions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch permissions");
      setPermissions(await res.json());
    } catch (e) {
      console.error(e);
      alert("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const updateGroupPermissions = async (groupId, permissionsList) => {
    try {
      const res = await fetch(`http://localhost:3000/api/settings/groups/${groupId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionsList }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update permissions");
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, permissions: permissionsList } : g));
    } catch (e) {
      console.error(e);
      alert("Failed to update permissions");
    }
  };

  // Toggle one permission on a group and save immediately
  const handleToggleGroup = async (permId, group, isCurrentlyAssigned) => {
    if (saving) return;
    setSaving(group.id);
    const current = group.permissions || [];
    const updated = isCurrentlyAssigned
      ? current.filter((p) => p !== permId)
      : [...current, permId];
    await updateGroupPermissions(group.id, updated);
    setSaving(null);
  };

  const deletePermission = async (perm) => {
    if (!window.confirm(`Delete permission "${perm.label}"? This will remove it from all groups.`)) return;
    try {
      const res = await fetch(`http://localhost:3000/api/permissions/${perm.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete permission");
      setPermissions((prev) => prev.filter((p) => p.id !== perm.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete permission");
    }
  };

  const addGlobalPermission = async (perm) => {
    try {
      const res = await fetch("http://localhost:3000/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perm),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create permission");
      }
      await fetchPermissions();
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to add permission");
      throw e;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <div style={{ fontSize: 14, color: T.muted }}>Loading permissions...</div>
      </div>
    );
  }

  const permissionsByCategory = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 28 }}>
        <button
          onClick={() => setPanelOpen(true)}
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
            whiteSpace: "nowrap",
            boxShadow: `0 4px 16px ${T.primary}44`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${T.primary}55`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 16px ${T.primary}44`; }}
        >
          <Plus size={14} />
          Add Permission
        </button>
      </div>

      {/* Permissions — always visible regardless of groups */}
      {permissions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
          <ShieldCheck size={40} style={{ marginBottom: 16, color: T.muted }} />
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 8 }}>No permissions defined yet</div>
          <div style={{ fontSize: 12, color: T.muted }}>Click "Add Permission" to create your first permission</div>
        </div>
      ) : (
        CATEGORIES.map((category) => (
          <CategorySection
            key={category}
            category={category}
            permissions={permissionsByCategory[category] || []}
            groups={groups}
            onToggleGroup={handleToggleGroup}
            saving={saving}
            onDelete={deletePermission}
          />
        ))
      )}

      <GlobalPermissionPanel open={panelOpen} onClose={() => setPanelOpen(false)} onAdd={addGlobalPermission} />
    </div>
  );
}