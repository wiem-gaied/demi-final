// politique.jsx
// Same visual design as before. All strings in English.
// Renders Core (mandatory) and Annex (optional) sections strictly per framework,
// with descriptions visible at chapter / sub-chapter / control level.

import { useState, useEffect, useCallback } from "react";
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
  close: "M18 6L6 18M6 6l12 12",
};

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  accent:  "#3B6FFF",
  purple:   "#061585",
  bg:      "#F8FAFF",
  card:    "#FFFFFF",
  border:  "#E2E8F8",
  text:    "#1E2A4A",
  muted:   "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  danger:  "#EF4444",
  chip:    "#EEF2FF",
};

// ============================================================
// Modal — Scrape framework
// ============================================================
function ScrapeFrameworkModal({ onClose, onConfirm }) {
  const [availableFrameworks, setAvailableFrameworks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [search, setSearch] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setLoadingList(true);
      setLoadError(null);
      try {
        const response = await fetch("http://localhost:3000/api/scraper/available", {
          credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.frameworks || []);
        const normalized = list.map((f, idx) => ({
          id: f.id || f.frameworkId || f.slug || `fw-${idx}`,
          name: f.name || f.title || "Untitled",
          provider: f.provider || f.source || "",
          description: f.description || "",
          versions: Array.isArray(f.versions) && f.versions.length > 0
            ? f.versions
            : (f.version ? [f.version] : ["1.0"]),
        }));
        setAvailableFrameworks(normalized);
      } catch (err) {
        console.error("Error fetching available frameworks:", err);
        setLoadError(err.message);
      } finally {
        setLoadingList(false);
      }
    };
    fetchAvailable();
  }, []);

  const selected = availableFrameworks.find(f => f.id === selectedId);

  const filtered = availableFrameworks.filter(f => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.provider || "").toLowerCase().includes(q) ||
      (f.description || "").toLowerCase().includes(q)
    );
  });

  const handleSelect = (framework) => {
    setSelectedId(framework.id);
    setSelectedVersion(framework.versions[0] || "");
  };

  const handleSubmit = async () => {
    if (!selected) {
      alert("Please select a framework to scrape");
      return;
    }
    setIsScraping(true);
    try {
      await onConfirm({
        frameworkId: selected.id,
        name: selected.name,
        provider: selected.provider,
        version: selectedVersion,
        description: selected.description,
      });
      onClose();
    } catch (error) {
      console.error("Error scraping framework:", error);
      alert("Error scraping framework: " + error.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "auto", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, width: 640, maxWidth: "95vw",
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(59,111,255,.18)",
        border: `1px solid ${C.border}`,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>
            Scrape Security Framework
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, padding: 4, borderRadius: 8,
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Select a framework. Its full hierarchy (chapters, sub-chapters, controls)
            will be scraped and stored under its own unique standard ID.
          </p>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={16} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: C.muted,
            }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search frameworks (ISO, NIST, CIS, ...)"
              disabled={loadingList}
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                border: `1.5px solid ${C.border}`, borderRadius: 10,
                fontSize: 13, outline: "none",
                background: loadingList ? C.bg : C.card,
              }}
            />
          </div>

          <div style={{
            maxHeight: 360, overflowY: "auto",
            border: `1px solid ${C.border}`, borderRadius: 10,
            marginBottom: 16, minHeight: 120,
          }}>
            {loadingList ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{
                  width: 28, height: 28, margin: "0 auto",
                  border: `3px solid ${C.border}`, borderTopColor: C.accent,
                  borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
                  Loading available frameworks...
                </div>
              </div>
            ) : loadError ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <AlertCircle size={20} color={C.danger} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>
                  Failed to load frameworks
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {loadError}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>
                {availableFrameworks.length === 0
                  ? "No frameworks available for scraping."
                  : "No frameworks match your search."}
              </div>
            ) : filtered.map((fw) => {
              const isSelected = fw.id === selectedId;
              return (
                <div
                  key={fw.id}
                  onClick={() => handleSelect(fw)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer",
                    background: isSelected ? `${C.accent}10` : "transparent",
                    borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${isSelected ? C.accent : C.border}`,
                    background: isSelected ? C.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {isSelected && <CheckCircle size={10} color="#fff" />}
                  </div>
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

          {selected && selected.versions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
                Version
              </label>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  fontSize: 14, outline: "none", background: C.card,
                }}
              >
                {selected.versions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${C.border}`,
              background: "transparent", cursor: "pointer", fontSize: 13,
            }}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!selected || isScraping || loadingList}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: (!selected || isScraping) ? C.muted : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                color: "#fff",
                cursor: (!selected || isScraping || loadingList) ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
                opacity: (!selected || loadingList) ? 0.6 : 1,
              }}
            >
              {isScraping ? "Scraping..." : "Start "}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Modal — Add custom framework
