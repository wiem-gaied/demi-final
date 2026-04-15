import { useState, useEffect } from "react";
import {Edit3} from "lucide-react";

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
};

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);


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
function Btn({ label, icon, onClick, variant = "primary", small }) {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}` },
    danger:  { background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}` },
  };
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      ...styles[variant],
      borderRadius: 10, padding: small ? "5px 11px" : "8px 16px",
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: "pointer", fontFamily: "DM Sans, sans-serif",
      transition: "opacity .15s",
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = ".82"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      {icon && <Icon d={icons[icon]} size={small ? 13 : 15} />}
      {label}
    </button>
  );
}

// ── Item card ────────────────────────────────────────────────────────────────
function ItemCard({ item, onDelete, onUpdate, pkgId, chapterId }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [editModal, setEditModal] = useState(null);
const [editForm, setEditForm] = useState({});
const [isEditing, setIsEditing] = useState(false);
useEffect(() => {
  setHover(false);
}, [item.id, item.title, item.description]);

  const updateItem = async () => {
  const res = await fetch(`http://localhost:3000/api/frameworks/Items/${editForm.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: editForm.title,
      description: editForm.description,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    onUpdate ({
      type: "UPDATE_ITEM",
      pkgId, 
      chapterId,

      itemId: editForm.id,
      payload: editForm,
    });
    setEditModal(null);
    setIsEditing(false);
  } else {
    alert(data.error || "Update failed");
  }
};

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 14px", borderRadius: 10,
      border: `1px solid ${C.border}`, background: C.bg,
      marginBottom: 8, transition: "box-shadow .15s", position: "relative",
    }}
      onMouseEnter={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();

  setPos({
    top: rect.bottom + 6,
    left: rect.left,
  });

  setHover(true);

  e.currentTarget.style.boxShadow = `0 2px 12px rgba(59,111,255,.1)`;
}}

onMouseLeave={(e) => {
  setHover(false);
  e.currentTarget.style.boxShadow = "none";
}}
    >
      {hover && item.description && !isEditing && (
  <div style={{
    position: "fixed",
    top: pos.top,
left: pos.left,
    marginTop: 6,
    minWidth: 280,      
    maxWidth: 420, 
    background: "#fff",
    color: "#111827",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 12,
    zIndex: 99999,
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    transform: "translateX(10px)",
  }}>
    {item.description}
  </div>
)}
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: item.type === "policy" ? "#EFF6FF" : "#F5F3FF",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.title}</div>
        {item.description && (
          <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
        )}
      </div>
      <button onClick={() => onDelete(item.id)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#CBD5E1", padding: 4, borderRadius: 6,
        transition: "color .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.color = C.danger}
        onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}
      ><Icon d={icons.trash} size={14} /></button>
      <button onClick={(e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditForm(item);
    setEditModal("Item"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "4px 6px", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color =" #2F5FE0"}
            onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}><Edit3 size={14} /></button>
        
        {editModal === "Item" && (
  <Modal title="Edit Item" onClose={() => {setEditModal(null); setIsEditing(false);}}>
    <Field label="Title">
      <input
        style={input}
        value={editForm.title}
        onChange={(e) =>
          setEditForm({ ...editForm, title: e.target.value })
        }
      />
    </Field>
    

    <Field label="Description">
      <textarea
        style={input}
        value={editForm.description}
        onChange={(e) =>
          setEditForm({ ...editForm, description: e.target.value })
        }
      />
    </Field>

    <Btn label="Save" onClick={updateItem} />
  </Modal>
)}
      
    </div>
  );
}

// ── Chapter ──────────────────────────────────────────────────────────────────
function Chapter({ chapter, pkgId, onUpdate }) {
  const [open, setOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", type: "policy" });
  const [addingItem, setAddingItem] = useState(false);
  const [editModal, setEditModal] = useState(null);
const [editForm, setEditForm] = useState({});
const updateChapter = async () => {
  try {
    console.log("Saving chapter...", editForm);

    const res = await fetch(`http://localhost:3000/api/frameworks/chapters/${editForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description,
      }),
    });

    const text = await res.text();
    console.log("RAW RESPONSE:", text);

    const data = JSON.parse(text);

    if (res.ok) {
      onUpdate({
        type: "UPDATE_CHAPTER",
        pkgId,
        chapterId: editForm.id,
        payload: editForm,
      });

      setEditModal(null);
    } else {
      alert(data.error || "Update failed");
    }
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    alert("Network or server error");
  }
};


  const addItem = async () => {
    if (!form.title.trim()) return;
    
    setAddingItem(true);
    try {
      const response = await fetch("http://localhost:3000/api/frameworks/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chapter_id: chapter.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const newItem = { 
          id: data.id, 
          title: form.title.trim(), 
          description: form.description.trim() || "", 
          type: form.type 
        };
        
        onUpdate({ type: "ADD_ITEM", pkgId, chapterId: chapter.id, item: newItem });
        setForm({ title: "", description: "", type: "policy" });
        setModal(null);
      } else {
        alert("Failed to create item: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to create item. Please try again.");
    } finally {
      setAddingItem(false);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/frameworks/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        onUpdate({ type: "DEL_ITEM", pkgId, chapterId: chapter.id, itemId });
      } else {
        const data = await response.json();
        alert("Failed to delete item: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  const deleteChapter = async () => {
    if (window.confirm("Are you sure you want to delete this chapter? This will also delete all items in this chapter.")) {
      try {
        const response = await fetch(`http://localhost:3000/api/frameworks/chapters/${chapter.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
          onUpdate({ type: "DEL_CHAPTER", pkgId, chapterId: chapter.id });
        } else {
          const data = await response.json();
          alert("Failed to delete chapter: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error deleting chapter:", error);
        alert("Failed to delete chapter. Please try again.");
      }
    }
  };

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Chapter header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 10,
        background: "#F1F5FE", cursor: "pointer",
        border: `1px solid #DCE7FB`,
      }} onClick={() => setOpen(o => !o)}>
        <div style={{
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .2s", color: C.accent, flexShrink: 0,
        }}><Icon d={icons.chevron} size={15} /></div>
        <Icon d={icons.chapter} size={15} color={C.accent} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
    {chapter.title}
  </span>

  {chapter.description && (
    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
      {chapter.description}
    </div>
  )}
</div>
        
        <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>
          {chapter.items?.length || 0} item{(chapter.items?.length || 0) !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <Btn label="+ Policy" variant="ghost" small onClick={() => { setForm(f => ({ ...f, type: "policy" })); setModal("item"); }} />
          <button onClick={deleteChapter}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px 4px", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = C.danger}
            onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}
          ><Icon d={icons.trash} size={13} /></button>
          <button onClick={(e) => {
    e.stopPropagation();
    setEditForm(chapter);
    setEditModal("Chapter"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "4px 6px", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color =" #2F5FE0"}
            onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}><Edit3 size={14} /></button>
        </div>
        {editModal === "Chapter" && (
  <Modal title="Edit Chapter" onClose={() => setEditModal(null)}>
    <Field label="Title">
      <input
        style={input}
        value={editForm.title}
        onChange={(e) =>
          setEditForm({ ...editForm, title: e.target.value })
        }
      />
    </Field>
    

    <Field label="Description">
      <textarea
        style={input}
        value={editForm.description}
        onChange={(e) =>
          setEditForm({ ...editForm, description: e.target.value })
        }
      />
    </Field>

    <Btn label="Save" onClick={updateChapter} />
  </Modal>
)}
          
        
      </div>

      {/* Items */}
      {open && (
        <div style={{ paddingLeft: 28, paddingTop: 8 }}>
          {(!chapter.items || chapter.items.length === 0) && (
            <div style={{ textAlign: "center", padding: "18px 0", color: "#A0AEC0", fontSize: 13 }}>
              No items yet — add a Policy above.
            </div>
          )}
          {chapter.items?.map(it => (
            <ItemCard key={it.id} item={it} onDelete={deleteItem}  onUpdate={onUpdate} pkgId={pkgId}chapterId={chapter.id}/>
          ))}
        </div>
      )}

      {/* Modal: Add item */}
      {modal === "item" && (
        <Modal title="Add Policy" onClose={() => setModal(null)}>
          <Field label="Title">
            <input style={input} placeholder="e.g. Data Retention Policy"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Description (optional)">
            <textarea style={{ ...input, resize: "vertical", minHeight: 70 }}
              placeholder="Brief description…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Btn label="Cancel" variant="ghost" onClick={() => setModal(null)} />
            <Btn label={addingItem ? "Adding..." : "Add Item"} icon="plus" onClick={addItem} disabled={addingItem} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Package ──────────────────────────────────────────────────────────────────
function Package({ pkg, onUpdate }) {
  const [open, setOpen] = useState(true);
  const [modal, setModal] = useState(false);
  const [chTitle, setChTitle] = useState("");
  const [chDescription, setChDescription] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);
  const [editModal, setEditModal] = useState(null);
const [editForm, setEditForm] = useState({});
const updatePackage = async () => {
  const res = await fetch(`http://localhost:3000/api/frameworks/packages/${editForm.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: editForm.title,
      version: editForm.version,
      description: editForm.description,
      organization: editForm.organization,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    onUpdate ({
      type: "UPDATE_PKG",
      pkgId: editForm.id,
      payload: editForm,
    });
    setEditModal(null);
  } else {
    alert(data.error || "Update failed");
  }
};

  const addChapter = async () => {
    if (!chTitle.trim()) return;
    
    setAddingChapter(true);
    try {
      const response = await fetch("http://localhost:3000/api/frameworks/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          package_id: pkg.id,
          title: chTitle.trim(),
          description: chDescription.trim() || null
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const newChapter = { 
          id: data.id, 
          title: chTitle.trim(), 
          description: chDescription.trim() || "", 
          items: [] 
        };
        
        onUpdate({ type: "ADD_CHAPTER", pkgId: pkg.id, chapter: newChapter });
        setChTitle("");
        setChDescription("");
        setModal(false);
      } else {
        alert("Failed to create chapter: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating chapter:", error);
      alert("Failed to create chapter. Please try again.");
    } finally {
      setAddingChapter(false);
    }
  };

  const deletePackage = async () => {
    if (window.confirm("Are you sure you want to delete this package? This will also delete all chapters and items in this package.")) {
      try {
        const response = await fetch(`http://localhost:3000/api/frameworks/packages/${pkg.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
          onUpdate({ type: "DEL_PKG", pkgId: pkg.id });
        } else {
          const data = await response.json();
          alert("Failed to delete package: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error deleting package:", error);
        alert("Failed to delete package. Please try again.");
      }
    }
  };

  const policies = pkg.chapters?.reduce((s, c) => s + (c.items?.filter(i => i.type === "policy").length || 0), 0) || 0;

  return (
    <div style={{
      background: C.card, borderRadius: 14,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(59,111,255,.07)",
      marginBottom: 20, overflow: "hidden",
    }}>
      {/* Package header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.accent}14, ${C.purple}0d)`,
        borderBottom: `1.5px solid ${C.border}`,
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer",
      }} onClick={() => setOpen(o => !o)}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon d={icons.package} size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 800, color: C.text }}>{pkg.title}</div>
          {pkg.description && (
  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
    {pkg.description}
  </div>
)}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {pkg.version && <span>v{pkg.version} · </span>}
            {pkg.chapters?.length || 0} chapter{(pkg.chapters?.length || 0) !== 1 ? "s" : ""} · {policies} policies
          </div>
          {pkg.organization && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{pkg.organization}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
          <Btn label=" Chapter" icon="plus" variant="ghost" small onClick={() => setModal(true)} />
          <button onClick={deletePackage}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "4px 6px", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = C.danger}
            onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}
          ><Icon d={icons.trash} size={15} /></button>
          <button onClick={(e) => {
    e.stopPropagation();
    setEditForm(pkg);
    setEditModal("package"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "4px 6px", borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color =" #2F5FE0"}
            onMouseLeave={e => e.currentTarget.style.color = "#CBD5E1"}><Edit3 size={14} /></button>
        </div>
        {editModal === "package" && (
  <Modal title="Edit Package" onClose={() => setEditModal(null)}>
    <Field label="Title">
      <input
        style={input}
        value={editForm.title}
        onChange={(e) =>
          setEditForm({ ...editForm, title: e.target.value })
        }
      />
    </Field>
    <Field label="Version">
      <input
        style={input}
        value={editForm.version}
        onChange={(e) =>
          setEditForm({ ...editForm, version: e.target.value })
        }
      />
    </Field>

    <Field label="Description">
      <textarea
        style={input}
        value={editForm.description}
        onChange={(e) =>
          setEditForm({ ...editForm, description: e.target.value })
        }
      />
    </Field>

    <Btn label="Save" onClick={updatePackage} />
  </Modal>
)}
        <div style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s", color: C.muted }}>
          <Icon d={icons.chevron} size={16} />
        </div>
      </div>

      {/* Chapters */}
      {open && (
        <div style={{ padding: "16px 20px" }}>
          {(!pkg.chapters || pkg.chapters.length === 0) && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#A0AEC0", fontSize: 14 }}>
              No chapters yet — add one above.
            </div>
          )}
          {pkg.chapters?.map(ch => (
            <Chapter key={ch.id} chapter={ch} pkgId={pkg.id} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {/* Modal: Add chapter */}
      {modal && (
        <Modal title="New Chapter" onClose={() => setModal(false)}>
          <Field label="Chapter Title">
            <input style={input} placeholder="e.g. Access Control"
              value={chTitle} onChange={e => setChTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addChapter()} autoFocus />
          </Field>
          <Field label="Chapter Description">
            <textarea style={input} 
              value={chDescription} onChange={e => setChDescription(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Btn label="Cancel" variant="ghost" onClick={() => setModal(false)} />
            <Btn label={addingChapter ? "Adding..." : "Add Chapter"} icon="plus" onClick={addChapter} disabled={addingChapter} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reducer function for local state ─────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "SET_PACKAGES":
      return action.packages;

    case "ADD_PKG":
      return [...state, action.pkg];

    case "DEL_PKG":
      return state.filter(p => p.id !== action.pkgId);

    case "ADD_CHAPTER":
      return state.map(p =>
        p.id === action.pkgId 
          ? { ...p, chapters: [...(p.chapters || []), { ...action.chapter, items: [] }] }
          : p
      );

    case "DEL_CHAPTER":
      return state.map(p =>
        p.id === action.pkgId 
          ? { ...p, chapters: (p.chapters || []).filter(c => c.id !== action.chapterId) }
          : p
      );

    case "ADD_ITEM":
      return state.map(p =>
        p.id === action.pkgId 
          ? {
              ...p,
              chapters: (p.chapters || []).map(c =>
                c.id === action.chapterId 
                  ? { ...c, items: [...(c.items || []), action.item] }
                  : c
              )
            }
          : p
      );

    case "DEL_ITEM":
      return state.map(p =>
        p.id === action.pkgId 
          ? {
              ...p,
              chapters: (p.chapters || []).map(c =>
                c.id === action.chapterId 
                  ? { ...c, items: (c.items || []).filter(i => i.id !== action.itemId) }
                  : c
              )
            }
          : p
      );
      case "UPDATE_PKG":
  return state.map(p =>
    p.id === action.pkgId
      ? { ...p, ...action.payload }
      : p
  );
  case "UPDATE_CHAPTER":
  return state.map(p =>
    p.id === action.pkgId
      ? {
          ...p,
          chapters: p.chapters.map(c =>
            c.id === action.chapterId
              ? { ...c, ...action.payload }
              : c
          )
        }
      : p
  );
  case "UPDATE_ITEM":
  return state.map(p =>
    p.id === action.pkgId
      ? {
          ...p,
          chapters: p.chapters.map(c =>
            c.id === action.chapterId
              ? {
                  ...c,
                  items: c.items.map(i =>
                    i.id === action.itemId
                      ? { ...i, ...action.payload }
                      : i
                  )
                }
              : c
          )
        }
      : p
  );

    default:
      return state;
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Frameworks() {
  const [packages, setPackages] = useState([]);
  const [modal, setModal] = useState(false);
  const [pkgTitle, setPkgTitle] = useState("");
  const [pkgVersion, setPkgVersion] = useState("");
  const [pkgDescription, setPkgDescription] = useState("");
  const [pkgOrganization, setPkgOrganization] = useState("");
  const [loading, setLoading] = useState(false);
  

  // Fonction pour récupérer les packages, chapitres et items
  const fetchPackages = async () => {
    try {
      // Fetch packages
      const packagesRes = await fetch("http://localhost:3000/api/frameworks/packages", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!packagesRes.ok) throw new Error(`HTTP error! status: ${packagesRes.status}`);
      
      const packagesData = await packagesRes.json();
      
      // Fetch chapters and items for each package
      const packagesWithChapters = await Promise.all(
        (Array.isArray(packagesData) ? packagesData : []).map(async (pkg) => {
          try {
            const chaptersRes = await fetch(`http://localhost:3000/api/frameworks/chapters/${pkg.id}`, {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            });
            
            if (chaptersRes.ok) {
              const chaptersData = await chaptersRes.json();
              
              // Fetch items for each chapter
              const chaptersWithItems = await Promise.all(
                chaptersData.map(async (chapter) => {
                  try {
                    const itemsRes = await fetch(`http://localhost:3000/api/frameworks/items/${chapter.id}`, {
                      method: "GET",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                    });
                    
                    if (itemsRes.ok) {
                      const itemsData = await itemsRes.json();
                      return {
                        ...chapter,
                        items: itemsData || []
                      };
                    }
                  } catch (error) {
                    console.error(`Error fetching items for chapter ${chapter.id}:`, error);
                  }
                  
                  return {
                    ...chapter,
                    items: []
                  };
                })
              );
              
              return {
                ...pkg,
                chapters: chaptersWithItems
              };
            }
          } catch (error) {
            console.error(`Error fetching chapters for package ${pkg.id}:`, error);
          }
          
          return {
            ...pkg,
            chapters: []
          };
        })
      );
      
      setPackages(packagesWithChapters);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };

  // Charger les packages au démarrage
  useEffect(() => {
    fetchPackages();
  }, []);

  // Fonction pour mettre à jour l'état local
  const handleUpdate = (action) => {
    setPackages(prevPackages => reducer(prevPackages, action));
  };

  // Créer un nouveau package
  const createPackage = async () => {
    if (!pkgTitle.trim()) {
      alert("Package name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: pkgTitle.trim(),
        version: pkgVersion.trim() || "1.0.0",
        description: pkgDescription.trim() || "",
        organization: pkgOrganization.trim() || "",
      };

      const res = await fetch("http://localhost:3000/api/frameworks/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server response:", errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const responseData = await res.json();

      if (responseData.success) {
        await fetchPackages();
      }

      // Réinitialiser le formulaire
      setPkgTitle("");
      setPkgVersion("");
      setPkgDescription("");
      setPkgOrganization("");
      setModal(false);
    } catch (error) {
      console.error("Failed to create package:", error);
      alert("Failed to create package. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Statistiques
  const totalPkgs = packages.length;
  const totalChs = packages.reduce((s, p) => s + (p.chapters?.length || 0), 0);
  const totalPols = packages.reduce((s, p) => 
    s + (p.chapters?.reduce((s2, c) => 
      s2 + (c.items?.filter(i => i.type === "policy").length || 0), 0) || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
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
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <span style={{ color: "#0F172A", fontSize: "26px", fontWeight: "800", lineHeight: 1.1 }}>
            Policies & Proofs
          </span>
        </div>
        <Btn label="New Package" icon="plus" onClick={() => setModal(true)} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
          {[
            { label: "Packages", value: totalPkgs, color: C.accent, icon: "package" },
            { label: "Chapters", value: totalChs, color: "#0EA5E9", icon: "chapter" },
            { label: "Policies", value: totalPols, color: C.accent, icon: "policy" },
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

        {/* Empty state */}
        {packages.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            background: C.card, borderRadius: 16, border: `1.5px dashed ${C.border}`,
          }}>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>No packages yet</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Create your first package to organise your policies.</div>
            <Btn label="Create Package" icon="plus" onClick={() => setModal(true)} />
          </div>
        )}

        {/* Packages */}
        {packages.map(pkg => (
          <Package 
            key={pkg.id} 
            pkg={pkg} 
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* Modal: New Package */}
      {modal && (
        <Modal title="New Package" onClose={() => setModal(false)}>
          <Field label="Package Name *">
            <input 
              style={input} 
              placeholder="e.g. ISO 27001"
              value={pkgTitle} 
              onChange={e => setPkgTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && createPackage()} 
              autoFocus 
              disabled={loading}
            />
          </Field>
          <Field label="Version">
            <input 
              style={input} 
              placeholder="e.g. 2022 (default: 1.0.0)"
              value={pkgVersion} 
              onChange={e => setPkgVersion(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Description">
            <textarea 
              style={input}
              placeholder="Optional description"
              value={pkgDescription} 
              onChange={e => setPkgDescription(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Organization">
            <input 
              style={input}
              placeholder="Optional organization"
              value={pkgOrganization} 
              onChange={e => setPkgOrganization(e.target.value)}
              disabled={loading}
            />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Btn 
              label="Cancel" 
              variant="ghost" 
              onClick={() => !loading && setModal(false)} 
            />
            <Btn 
              label={loading ? "Creating..." : "Create Package"} 
              icon="plus" 
              onClick={createPackage}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}