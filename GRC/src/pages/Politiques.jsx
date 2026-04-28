import { useState, useEffect, useCallback } from "react";
import { Shield, Search, ChevronDown, ChevronRight, Plus, CheckCircle, X, AlertCircle, Database } from "lucide-react";

// ── Icons ──────────────────────────────────────────────────────────────────
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
  upload:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  database:  "M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v10c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3",
};

// ── Palette ──────────────────────────────────────────────────────────────────
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
  chip:     "#EEF2FF",
};

// ── Modal pour ajouter un framework ─────────────────────────────────────────
function AddFrameworkModal({ onClose, onConfirm }) {
  const [frameworkData, setFrameworkData] = useState({
    name: "",
    version: "1.0",
    description: "",
    provider: "",
    hierarchy: []
  });
  const [isAdding, setIsAdding] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [useJsonMode, setUseJsonMode] = useState(false);

  const addChapter = () => {
    setFrameworkData({
      ...frameworkData,
      hierarchy: [
        ...frameworkData.hierarchy,
        { ref_id: "", title: "", description: "", children: [], items: [] }
      ]
    });
  };

  const removeChapter = (index) => {
    const newHierarchy = frameworkData.hierarchy.filter((_, i) => i !== index);
    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
  };

  const addSubChapter = (chapterIndex) => {
    const newHierarchy = [...frameworkData.hierarchy];
    if (!newHierarchy[chapterIndex].children) newHierarchy[chapterIndex].children = [];
    newHierarchy[chapterIndex].children.push({ 
      ref_id: "", 
      title: "", 
      description: "", 
      items: [] 
    });
    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
  };

  const removeSubChapter = (chapterIndex, subChapterIndex) => {
    const newHierarchy = [...frameworkData.hierarchy];
    newHierarchy[chapterIndex].children = newHierarchy[chapterIndex].children.filter((_, i) => i !== subChapterIndex);
    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
  };

  const addControl = (chapterIndex, subChapterIndex = null) => {
    const newHierarchy = [...frameworkData.hierarchy];
    if (subChapterIndex !== null) {
      if (!newHierarchy[chapterIndex].children[subChapterIndex].items) {
        newHierarchy[chapterIndex].children[subChapterIndex].items = [];
      }
      newHierarchy[chapterIndex].children[subChapterIndex].items.push({ 
        ref_id: "", 
        name: "", 
        description: "" 
      });
    } else {
      if (!newHierarchy[chapterIndex].items) newHierarchy[chapterIndex].items = [];
      newHierarchy[chapterIndex].items.push({ 
        ref_id: "", 
        name: "", 
        description: "" 
      });
    }
    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
  };

  const removeControl = (chapterIndex, controlIndex, subChapterIndex = null) => {
    const newHierarchy = [...frameworkData.hierarchy];
    if (subChapterIndex !== null) {
      newHierarchy[chapterIndex].children[subChapterIndex].items = 
        newHierarchy[chapterIndex].children[subChapterIndex].items.filter((_, i) => i !== controlIndex);
    } else {
      newHierarchy[chapterIndex].items = newHierarchy[chapterIndex].items.filter((_, i) => i !== controlIndex);
    }
    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setFrameworkData({
        name: parsed.name || parsed.framework?.name || "",
        version: parsed.version || parsed.framework?.version || "1.0",
        description: parsed.description || parsed.framework?.description || "",
        provider: parsed.provider || parsed.framework?.provider || "",
        hierarchy: parsed.hierarchy || parsed.framework?.hierarchy || []
      });
      setUseJsonMode(false);
      setJsonInput("");
    } catch (error) {
      alert("Invalid JSON format: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!frameworkData.name.trim()) {
      alert("Framework name is required");
      return;
    }
    
    setIsAdding(true);
    try {
      await onConfirm(frameworkData);
      onClose();
    } catch (error) {
      console.error("Error adding framework:", error);
      alert("Error adding framework: " + error.message);
    } finally {
      setIsAdding(false);
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
        background: C.card, borderRadius: 16, width: 700, maxWidth: "95vw",
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(59,111,255,.18)",
        border: `1px solid ${C.border}`,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.text }}>
            <Database size={18} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
            Add Security Framework
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, padding: 4, borderRadius: 8,
          }}><Icon d={icons.close} size={18} /></button>
        </div>
        
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
            <button
              onClick={() => setUseJsonMode(false)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none",
                background: !useJsonMode ? C.accent : "transparent",
                color: !useJsonMode ? "#fff" : C.muted,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setUseJsonMode(true)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none",
                background: useJsonMode ? C.accent : "transparent",
                color: useJsonMode ? "#fff" : C.muted,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              Import JSON
            </button>
          </div>

          {useJsonMode ? (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                Paste Framework JSON
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"name": "ISO 27001:2022", "version": "2022", "hierarchy": [...]}'
                style={{
                  width: "100%", height: 300,
                  padding: 12, border: `1.5px solid ${C.border}`,
                  borderRadius: 10, fontSize: 12, fontFamily: "monospace",
                  resize: "vertical", outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setUseJsonMode(false)} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "transparent", cursor: "pointer",
                }}>Cancel</button>
                <button onClick={handleJsonImport} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff", cursor: "pointer",
                }}>Import JSON</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
                  Framework Name *
                </label>
                <input
                  type="text"
                  value={frameworkData.name}
                  onChange={(e) => setFrameworkData({ ...frameworkData, name: e.target.value })}
                  placeholder="e.g., ISO 27001:2022, NIST CSF 2.0"
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: `1.5px solid ${C.border}`, borderRadius: 10,
                    fontSize: 14, outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Version</label>
                  <input
                    type="text"
                    value={frameworkData.version}
                    onChange={(e) => setFrameworkData({ ...frameworkData, version: e.target.value })}
                    placeholder="1.0"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      fontSize: 14, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Provider</label>
                  <input
                    type="text"
                    value={frameworkData.provider}
                    onChange={(e) => setFrameworkData({ ...frameworkData, provider: e.target.value })}
                    placeholder="ISO, NIST, CIS, etc."
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: `1.5px solid ${C.border}`, borderRadius: 10,
                      fontSize: 14, outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Description</label>
                <textarea
                  value={frameworkData.description}
                  onChange={(e) => setFrameworkData({ ...frameworkData, description: e.target.value })}
                  placeholder="Framework description..."
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: `1.5px solid ${C.border}`, borderRadius: 10,
                    fontSize: 14, outline: "none", resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Hierarchy</label>
                  <button
                    onClick={addChapter}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "4px 12px", borderRadius: 6, border: `1px dashed ${C.accent}`,
                      background: "transparent", color: C.accent, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    <Plus size={12} /> Add Chapter
                  </button>
                </div>

                {frameworkData.hierarchy.map((chapter, chIdx) => (
                  <div key={chIdx} style={{
                    border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: 12, marginBottom: 12, background: C.bg,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>Chapter {chIdx + 1}</span>
                      <button onClick={() => removeChapter(chIdx)} style={{ color: C.danger, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Remove</button>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                      <input
                        type="text"
                        value={chapter.ref_id}
                        onChange={(e) => {
                          const newHierarchy = [...frameworkData.hierarchy];
                          newHierarchy[chIdx].ref_id = e.target.value;
                          setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                        }}
                        placeholder="Ref ID"
                        style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => {
                          const newHierarchy = [...frameworkData.hierarchy];
                          newHierarchy[chIdx].title = e.target.value;
                          setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                        }}
                        placeholder="Title"
                        style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    
                    <textarea
                      value={chapter.description}
                      onChange={(e) => {
                        const newHierarchy = [...frameworkData.hierarchy];
                        newHierarchy[chIdx].description = e.target.value;
                        setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                      }}
                      placeholder="Description"
                      rows={2}
                      style={{ width: "100%", padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, marginBottom: 10 }}
                    />

                    {/* Sub-chapters */}
                    <div style={{ marginTop: 10, marginLeft: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Sub-chapters</span>
                        <button onClick={() => addSubChapter(chIdx)} style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>+ Add Sub-chapter</button>
                      </div>
                      
                      {(chapter.children || []).map((subChapter, subIdx) => (
                        <div key={subIdx} style={{
                          border: `1px solid ${C.border}`, borderRadius: 8,
                          padding: 10, marginBottom: 10, background: C.card,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>Sub-chapter {subIdx + 1}</span>
                            <button onClick={() => removeSubChapter(chIdx, subIdx)} style={{ fontSize: 10, color: C.danger, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
                            <input
                              type="text"
                              value={subChapter.ref_id}
                              onChange={(e) => {
                                const newHierarchy = [...frameworkData.hierarchy];
                                newHierarchy[chIdx].children[subIdx].ref_id = e.target.value;
                                setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                              }}
                              placeholder="Ref ID"
                              style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                            />
                            <input
                              type="text"
                              value={subChapter.title}
                              onChange={(e) => {
                                const newHierarchy = [...frameworkData.hierarchy];
                                newHierarchy[chIdx].children[subIdx].title = e.target.value;
                                setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                              }}
                              placeholder="Title"
                              style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                            />
                          </div>
                          
                          <textarea
                            value={subChapter.description}
                            onChange={(e) => {
                              const newHierarchy = [...frameworkData.hierarchy];
                              newHierarchy[chIdx].children[subIdx].description = e.target.value;
                              setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                            }}
                            placeholder="Description"
                            rows={2}
                            style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, marginBottom: 8 }}
                          />

                          {/* Controls in sub-chapter */}
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Controls</span>
                              <button onClick={() => addControl(chIdx, subIdx)} style={{ fontSize: 10, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>+ Add Control</button>
                            </div>
                            
                            {(subChapter.items || []).map((control, ctrlIdx) => (
                              <div key={ctrlIdx} style={{
                                background: C.bg, borderRadius: 4, padding: 6, marginBottom: 6,
                                border: `1px solid ${C.border}`,
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: 9, fontWeight: 600, color: C.accent }}>Control {ctrlIdx + 1}</span>
                                  <button onClick={() => removeControl(chIdx, ctrlIdx, subIdx)} style={{ fontSize: 9, color: C.danger, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6, marginBottom: 4 }}>
                                  <input
                                    type="text"
                                    value={control.ref_id}
                                    onChange={(e) => {
                                      const newHierarchy = [...frameworkData.hierarchy];
                                      newHierarchy[chIdx].children[subIdx].items[ctrlIdx].ref_id = e.target.value;
                                      setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                                    }}
                                    placeholder="Ref ID"
                                    style={{ padding: "3px 6px", border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 10 }}
                                  />
                                  <input
                                    type="text"
                                    value={control.name}
                                    onChange={(e) => {
                                      const newHierarchy = [...frameworkData.hierarchy];
                                      newHierarchy[chIdx].children[subIdx].items[ctrlIdx].name = e.target.value;
                                      setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                                    }}
                                    placeholder="Control name"
                                    style={{ padding: "3px 6px", border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 10 }}
                                  />
                                </div>
                                <textarea
                                  value={control.description}
                                  onChange={(e) => {
                                    const newHierarchy = [...frameworkData.hierarchy];
                                    newHierarchy[chIdx].children[subIdx].items[ctrlIdx].description = e.target.value;
                                    setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                                  }}
                                  placeholder="Description"
                                  rows={1}
                                  style={{ width: "100%", padding: "3px 6px", border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 10 }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Direct controls in chapter */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Direct Controls</span>
                        <button onClick={() => addControl(chIdx)} style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>+ Add Control</button>
                      </div>
                      
                      {(chapter.items || []).map((control, ctrlIdx) => (
                        <div key={ctrlIdx} style={{
                          background: C.card, borderRadius: 6, padding: 8, marginBottom: 8,
                          border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: C.accent }}>Control {ctrlIdx + 1}</span>
                            <button onClick={() => removeControl(chIdx, ctrlIdx)} style={{ fontSize: 10, color: C.danger, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 6 }}>
                            <input
                              type="text"
                              value={control.ref_id}
                              onChange={(e) => {
                                const newHierarchy = [...frameworkData.hierarchy];
                                newHierarchy[chIdx].items[ctrlIdx].ref_id = e.target.value;
                                setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                              }}
                              placeholder="Ref ID"
                              style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                            />
                            <input
                              type="text"
                              value={control.name}
                              onChange={(e) => {
                                const newHierarchy = [...frameworkData.hierarchy];
                                newHierarchy[chIdx].items[ctrlIdx].name = e.target.value;
                                setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                              }}
                              placeholder="Control name"
                              style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                            />
                          </div>
                          <textarea
                            value={control.description}
                            onChange={(e) => {
                              const newHierarchy = [...frameworkData.hierarchy];
                              newHierarchy[chIdx].items[ctrlIdx].description = e.target.value;
                              setFrameworkData({ ...frameworkData, hierarchy: newHierarchy });
                            }}
                            placeholder="Description"
                            rows={2}
                            style={{ width: "100%", padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={onClose} style={{
                  padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${C.border}`,
                  background: "transparent", cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
                <button onClick={handleSubmit} disabled={isAdding} style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                  color: "#fff", cursor: isAdding ? "wait" : "pointer", fontSize: 13, fontWeight: 600,
                }}>
                  {isAdding ? "Adding..." : "Add Framework"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Control Item ──
const ControlItem = ({ item, isExcepted, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasDesc = item.description?.length > 0;
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
      
      if (onRefresh) {
        await onRefresh(); // 🔥 IMPORTANT
      }
            
    } catch (error) {
      console.error("Error adding exception:", error);
      alert("Error adding exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginLeft: 40, marginBottom: 6 }}>
        <div style={{
          padding: "6px 10px",
          borderLeft: `3px solid ${effectivelyExcepted ? C.warning : C.success}`,
          background: effectivelyExcepted ? "#FEFCE8" : "#F0FDF4",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, cursor: hasDesc ? "pointer" : "default" }}
            onClick={() => hasDesc && setOpen(!open)}>
            {hasDesc && (
              <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "0.2s" }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
              {item.ref_id}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
            {!effectivelyExcepted && (
              <span style={{ fontSize: 9, background: C.success, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>Imported</span>
            )}
            {effectivelyExcepted && (
              <span style={{ fontSize: 9, background: C.warning, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>Exception</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {isAnnex && !effectivelyExcepted && !isParentExcepted && (
              <button onClick={() => setShowExceptionModal(true)} style={{
                padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.warning}`,
                background: "transparent", color: C.warning, fontSize: 10, cursor: "pointer",
              }}>
                Add Exception
              </button>
            )}
            {effectivelyExcepted && !isParentExcepted && (
              <span style={{ fontSize: 10, color: C.warning, fontStyle: "italic" }}>Excepted</span>
            )}
            {isParentExcepted && (
              <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>Inherited from chapter</span>
            )}
          </div>
        </div>
        {open && hasDesc && (
          <p style={{ marginTop: 6, fontSize: 12, color: C.muted, lineHeight: 1.5, paddingLeft: 20 }}>
            {item.description}
          </p>
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
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.warning }}>Add Exception</span>
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
                  background: C.warning, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
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

// ── Sub Chapter ──
const SubChapter = ({ sub, exceptedControlIds, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasDesc = sub.description?.length > 0;
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
      console.error("Error adding exception:", error);
      alert("Error adding exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginLeft: 20, marginBottom: 8 }}>
        <div onClick={() => setOpen(!open)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 6, fontWeight: 600, fontSize: 13, color: C.text,
          cursor: "pointer", padding: "4px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
            <span style={{ fontWeight: 700, color: effectivelyExcepted ? C.warning : C.purple }}>{sub.ref_id}</span>
            <span>{sub.title}</span>
            {effectivelyExcepted && (
              <span style={{ fontSize: 9, background: C.warning, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>Exception</span>
            )}
          </div>
          {isAnnex && !effectivelyExcepted && !isParentExcepted && (
            <button onClick={(e) => { e.stopPropagation(); setShowExceptionModal(true); }} style={{
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.warning}`,
              background: "transparent", color: C.warning, fontSize: 10, cursor: "pointer",
            }}>Add Exception</button>
          )}
        </div>

        {open && (
          <div style={{ marginLeft: 16 }}>
            {hasDesc && (
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${C.border}` }}>
                {sub.description}
              </p>
            )}
            {sub.items?.map((item) => (
              <ControlItem
                key={item.id}
                item={item}
                isExcepted={exceptedControlIds.has(String(item.id))}
                onAddException={onAddException}
                isAnnex={isAnnex}
                isParentExcepted={effectivelyExcepted}
                standardId={standardId}
                onRefresh={onRefresh}
              />
            ))}
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
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.warning }}>Add Exception for Sub-Chapter</span>
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
                  background: C.warning, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
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

// ── Chapter Section ──
const ChapterSection = ({ chapter, exceptedControlIds, onAddException, isAnnex, isParentExcepted, standardId, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasDesc = chapter.description?.length > 0;
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
      console.error("Error adding chapter exception:", error);
      alert("Error adding chapter exception: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setOpen(!open)} style={{
          padding: "8px 12px",
          background: open ? "#E9EEFF" : "#F3F6FF",
          borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }} />
            <span style={{ fontWeight: 700, color: effectivelyExcepted ? C.warning : C.purple }}>{chapter.ref_id}</span>
            <span>{chapter.title}</span>
            {effectivelyExcepted && (
              <span style={{ fontSize: 9, background: C.warning, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>Exception</span>
            )}
          </div>
          {isAnnex && !effectivelyExcepted && !isParentExcepted && (
            <button onClick={(e) => { e.stopPropagation(); setShowExceptionModal(true); }} style={{
              padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.warning}`,
              background: "transparent", color: C.warning, fontSize: 10, cursor: "pointer",
            }}>Add Exception</button>
          )}
        </div>

        {open && (
          <div style={{ marginLeft: 16, marginTop: 8 }}>
            {hasDesc && (
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, paddingLeft: 8, borderLeft: `2px solid ${C.accent}30` }}>
                {chapter.description}
              </p>
            )}
            {chapter.children?.map((sub) => (
              <SubChapter
                key={sub.id}
                sub={sub}
                exceptedControlIds={exceptedControlIds}
                onAddException={onAddException}
                isAnnex={isAnnex}
                isParentExcepted={effectivelyExcepted}
                standardId={standardId}
                onRefresh={onRefresh}
              />
            ))}
            {chapter.items?.map((item) => (
              <ControlItem
                key={item.id}
                item={item}
                isExcepted={exceptedControlIds.has(String(item.id))}
                onAddException={onAddException}
                isAnnex={isAnnex}
                isParentExcepted={effectivelyExcepted}
                standardId={standardId}
                onRefresh={onRefresh}
              />
            ))}
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
              <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 700, color: C.warning }}>Add Exception for Chapter</span>
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
                  background: C.warning, color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 13,
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

// ── Level 1 Section ──
const Level1Section = ({ section, exceptedControlIds, onAddException, standardId, onRefresh }) => {
  const [open, setOpen] = useState(true);
  
  const isAnnex = section?.title?.toLowerCase()?.includes("annex") || section?.isAnnex === true;
  const color = isAnnex ? C.purple : C.accent;

  return (
    <div style={{ marginBottom: 14 }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "10px 14px", borderRadius: 8, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      }}>
        <ChevronDown size={14} color={color} style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }} />
        <Shield size={14} color={color} />
        <span style={{ fontWeight: 800 }}>{section.title}</span>
        {isAnnex && (
          <span style={{ fontSize: 9, background: C.warning, color: "#fff", padding: "1px 8px", borderRadius: 12, marginLeft: 8 }}>
            Exceptions allowed
          </span>
        )}
      </div>

      {open && (
        <div style={{ paddingLeft: 12, marginTop: 6 }}>
          {section.children?.map((ch) => (
            <ChapterSection
              key={ch.id}
              chapter={ch}
              exceptedControlIds={exceptedControlIds}
              onAddException={onAddException}
              isAnnex={isAnnex}
              isParentExcepted={false}
              standardId={standardId}
              onRefresh={onRefresh}
            />
          ))}
          {section.items?.map((item) => (
            <ControlItem
              key={item.id}
              item={item}
              isExcepted={exceptedControlIds.has(String(item.id))}
              onAddException={onAddException}
              isAnnex={isAnnex}
              isParentExcepted={false}
              standardId={standardId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Package Card ──
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
              const response = await fetch(`http://localhost:3000/api/ciso/packages/${standard.id}/hierarchy`, {
                  credentials: "include"
              });
              
              if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const data = await response.json();
              console.log("Hierarchy data received:", data); // Debug
              
              // Vérifier si data.hierarchy existe
              if (data && data.hierarchy) {
                  setHierarchy(data);
              } else if (data && (data.coreChapters || data.families)) {
                  // Si le backend retourne un format différent, le convertir
                  const convertedHierarchy = { hierarchy: [] };
                  
                  if (data.coreChapters && data.coreChapters.length > 0) {
                      convertedHierarchy.hierarchy.push({
                          id: "core",
                          title: "Core Chapters",
                          description: "Main framework chapters",
                          isAnnex: false,
                          children: data.coreChapters.map(ch => ({
                              id: ch.id,
                              ref_id: ch.ref || `CH-${ch.id}`,
                              title: ch.title,
                              description: ch.description || "",
                              children: [],
                              items: []
                          })),
                          items: []
                      });
                  }
                  
                  if (data.families && data.families.length > 0) {
                      data.families.forEach(family => {
                          convertedHierarchy.hierarchy.push({
                              id: family.id,
                              title: family.name,
                              description: family.description || "",
                              isAnnex: true,
                              children: [],
                              items: (family.controls || []).map(control => ({
                                  id: control.id,
                                  ref_id: control.ref_id,
                                  name: control.name,
                                  description: control.description || ""
                              }))
                          });
                      });
                  }
                  
                  setHierarchy(convertedHierarchy);
              } else {
                  console.warn("Unexpected data format:", data);
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
  }, [standard.id, isImported, refreshKey]);
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
        background: `linear-gradient(135deg, ${C.accent}14, ${C.purple}0d)`,
        borderBottom: open ? `1.5px solid ${C.border}` : "none",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        cursor: isImported ? "pointer" : "default",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Shield size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 800, color: C.text }}>
              {standard.name}
            </div>
            {isImported && (
              <span style={{ fontSize: 10, background: C.success, color: "#fff", padding: "2px 8px", borderRadius: 12 }}>
                Imported
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {standard.version && <span>v{standard.version} · </span>}
            {standard.provider && <span>{standard.provider} · </span>}
            {totalControls} controls
            {isImported && exceptionsCount > 0 && (
              <span style={{ marginLeft: 8, color: C.warning }}>· {exceptionsCount} exceptions</span>
            )}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); isImported ? onUnimportFramework(standard) : onImportFramework(standard); }} style={{
          padding: "6px 14px", borderRadius: 8, border: isImported ? `1px solid ${C.danger}` : "none",
          background: isImported ? "transparent" : `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          color: isImported ? C.danger : "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
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

// ── Main Page ──
export default function Policies() {
  const [availableFrameworks, setAvailableFrameworks] = useState([]);
  const [importedFrameworkIds, setImportedFrameworkIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removeModal, setRemoveModal] = useState(null);
  const [addFrameworkModal, setAddFrameworkModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
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
    } catch (error) {
      console.error("Error refreshing data:", error);
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
      if (!framework?.id) {
        throw new Error("Invalid framework ID");
      }

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
      console.error("Import error:", error);
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
      console.error("Unimport error:", error);
      alert("Error removing framework: " + error.message);
    }
  };

  const handleAddFramework = async (frameworkData) => {
    try {
      const response = await fetch("http://localhost:3000/api/framauditor/add-custom-framework", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        credentials: "include",
        body: JSON.stringify(frameworkData)
      });
      
      if (!response.ok) throw new Error("Failed to add framework");
      
      const result = await response.json();
      console.log("Framework added successfully:", result);
      
      await refreshAllData();
      
      if (result.id) {
        await handleImportFramework({ 
          id: result.id, 
          name: frameworkData.name, 
          version: frameworkData.version,
          source: 'custom',
          type: 'custom'
        });
      }
    } catch (error) {
      console.error("Error adding framework:", error);
      throw error;
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
      console.error("Error adding exception:", error);
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
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
            <Plus size={16} /> Add Framework
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

      {addFrameworkModal && (
        <AddFrameworkModal 
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