// ============================================================
function AddCustomFrameworkModal({ onClose, onConfirm }) {
  const [meta, setMeta] = useState({ name: "", version: "1.0", provider: "", description: "" });
  const [coreChapters, setCoreChapters] = useState([
    { ref_id: "", title: "", description: "", controls: [], children: [] }
  ]);
  const [annexFamilies, setAnnexFamilies] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const updateAtPath = (list, path, updater) => {
    if (path.length === 0) return updater(list);
    const [head, ...rest] = path;
    const next = [...list];
    next[head] = { ...next[head], children: updateAtPath(next[head].children || [], rest, updater) };
    return next;
  };

  const addSubChapter = (path) => {
    setCoreChapters(prev => updateAtPath(prev, path,
      (children) => [...children, { ref_id: "", title: "", description: "", controls: [], children: [] }]));
  };
  const removeChapterAt = (path) => {
    if (path.length === 1) {
      setCoreChapters(prev => prev.filter((_, i) => i !== path[0]));
      return;
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setCoreChapters(prev => updateAtPath(prev, parentPath,
      (children) => children.filter((_, i) => i !== idx)));
  };
  const updateChapterAt = (path, field, value) => {
    if (path.length === 1) {
      setCoreChapters(prev => prev.map((c, i) => i === path[0] ? { ...c, [field]: value } : c));
      return;
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setCoreChapters(prev => updateAtPath(prev, parentPath,
      (children) => children.map((c, i) => i === idx ? { ...c, [field]: value } : c)));
  };
  const addControlToChapter = (path) => {
    if (path.length === 1) {
      setCoreChapters(prev => prev.map((c, i) =>
        i === path[0] ? { ...c, controls: [...(c.controls || []), { ref_id: "", name: "", description: "" }] } : c));
      return;
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setCoreChapters(prev => updateAtPath(prev, parentPath,
      (children) => children.map((c, i) =>
        i === idx ? { ...c, controls: [...(c.controls || []), { ref_id: "", name: "", description: "" }] } : c)));
  };
  const updateControlAt = (path, ctrlIdx, field, value) => {
    const apply = (chapter) => ({
      ...chapter,
      controls: chapter.controls.map((c, i) => i === ctrlIdx ? { ...c, [field]: value } : c)
    });
    if (path.length === 1) {
      setCoreChapters(prev => prev.map((c, i) => i === path[0] ? apply(c) : c));
      return;
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setCoreChapters(prev => updateAtPath(prev, parentPath,
      (children) => children.map((c, i) => i === idx ? apply(c) : c)));
  };
  const removeControlAt = (path, ctrlIdx) => {
    const apply = (chapter) => ({
      ...chapter,
      controls: chapter.controls.filter((_, i) => i !== ctrlIdx)
    });
    if (path.length === 1) {
      setCoreChapters(prev => prev.map((c, i) => i === path[0] ? apply(c) : c));
      return;
    }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    setCoreChapters(prev => updateAtPath(prev, parentPath,
      (children) => children.map((c, i) => i === idx ? apply(c) : c)));
  };

  const addFamily = () =>
    setAnnexFamilies(prev => [...prev, { ref_id: "", name: "", description: "", controls: [] }]);
  const removeFamily = (idx) =>
    setAnnexFamilies(prev => prev.filter((_, i) => i !== idx));
  const updateFamily = (idx, field, value) =>
    setAnnexFamilies(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  const addAnnexControl = (idx) =>
    setAnnexFamilies(prev => prev.map((f, i) =>
      i === idx ? { ...f, controls: [...f.controls, { ref_id: "", name: "", description: "" }] } : f));
  const updateAnnexControl = (idx, ctrlIdx, field, value) =>
    setAnnexFamilies(prev => prev.map((f, i) => i === idx ? {
      ...f, controls: f.controls.map((c, j) => j === ctrlIdx ? { ...c, [field]: value } : c)
    } : f));
  const removeAnnexControl = (idx, ctrlIdx) =>
    setAnnexFamilies(prev => prev.map((f, i) => i === idx ? {
      ...f, controls: f.controls.filter((_, j) => j !== ctrlIdx)
    } : f));

  const validateChapter = (ch) => {
    if (!ch.title?.trim()) return "Each core chapter must have a title";
    for (const c of ch.controls || []) {
      if (!c.name?.trim()) return "Each control must have a name";
    }
    for (const sub of ch.children || []) {
      const err = validateChapter(sub);
      if (err) return err;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!meta.name.trim()) return alert("Framework name is required");
    if (coreChapters.length === 0) return alert("At least one core chapter is required");
    for (const ch of coreChapters) {
      const err = validateChapter(ch);
      if (err) return alert(err);
    }
    for (const f of annexFamilies) {
      if (!f.name?.trim()) return alert("Each annex family must have a name");
      for (const c of f.controls) {
        if (!c.name?.trim()) return alert("Each annex control must have a name");
      }
    }

    setSubmitting(true);
    try {
      await onConfirm({
        name: meta.name,
        version: meta.version,
        provider: meta.provider,
        description: meta.description,
        coreChapters,
        annexFamilies,
      });
      onClose();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderChapter = (ch, path, depth = 0) => (
    <div key={path.join("-")} style={{
      marginLeft: depth * 16, marginBottom: 10,
      padding: 12, border: `1.5px solid ${C.border}`, borderRadius: 10,
      background: depth === 0 ? `${C.accent}07` : C.card,
    }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.purple }}>
          {depth === 0 ? "Chapter" : `Sub-chapter L${depth}`}
        </span>
        <button onClick={() => removeChapterAt(path)} style={{
          marginLeft: "auto", background: "transparent", border: `1px solid ${C.danger}`,
          color: C.danger, padding: "2px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer",
        }}>Remove</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginBottom: 6 }}>
        <input placeholder="Ref (e.g. 4.1)" value={ch.ref_id}
          onChange={(e) => updateChapterAt(path, "ref_id", e.target.value)}
          style={{ padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
        <input placeholder="Title" value={ch.title}
          onChange={(e) => updateChapterAt(path, "title", e.target.value)}
          style={{ padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
      </div>
      <textarea placeholder="Description (optional)" value={ch.description} rows={2}
        onChange={(e) => updateChapterAt(path, "description", e.target.value)}
        style={{ width: "100%", padding: "6px 10px", border: `1.5px solid ${C.border}`,
                 borderRadius: 8, fontSize: 12, marginBottom: 8, resize: "vertical" }} />

      {(ch.controls || []).map((ctrl, ci) => (
        <div key={ci} style={{
          display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 6,
          marginBottom: 4, padding: 6, background: "#F0FDF4", borderRadius: 6,
        }}>
          <input placeholder="Ref" value={ctrl.ref_id}
            onChange={(e) => updateControlAt(path, ci, "ref_id", e.target.value)}
            style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
          <input placeholder="Control name" value={ctrl.name}
            onChange={(e) => updateControlAt(path, ci, "name", e.target.value)}
            style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
          <input placeholder="Description" value={ctrl.description}
            onChange={(e) => updateControlAt(path, ci, "description", e.target.value)}
            style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
          <button onClick={() => removeControlAt(path, ci)} style={{
            background: "transparent", border: "none", color: C.danger,
            cursor: "pointer", padding: "0 6px",
          }}><X size={12} /></button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={() => addControlToChapter(path)} style={{
          padding: "4px 10px", border: `1px dashed ${C.success}`, background: "transparent",
          color: C.success, borderRadius: 6, fontSize: 11, cursor: "pointer",
        }}>+ Control</button>
        <button onClick={() => addSubChapter(path)} style={{
          padding: "4px 10px", border: `1px dashed ${C.purple}`, background: "transparent",
          color: C.purple, borderRadius: 6, fontSize: 11, cursor: "pointer",
        }}>+ Sub-chapter</button>
      </div>

      {(ch.children || []).map((sub, i) => renderChapter(sub, [...path, i], depth + 1))}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "auto", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: 16, width: 820, maxWidth: "95vw",
        maxHeight: "92vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(59,111,255,.18)",
        border: `1px solid ${C.border}`,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
          position: "sticky", top: 0, background: C.card, zIndex: 1,
        }}>
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>
            Add Custom Framework
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4,
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Build your own framework. The Core part is mandatory and cannot be excepted.
            The Annex part is optional and supports exceptions.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <input placeholder="Framework name *" value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              style={{ padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13 }} />
            <input placeholder="Version" value={meta.version}
              onChange={(e) => setMeta({ ...meta, version: e.target.value })}
              style={{ padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13 }} />
            <input placeholder="Provider" value={meta.provider}
              onChange={(e) => setMeta({ ...meta, provider: e.target.value })}
              style={{ padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13 }} />
          </div>
          <textarea placeholder="Description (optional)" value={meta.description} rows={2}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`,
                     borderRadius: 10, fontSize: 13, marginBottom: 16, resize: "vertical" }} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 15, fontWeight: 700, color: C.accent }}>
                Core Chapters <span style={{ fontSize: 11, color: C.danger }}>* mandatory</span>
              </span>
              <button onClick={() =>
                setCoreChapters(prev => [...prev, { ref_id: "", title: "", description: "", controls: [], children: [] }])}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>+ Chapter</button>
            </div>
            {coreChapters.map((ch, i) => renderChapter(ch, [i], 0))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 15, fontWeight: 700, color: C.purple }}>
                Annex Families <span style={{ fontSize: 11, color: C.muted }}>(optional, exceptions allowed)</span>
              </span>
              <button onClick={addFamily} style={{
                padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.purple}`,
                background: "transparent", color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>+ Family</button>
            </div>
            {annexFamilies.map((fam, fi) => (
              <div key={fi} style={{
                marginBottom: 10, padding: 12, border: `1.5px solid ${C.border}`,
                borderRadius: 10, background: `${C.purple}07`,
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.purple }}>Family</span>
                  <button onClick={() => removeFamily(fi)} style={{
                    marginLeft: "auto", background: "transparent", border: `1px solid ${C.danger}`,
                    color: C.danger, padding: "2px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                  }}>Remove</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginBottom: 6 }}>
                  <input placeholder="Ref (e.g. A.5)" value={fam.ref_id}
                    onChange={(e) => updateFamily(fi, "ref_id", e.target.value)}
                    style={{ padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <input placeholder="Family name" value={fam.name}
                    onChange={(e) => updateFamily(fi, "name", e.target.value)}
                    style={{ padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                </div>
                <textarea placeholder="Description (optional)" value={fam.description} rows={2}
                  onChange={(e) => updateFamily(fi, "description", e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: `1.5px solid ${C.border}`,
                           borderRadius: 8, fontSize: 12, marginBottom: 8, resize: "vertical" }} />
                {fam.controls.map((ctrl, ci) => (
                  <div key={ci} style={{
                    display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 6,
                    marginBottom: 4, padding: 6, background: "#F0FDF4", borderRadius: 6,
                  }}>
                    <input placeholder="Ref" value={ctrl.ref_id}
                      onChange={(e) => updateAnnexControl(fi, ci, "ref_id", e.target.value)}
                      style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                    <input placeholder="Control name" value={ctrl.name}
                      onChange={(e) => updateAnnexControl(fi, ci, "name", e.target.value)}
                      style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                    <input placeholder="Description" value={ctrl.description}
                      onChange={(e) => updateAnnexControl(fi, ci, "description", e.target.value)}
                      style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                    <button onClick={() => removeAnnexControl(fi, ci)} style={{
                      background: "transparent", border: "none", color: C.danger, cursor: "pointer", padding: "0 6px",
                    }}><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => addAnnexControl(fi)} style={{
                  padding: "4px 10px", border: `1px dashed ${C.success}`, background: "transparent",
                  color: C.success, borderRadius: 6, fontSize: 11, cursor: "pointer", marginTop: 6,
                }}>+ Control</button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${C.border}`,
              background: "transparent", cursor: "pointer", fontSize: 13,
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff", cursor: submitting ? "wait" : "pointer", fontSize: 13, fontWeight: 600,
            }}>{submitting ? "Saving..." : "Create Framework"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tree components
// ============================================================
const hasMeaningfulText = (s) => {
  if (!s) return false;
  const t = String(s).trim();
  return t.length > 0 && t !== "Untitled" && t !== "No description provided";
};

// The hierarchy stores sub-chapters in `children` and controls in `items`
// as two separate arrays. Rendering children-then-items made e.g. "7.5"
// appear before "7.1..7.4" and "9.2/9.3" before "9.1". This natural
// ref_id comparator + merge interleaves them in the real numbering order.
// Pure ref math → works for any framework (core "7.1", annex "A.5.1", …).
function refSegments(ref) {
  return String(ref || "").split(".").map(s => s.trim()).filter(Boolean);
}
function compareRefIds(a, b) {
  const sa = refSegments(a), sb = refSegments(b);
  const annexA = sa.length > 0 && isNaN(Number(sa[0]));
  const annexB = sb.length > 0 && isNaN(Number(sb[0]));
  if (annexA !== annexB) return annexA ? 1 : -1;            // core before annex
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const x = sa[i], y = sb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x), ny = Number(y);
    if (!isNaN(nx) && !isNaN(ny)) { if (nx !== ny) return nx - ny; }
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function orderedTreeNodes(children, items) {
  const merged = [
    ...(children || []).map(node => ({ kind: "chapter", node })),
    ...(items || []).map(node => ({ kind: "control", node })),
  ];
  merged.sort((a, b) => compareRefIds(a.node.ref_id, b.node.ref_id));
  return merged;
}

const ControlItem = ({ item, isExcepted, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDesc = hasMeaningfulText(item.description);
  const effectivelyExcepted = isParentExcepted || isExcepted;

  const handleAddException = async () => {
    if (!exceptionReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddException({
        id: String(item.id),
        ref_id: item.ref_id,
        name: item.name,
        title: item.name
      }, exceptionReason, standardId);
      setShowExceptionModal(false);
      setExceptionReason("");
      if (onRefresh) await onRefresh();
    } catch (error) {
      alert("Error adding exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginLeft: 24, marginBottom: 16, paddingLeft: 14, borderLeft: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: effectivelyExcepted ? C.muted : C.text }}>
              {item.ref_id || "N/A"} - {item.name}
              {effectivelyExcepted && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: C.muted }}>
                  · {isParentExcepted ? "Inherited from chapter" : "Exception"}
                </span>
              )}
            </div>
            {hasDesc && (
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                {item.description}
              </p>
            )}
          </div>
          {isAnnex && !effectivelyExcepted && !isParentExcepted && (
            <button onClick={() => setShowExceptionModal(true)} style={{
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer", flexShrink: 0,
            }}>Add Exception</button>
          )}
        </div>
      </div>

      {showExceptionModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowExceptionModal(false)}>
          <div style={{
            background: C.card, borderRadius: 16, width: 440, maxWidth: "95vw",
            boxShadow: "0 24px 60px rgba(59,111,255,.18)",
            border: `1px solid ${C.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>Add Exception</span>
              <button onClick={() => setShowExceptionModal(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, padding: 4, borderRadius: 8,
              }}><Icon d={icons.close} size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ marginBottom: 16, fontSize: 14, color: C.text }}>
                Add exception for <strong>{item.name}</strong>
              </p>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Reason for exception..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  fontSize: 14, outline: "none", resize: "vertical",
                  marginBottom: 16,
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowExceptionModal(false)} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "transparent", cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
                <button onClick={handleAddException} disabled={isSubmitting} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: C.accent, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
                }}>
                  {isSubmitting ? "Adding..." : "Add Exception"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SubChapter = ({ sub, exceptedControlIds, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasDesc = hasMeaningfulText(sub.description);
  const isExcepted = exceptedControlIds.has(String(sub.id));
  const effectivelyExcepted = isParentExcepted || isExcepted;

  const handleAddException = async () => {
    if (!exceptionReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddException({
        id: String(sub.id),
        ref_id: sub.ref_id,
        title: sub.title,
        items: sub.items
      }, exceptionReason, standardId);
      setShowExceptionModal(false);
      setExceptionReason("");
      if (onRefresh) await onRefresh();
    } catch (error) {
      alert("Error adding exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginLeft: 20, marginBottom: 14 }}>
        <div onClick={() => setOpen(!open)} style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 8, cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
            <ChevronRight size={13} style={{ marginTop: 3, flexShrink: 0, transition: "0.15s", color: C.muted, transform: open ? "rotate(90deg)" : "rotate(0)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: effectivelyExcepted ? C.muted : C.text }}>
                {sub.ref_id} - {sub.title}
                {effectivelyExcepted && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: C.muted }}>· Exception</span>
                )}
              </div>
              {hasDesc && (
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                  {sub.description}
                </p>
              )}
            </div>
          </div>
          {isAnnex && !effectivelyExcepted && !isParentExcepted && (
            <button onClick={(e) => { e.stopPropagation(); setShowExceptionModal(true); }} style={{
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer", flexShrink: 0,
            }}>Add Exception</button>
          )}
        </div>

        {open && (
          <div style={{ marginLeft: 16, marginTop: 10 }}>
            {orderedTreeNodes(sub.children, sub.items).map(({ kind, node }) =>
              kind === "chapter" ? (
                <SubChapter
                  key={node.id}
                  sub={node}
                  exceptedControlIds={exceptedControlIds}
                  onAddException={onAddException}
                  isAnnex={isAnnex}
                  isParentExcepted={effectivelyExcepted}
                  standardId={standardId}
                  onRefresh={onRefresh}
                />
              ) : (
                <ControlItem
                  key={node.id}
                  item={node}
                  isExcepted={exceptedControlIds.has(String(node.id))}
                  onAddException={onAddException}
                  isAnnex={isAnnex}
                  isParentExcepted={effectivelyExcepted}
                  standardId={standardId}
                  onRefresh={onRefresh}
                />
              )
            )}
          </div>
        )}
      </div>

      {showExceptionModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowExceptionModal(false)}>
          <div style={{
            background: C.card, borderRadius: 16, width: 440, maxWidth: "95vw",
            boxShadow: "0 24px 60px rgba(59,111,255,.18)",
            border: `1px solid ${C.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>Add Exception for Sub-Chapter</span>
              <button onClick={() => setShowExceptionModal(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, padding: 4, borderRadius: 8,
              }}><Icon d={icons.close} size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ marginBottom: 16, fontSize: 14, color: C.text }}>
                Add exception for <strong>{sub.title}</strong>
              </p>
              <p style={{ marginBottom: 16, fontSize: 12, color: C.muted }}>
                This will also add exceptions for all {sub.items?.length || 0} controls.
              </p>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Reason for exception..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  fontSize: 14, outline: "none", resize: "vertical",
                  marginBottom: 16,
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowExceptionModal(false)} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "transparent", cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
                <button onClick={handleAddException} disabled={isSubmitting} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: C.accent, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
                }}>
                  {isSubmitting ? "Adding..." : "Add Exception"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ChapterSection = ({ chapter, exceptedControlIds, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDesc = hasMeaningfulText(chapter.description);
  const isExcepted = exceptedControlIds.has(String(chapter.id));
  const effectivelyExcepted = isParentExcepted || isExcepted;

  const handleAddException = async () => {
    if (!exceptionReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddException({
        id: String(chapter.id),
        ref_id: chapter.ref_id,
        title: chapter.title,
        children: chapter.children,
        items: chapter.items
      }, exceptionReason, standardId);
      setShowExceptionModal(false);
      setExceptionReason("");
      if (onRefresh) await onRefresh();
    } catch (error) {
      alert("Error adding chapter exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 18, marginTop: 4 }}>
        <div onClick={() => setOpen(!open)} style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 8, cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
            <ChevronDown size={15} style={{ marginTop: 2, flexShrink: 0, transition: "0.15s", color: C.muted, transform: open ? "rotate(0)" : "rotate(-90deg)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: effectivelyExcepted ? C.muted : C.text }}>
                {chapter.ref_id} - {chapter.title}
                {effectivelyExcepted && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: C.muted }}>· Exception</span>
                )}
              </div>
              {hasDesc && (
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                  {chapter.description}
                </p>
              )}
            </div>
          </div>
          {isAnnex && !effectivelyExcepted && !isParentExcepted && (
            <button onClick={(e) => { e.stopPropagation(); setShowExceptionModal(true); }} style={{
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer", flexShrink: 0,
            }}>Add Exception</button>
          )}
        </div>

        {open && (
          <div style={{ marginLeft: 16, marginTop: 12 }}>
            {orderedTreeNodes(chapter.children, chapter.items).map(({ kind, node }) =>
              kind === "chapter" ? (
                <SubChapter
                  key={node.id}
                  sub={node}
                  exceptedControlIds={exceptedControlIds}
                  onAddException={onAddException}
                  isAnnex={isAnnex}
                  isParentExcepted={effectivelyExcepted}
                  standardId={standardId}
                  onRefresh={onRefresh}
                />
              ) : (
                <ControlItem
                  key={node.id}
                  item={node}
                  isExcepted={exceptedControlIds.has(String(node.id))}
                  onAddException={onAddException}
                  isAnnex={isAnnex}
                  isParentExcepted={effectivelyExcepted}
                  standardId={standardId}
                  onRefresh={onRefresh}
                />
              )
            )}
          </div>
        )}
      </div>

      {showExceptionModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowExceptionModal(false)}>
          <div style={{
            background: C.card, borderRadius: 16, width: 440, maxWidth: "95vw",
            boxShadow: "0 24px 60px rgba(59,111,255,.18)",
            border: `1px solid ${C.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>Add Exception for Chapter</span>
              <button onClick={() => setShowExceptionModal(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, padding: 4, borderRadius: 8,
              }}><Icon d={icons.close} size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ marginBottom: 16, fontSize: 14, color: C.text }}>
                Add exception for chapter <strong>{chapter.title}</strong>
              </p>
              <textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Reason for exception..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1.5px solid ${C.border}`, borderRadius: 10,
                  fontSize: 14, outline: "none", resize: "vertical",
                  marginBottom: 16,
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowExceptionModal(false)} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "transparent", cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
                <button onClick={handleAddException} disabled={isSubmitting} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: C.accent, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
                }}>
                  {isSubmitting ? "Adding..." : "Add Exception"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Level1Section = ({ section, exceptedControlIds, onAddException, standardId, onRefresh }) => {
  const [open, setOpen] = useState(true);
  const isAnnex = section.isAnnex === true || section?.title?.toLowerCase()?.includes("annex");

  const hasContent = (section.children && section.children.length > 0) ||
                     (section.items && section.items.length > 0);

  return (
    <div style={{ marginBottom: 18 }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "12px 14px", borderRadius: 8, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        background: "#F8FAFF", border: `1px solid ${C.border}`,
      }}>
        <ChevronDown size={14} color={C.muted} style={{ transform: open ? "rotate(0)" : "rotate(-90deg)", flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{section.title}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.muted, marginLeft: 8,
          padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 12,
        }}>
          {isAnnex ? "Optional · exceptions allowed" : "Mandatory"}
        </span>
      </div>

      {open && (
        <div style={{ paddingLeft: 12, marginTop: 6 }}>
          {hasMeaningfulText(section.description) && (
            <p style={{ fontSize: 12, color: C.muted, padding: "8px 4px", margin: 0, lineHeight: 1.5 }}>
              {section.description}
            </p>
          )}
          {!hasContent && (
            <div style={{ padding: "20px 12px", color: C.muted, fontSize: 12, fontStyle: "italic" }}>
              {isAnnex
                ? "This framework has no annex content."
                : "No core chapters found."}
            </div>
          )}
          {orderedTreeNodes(section.children, section.items).map(({ kind, node }) =>
            kind === "chapter" ? (
              <ChapterSection
                key={node.id}
                chapter={node}
                exceptedControlIds={exceptedControlIds}
                onAddException={onAddException}
                isAnnex={isAnnex}
                isParentExcepted={false}
                standardId={standardId}
                onRefresh={onRefresh}
              />
            ) : (
              <ControlItem
                key={node.id}
                item={node}
                isExcepted={exceptedControlIds.has(String(node.id))}
                onAddException={onAddException}
                isAnnex={isAnnex}
                isParentExcepted={false}
                standardId={standardId}
                onRefresh={onRefresh}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PackageCard
// ============================================================
const PackageCard = ({ standard, onImportFramework, onUnimportFramework, onAddException, isImported, refreshExceptions }) => {
  const [open, setOpen] = useState(isImported);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadExceptions = useCallback(async () => {
    if (!isImported || !standard?.id) return;
    try {
      const data = await refreshExceptions();
      setExceptions(data || []);
    } catch (error) {
      console.error("Error loading exceptions:", error);
    }
  }, [isImported, standard?.id, refreshExceptions]);

  useEffect(() => {
    if (!isImported) return;

    const loadHierarchy = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/api/ciso/packages/${standard.id}/hierarchy`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();

        // The backend always returns a normalized { hierarchy: [Core, Annex] } shape now.
        if (data && Array.isArray(data.hierarchy)) {
          setHierarchy(data);
        } else {
          console.warn("Unexpected hierarchy response:", data);
          setHierarchy({ hierarchy: [] });
        }
      } catch (error) {
        console.error("Error loading hierarchy:", error);
        setHierarchy({ hierarchy: [] });
      } finally {
        setLoading(false);
      }
    };

    loadHierarchy();
    loadExceptions();
  }, [standard.id, isImported, refreshKey, loadExceptions]);

  const handleRefresh = useCallback(async () => {
    await loadExceptions();
    setRefreshKey(prev => prev + 1);
  }, [loadExceptions]);

  const exceptedControlIds = new Set(
    exceptions.map(e => String(e.policyId || e.entity_id || e.id))
  );

  const totalControls = standard.controls_count || 0;
  const exceptionsCount = exceptions.length;

  return (
    <div style={{
      background: C.card, borderRadius: 14,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 2px 16px rgba(59,111,255,.07)",
      marginBottom: 20, overflow: "hidden",
    }}>
      <div onClick={() => isImported && setOpen(!open)} style={{
        background: C.card,
        borderBottom: open ? `1px solid ${C.border}` : "none",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        cursor: isImported ? "pointer" : "default",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: "#F8FAFF", border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Shield size={17} color={C.muted} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 800, color: C.text }}>
              {standard.name}
            </div>
            {isImported && (
              <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 12 }}>
                Imported
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {standard.version && <span>v{standard.version} · </span>}
            {standard.provider && <span>{standard.provider} · </span>}
            {totalControls} controls
            {isImported && exceptionsCount > 0 && (
              <span style={{ marginLeft: 8, color: C.muted }}>· {exceptionsCount} exceptions</span>
            )}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); isImported ? onUnimportFramework(standard) : onImportFramework(standard); }} style={{
          padding: "6px 14px", borderRadius: 8,
          border: `1px solid ${isImported ? C.border : C.accent}`,
          background: isImported ? "transparent" : C.accent,
          color: isImported ? C.muted : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          {isImported ? "Remove" : "+ Import"}
        </button>
        {isImported && (
          <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s", color: C.muted }} />
        )}
      </div>

      {isImported && open && (
        <div style={{ padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            </div>
          ) : hierarchy?.hierarchy?.length > 0 ? (
            hierarchy.hierarchy.map((section) => (
              <Level1Section
                key={section.id}
                section={section}
                exceptedControlIds={exceptedControlIds}
                onAddException={onAddException}
                standardId={standard.id}
                onRefresh={handleRefresh}
              />
            ))
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
export default function Policies() {
  const [availableFrameworks, setAvailableFrameworks] = useState([]);
  const [importedFrameworkIds, setImportedFrameworkIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removeModal, setRemoveModal] = useState(null);
  const [addFrameworkModal, setAddFrameworkModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addCustomModal, setAddCustomModal] = useState(false);

  const fetchAllFrameworks = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/ciso/packages", {
        credentials: "include"
      });
      if (response.ok) {
        const frameworks = await response.json();
        setAvailableFrameworks(frameworks.map(fw => ({
          ...fw,
          source: 'scraped',
          type: 'scraped',
          id: String(fw.id)
        })));
      }
    } catch (error) {
      console.error("Error fetching frameworks:", error);
    }
  };

  const fetchImportedFrameworks = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/framauditor/imported-policies", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setImportedFrameworkIds(new Set(data.map(pkg => String(pkg.id))));
      }
    } catch (error) {
      console.error("Error fetching imported frameworks:", error);
    }
  };

  const fetchExceptions = useCallback(async (standardId) => {
    if (!standardId) return [];
    try {
      const response = await fetch(`http://localhost:3000/api/framauditor/exceptions/${standardId}`, {
        credentials: "include"
      });
      if (response.ok) return await response.json();
    } catch (error) {
      console.error("Error fetching exceptions:", error);
    }
    return [];
  }, []);

  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllFrameworks();
      await fetchImportedFrameworks();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await refreshAllData();
      setLoading(false);
    };
    loadAllData();
  }, [refreshAllData]);

  const handleImportFramework = async (framework) => {
    try {
      if (!framework?.id) throw new Error("Invalid framework ID");
      const response = await fetch("http://localhost:3000/api/framauditor/import-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          standardId: String(framework.id),
          title: framework.name,
          version: framework.version || "1.0"
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }
      await fetchImportedFrameworks();
      alert("Framework imported successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUnimportFramework = async (framework) => {
    try {
      const response = await fetch("http://localhost:3000/api/framauditor/unimport-policy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policyId: framework.id })
      });
      if (!response.ok) throw new Error("Unimport failed");
      await fetchImportedFrameworks();
      alert("Framework removed successfully!");
    } catch (error) {
      alert("Error removing framework: " + error.message);
    }
  };

  const handleAddFramework = async (scrapeData) => {
    try {
      const response = await fetch("http://localhost:3000/api/scraper/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(scrapeData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to scrape framework");
      }
      const result = await response.json();
      await refreshAllData();
      if (result.id) {
        await handleImportFramework({
          id: result.id,
          name: scrapeData.name,
          version: scrapeData.version,
          source: 'scraped',
          type: 'scraped'
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const handleAddCustomFramework = async (payload) => {
    const response = await fetch("http://localhost:3000/api/framauditor/add-custom-framework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      alert(`Backend error ${response.status}: ${text}`);
      throw new Error(text || "Failed to create framework");
    }
    const result = await response.json();
    await refreshAllData();
    if (result.id) {
      await handleImportFramework({ id: result.id, name: payload.name, version: payload.version });
    }
  };

  const handleAddException = async (item, reason, standardId) => {
    try {
      let level = "control";
      if (item.children) level = "chapter";
      const response = await fetch("http://localhost:3000/api/framauditor/add-exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          policyId: String(item.id),
          level,
          title: item.title || item.name,
          reason,
          standardId
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add exception");
      }
      alert("Exception added successfully!");
    } catch (error) {
      alert(error.message);
      throw error;
    }
  };

  const filteredFrameworks = availableFrameworks.filter(fw =>
    fw.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: #3B6FFF !important; box-shadow: 0 0 0 3px rgba(59,111,241,.13); }
      `}</style>

      <div style={{
        padding: "0 36px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64, position: "sticky",
        top: 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.border}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ color: "#0F172A", fontSize: "26px", fontWeight: "800" }}>
            Policies Library
          </span>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: C.muted
            }} />
            <input
              placeholder="Search frameworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px", borderRadius: 10,
                border: `1.5px solid ${C.border}`, width: 250,
                fontSize: 13, background: C.card
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={refreshAllData}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", cursor: refreshing ? "wait" : "pointer",
              fontSize: 13, color: C.muted
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setAddFrameworkModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}
          >
            <Plus size={16} /> Import Framework
          </button>
          <button
            onClick={() => setAddCustomModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 10,
              border: `1.5px solid ${C.accent}`,
              background: "transparent", color: C.accent,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={16} /> Add Custom Framework
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.chip, padding: "4px 12px", borderRadius: 20
          }}>
            <CheckCircle size={12} color={C.success} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>
              {importedFrameworkIds.size} imported
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{
              width: 48, height: 48,
              border: `3px solid ${C.border}`, borderTopColor: C.accent,
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
              margin: "0 auto"
            }} />
          </div>
        )}

        {!loading && filteredFrameworks.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <Database size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p>No frameworks found</p>
          </div>
        )}

        {!loading && filteredFrameworks.map(fw => (
          <PackageCard
            key={fw.id}
            standard={fw}
            isImported={importedFrameworkIds.has(fw.id)}
            onImportFramework={handleImportFramework}
            onUnimportFramework={(fw) => setRemoveModal({ target: fw })}
            onAddException={handleAddException}
            refreshExceptions={async () => fetchExceptions(fw.id)}
          />
        ))}
      </div>

      {addCustomModal && (
        <AddCustomFrameworkModal
          onClose={() => setAddCustomModal(false)}
          onConfirm={handleAddCustomFramework}
        />
      )}
      {addFrameworkModal && (
        <ScrapeFrameworkModal
          onClose={() => setAddFrameworkModal(false)}
          onConfirm={handleAddFramework}
        />
      )}

      {removeModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(10,20,50,.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setRemoveModal(null)}>
          <div style={{
            background: C.card, borderRadius: 16, width: 440, maxWidth: "95vw",
            boxShadow: "0 24px 60px rgba(59,111,255,.18)", border: `1px solid ${C.border}`
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.danger }}>
                Remove Framework
              </span>
            </div>
            <div style={{ padding: 24 }}>
              <p>Remove <strong>{removeModal.target?.name}</strong> from your library?</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                This will also remove all exceptions for this framework.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  onClick={() => setRemoveModal(null)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "transparent", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleUnimportFramework(removeModal.target);
                    setRemoveModal(null);
                  }}
                  style={{
                    padding: "8px 20px", borderRadius: 8, border: "none",
                    background: C.danger, color: "#fff", cursor: "pointer"
                  }}
                >
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}