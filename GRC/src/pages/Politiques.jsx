// PolicyLibrary.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, BookOpen, FileText, Shield, Search, Plus, X, 
  AlertCircle, CheckCircle, ChevronRight, ChevronDown, Trash2, Edit3
} from "lucide-react";

/* ─── Theme Constants ───────────────── */
const THEME = {
  colors: {
    primary: "#6366F1",
    primaryDark: "#4F46E5",
    primaryLight: "#818CF8",
    primaryBg: "#EEF2FF",
    textDark: "#0F172A",
    textGray: "#64748B",
    textLight: "#94A3B8",
    white: "#fff",
    background: "#F8FAFC",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEF2F2",
    info: "#3B82F6",
    infoLight: "#EFF6FF",
  },
  gradients: {
    button: "linear-gradient(135deg, #6366F1, #4F46E5)",
    cardHover: "linear-gradient(135deg, rgba(99,102,241,0.02), rgba(139,92,246,0.02))",
  },
  shadows: {
    card: "0 2px 12px rgba(0,0,0,0.04)",
    cardHover: "0 8px 24px rgba(0,0,0,0.08)",
    modal: "0 32px 80px rgba(0,0,0,0.18)",
    button: "0 4px 16px rgba(99,102,241,0.3)",
  },
  animation: {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    staggerContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
  },
};

const STATUS_CONFIG = {
  mandatory: { bg: THEME.colors.errorLight, text: THEME.colors.error, label: "Mandatory" },
  recommended: { bg: THEME.colors.primaryBg, text: THEME.colors.primary, label: "Recommended" },
  optional: { bg: THEME.colors.borderLight, text: THEME.colors.textGray, label: "Optional" },
};

/* ─── Badge Component ───────────────────────────── */
const Badge = ({ variant = "default", children }) => {
  const variants = {
    primary: { bg: THEME.colors.primaryBg, text: THEME.colors.primary },
    error: { bg: THEME.colors.errorLight, text: THEME.colors.error },
    default: { bg: THEME.colors.borderLight, text: THEME.colors.textGray },
  };
  const style = variants[variant] || variants.default;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "700",
      backgroundColor: style.bg,
      color: style.text,
      fontFamily: "inherit",
    }}>
      {children}
    </span>
  );
};

/* ─── Exception Badge Component ───────────────────────────── */
const ExceptionBadge = ({ onAddException, isExcluded }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (isExcluded) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "20px",
        fontSize: "10px",
        fontWeight: "600",
        background: THEME.colors.errorLight,
        color: THEME.colors.error,
        border: `1px solid ${THEME.colors.error}40`,
      }}>
        <AlertCircle size={10} />
        Excluded
      </span>
    );
  }

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAddException}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "20px",
        border: `1px solid ${isHovered ? THEME.colors.error : THEME.colors.border}`,
        cursor: "pointer",
        background: isHovered ? THEME.colors.errorLight : THEME.colors.white,
        color: isHovered ? THEME.colors.error : THEME.colors.textGray,
        fontFamily: "inherit",
        fontSize: "10px",
        fontWeight: "600",
        transition: "all 0.15s",
      }}
    >
      <Plus size={10} />
      Add exception
    </button>
  );
};

/* ─── Toggle Switch Component ───────────────────────────── */
const ToggleSwitch = ({ onImport, onUnimport, size = "md", isImported }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSmall = size === "sm";
  const trackWidth = isSmall ? 36 : 44;
  const trackHeight = isSmall ? 20 : 24;
  const knobSize = isSmall ? 14 : 18;
  const knobTranslate = isSmall ? 16 : 20;
  const color = THEME.colors.primary;

  const trackColor = isImported
    ? (isHovered ? color : color)
    : (isHovered ? `${color}30` : THEME.colors.borderLight);

  const trackBorder = isImported
    ? `1.5px solid ${color}`
    : `1.5px solid ${isHovered ? color + "60" : THEME.colors.border}`;

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isImported ? onUnimport : onImport}
      title={isImported ? "Remove from library" : "Import to library"}
      style={{
        position: "relative",
        width: trackWidth,
        height: trackHeight,
        borderRadius: trackHeight,
        border: trackBorder,
        background: trackColor,
        cursor: "pointer",
        padding: 0,
        transition: "background 0.22s, border-color 0.22s, box-shadow 0.22s",
        boxShadow: isImported ? `0 0 0 3px ${color}22` : (isHovered ? `0 0 0 2px ${color}18` : "none"),
        flexShrink: 0,
        outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: 3,
          transform: `translateY(-50%) translateX(${isImported ? knobTranslate : 0}px)`,
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: isImported ? "#fff" : (isHovered ? color : THEME.colors.border),
          transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isImported ? `0 1px 4px ${color}40` : "0 1px 3px rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}
      >
        {isImported && (
          <CheckCircle size={isSmall ? 7 : 9} color={color} />
        )}
      </span>
    </button>
  );
};

/* ─── Import Modal ───────────────────────────── */
const ImportModal = ({ target, onClose, onConfirm }) => {
  const [isImporting, setIsImporting] = useState(false);
  const color = THEME.colors.primary;

  const handleImport = async () => {
    if (!target) return;
    setIsImporting(true);
    try {
      await onConfirm(target);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: THEME.colors.white,
          borderRadius: "24px",
          width: "480px",
          maxWidth: "90vw",
          boxShadow: THEME.shadows.modal,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px 28px 0 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: THEME.colors.textDark, marginBottom: "4px" }}>Import Policy</h2>
            <p style={{ fontSize: "13px", color: THEME.colors.textGray }}>
              Import <span style={{ color, fontWeight: 700 }}>{target?.title || "this policy"}</span> to your library
            </p>
          </div>
          <button onClick={onClose} style={{
            background: THEME.colors.borderLight,
            border: "none",
            borderRadius: "10px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: THEME.colors.textGray,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "0 28px" }}>
          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
            padding: "12px 16px",
            borderRadius: "12px",
            background: `${color}08`,
            marginBottom: "20px",
            border: `1px solid ${color}20`,
          }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.colors.textDark }}>Version:</span>
            <span style={{ fontSize: "12px", color }}>v{target?.version || "1.0"}</span>
            {target?.level === "package" && target?.chaptersCount && (
              <>
                <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.colors.textDark }}>Contains:</span>
                <span style={{ fontSize: "12px", color }}>{target.chaptersCount} chapters, {target.itemsCount} items</span>
              </>
            )}
          </div>

          <div style={{ fontSize: "13px", color: THEME.colors.textGray, marginBottom: "20px" }}>
            {target?.level === "package"
              ? `This will import the entire package "${target.title}" including all its chapters and items.`
              : `This policy will be added to your imported policies library.`}
          </div>
        </div>

        <div style={{ padding: "0 28px 28px 28px" }}>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: `1.5px solid ${THEME.colors.border}`,
              background: THEME.colors.white,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: THEME.colors.textGray,
            }}>
              Cancel
            </button>
            <button onClick={handleImport} disabled={isImporting} style={{
              padding: "8px 22px",
              borderRadius: "10px",
              border: "none",
              cursor: isImporting ? "wait" : "pointer",
              background: isImporting ? THEME.colors.border : THEME.gradients.button,
              color: THEME.colors.white,
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: isImporting ? "none" : THEME.shadows.button,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              {isImporting ? (
                <>
                  <div style={{ width: 14, height: 14, border: `2px solid ${THEME.colors.white}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Importing...
                </>
              ) : "Confirm Import"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Unimport Modal ───────────────────────────── */
const UnimportModal = ({ target, onClose, onConfirm }) => {
  const [isUnimporting, setIsUnimporting] = useState(false);

  const handleUnimport = async () => {
    if (!target) return;
    setIsUnimporting(true);
    try {
      await onConfirm(target);
    } catch (error) {
      console.error("Unimport error:", error);
    } finally {
      setIsUnimporting(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: THEME.colors.white,
          borderRadius: "24px",
          width: "480px",
          maxWidth: "90vw",
          boxShadow: THEME.shadows.modal,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px 28px 0 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: THEME.colors.textDark, marginBottom: "4px" }}>Remove Imported Policy</h2>
            <p style={{ fontSize: "13px", color: THEME.colors.textGray }}>
              Remove <span style={{ color: THEME.colors.error, fontWeight: 700 }}>{target?.title || "this policy"}</span> from your library
            </p>
          </div>
          <button onClick={onClose} style={{
            background: THEME.colors.borderLight,
            border: "none",
            borderRadius: "10px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: THEME.colors.textGray,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "0 28px" }}>
          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
            padding: "12px 16px",
            borderRadius: "12px",
            background: `${THEME.colors.error}08`,
            marginBottom: "20px",
            border: `1px solid ${THEME.colors.error}20`,
          }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: THEME.colors.textDark }}>Version:</span>
            <span style={{ fontSize: "12px", color: THEME.colors.error }}>v{target?.version || "1.0"}</span>
          </div>

          <div style={{ fontSize: "13px", color: THEME.colors.textGray, marginBottom: "16px" }}>
            {target?.level === "package"
              ? `This will remove the entire package "${target.title}" including all chapters and items.`
              : `This policy will be removed from your imported policies library.`}
          </div>

          <div style={{
            fontSize: "12px",
            color: THEME.colors.error,
            background: THEME.colors.errorLight,
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}>
            ⚠️ This action cannot be undone.
          </div>
        </div>

        <div style={{ padding: "0 28px 28px 28px" }}>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: `1.5px solid ${THEME.colors.border}`,
              background: THEME.colors.white,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: THEME.colors.textGray,
            }}>
              Cancel
            </button>
            <button onClick={handleUnimport} disabled={isUnimporting} style={{
              padding: "8px 22px",
              borderRadius: "10px",
              border: "none",
              cursor: isUnimporting ? "wait" : "pointer",
              background: isUnimporting ? THEME.colors.border : THEME.colors.error,
              color: THEME.colors.white,
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: isUnimporting ? "none" : `0 2px 8px ${THEME.colors.error}40`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              {isUnimporting ? (
                <>
                  <div style={{ width: 14, height: 14, border: `2px solid ${THEME.colors.white}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Removing...
                </>
              ) : "Confirm Remove"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Exception Modal ───────────────────────────── */
const ExceptionModal = ({ target, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setIsAdding(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: THEME.colors.white,
          borderRadius: "24px",
          width: "480px",
          maxWidth: "90vw",
          boxShadow: THEME.shadows.modal,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px 28px 0 28px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: THEME.colors.textDark, marginBottom: "4px" }}>Add Exception</h2>
          <p style={{ fontSize: "13px", color: THEME.colors.textGray, marginBottom: "20px" }}>
            Exclude <strong>{target?.title}</strong> from compliance scope
          </p>
        </div>

        <div style={{ padding: "0 28px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: THEME.colors.textGray, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Reason *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for this exception..."
            style={{
              width: "100%",
              minHeight: "100px",
              padding: "10px 14px",
              border: `1.5px solid ${THEME.colors.border}`,
              borderRadius: "12px",
              fontSize: "14px",
              color: THEME.colors.textDark,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: "20px",
            }}
          />
        </div>

        <div style={{ padding: "0 28px 28px 28px" }}>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: `1.5px solid ${THEME.colors.border}`,
              background: THEME.colors.white,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: THEME.colors.textGray,
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!reason.trim() || isAdding} style={{
              padding: "8px 22px",
              borderRadius: "10px",
              border: "none",
              cursor: (!reason.trim() || isAdding) ? "not-allowed" : "pointer",
              background: (!reason.trim() || isAdding) ? THEME.colors.border : THEME.colors.error,
              color: THEME.colors.white,
              fontSize: "13px",
              fontWeight: "600",
              opacity: (!reason.trim() || isAdding) ? 0.6 : 1,
            }}>
              {isAdding ? "Adding..." : "Confirm Exception"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Item Row Component ───────────────────────────── */
const ItemRow = ({ item, isImported, isExcluded, onImport, onUnimport, onAddException }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = STATUS_CONFIG[item.type] || STATUS_CONFIG.optional;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: "10px",
        border: `1px solid ${isHovered ? THEME.colors.primary + "44" : THEME.colors.borderLight}`,
        background: isExcluded ? THEME.colors.errorLight : THEME.colors.white,
        padding: "11px 14px",
        transition: "all 0.18s",
        boxShadow: isHovered ? `0 3px 12px ${THEME.colors.primary}12` : "none",
        transform: isHovered ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          marginTop: "6px",
          flexShrink: 0,
          backgroundColor: isExcluded ? THEME.colors.error : (isImported ? THEME.colors.primary : THEME.colors.border),
          transition: "all 0.2s",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: isExcluded ? THEME.colors.error : THEME.colors.textDark }}>{item.title}</span>
            <span style={{ fontSize: "10px", color: THEME.colors.textLight, background: THEME.colors.borderLight, padding: "1px 6px", borderRadius: "5px", fontWeight: "600" }}>v{item.version || "1.0"}</span>
            <Badge variant={item.type === "mandatory" ? "error" : "primary"}>{status.label}</Badge>
            <ExceptionBadge isExcluded={isExcluded} onAddException={onAddException} />
          </div>
          <p style={{ fontSize: "12px", color: THEME.colors.textGray, margin: "0 0 7px", lineHeight: 1.5 }}>{item.description}</p>
        </div>
        {!isExcluded && (
          <ToggleSwitch
            size="sm"
            isImported={isImported}
            onImport={() => onImport({
              id: item.id,
              title: item.title,
              level: "item",
              version: item.version || "1.0",
              chapter_id: item.chapter_id,
              package_id: item.package_id
            })}
            onUnimport={() => onUnimport({
              id: item.id,
              title: item.title,
              level: "item",
              version: item.version || "1.0"
            })}
          />
        )}
      </div>
    </div>
  );
};

/* ─── Chapter Card Component ───────────────────────────── */
const ChapterCard = ({ chapter, importedItems, excludedItems, onImport, onUnimport, onAddException, packageId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const chapterId = chapter.id;

  const importedChapter = importedItems.find(i => i.id === chapterId && i.level === "chapter");
  const isStructureChanged = importedChapter && importedChapter.itemsCount !== (chapter.items?.length || 0);
  const chapterImported = importedChapter && !isStructureChanged;
  const chapterExcluded = excludedItems.some(i => i.id === chapterId && i.level === "chapter");
  const allItemsImported = chapter.items?.length > 0 && chapter.items.every(item =>
    importedItems.some(i => i.id === item.id && i.level === "item")
  );

  return (
    <div style={{
      borderRadius: "12px",
      border: `1.5px solid ${isOpen ? THEME.colors.primary + "28" : THEME.colors.borderLight}`,
      overflow: "hidden",
      background: THEME.colors.white,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        background: isOpen ? `${THEME.colors.primary}07` : THEME.colors.borderLight,
        borderBottom: isOpen ? `1px solid ${THEME.colors.borderLight}` : "none",
      }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}>
          <ChevronRight size={13} style={{
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }} color={THEME.colors.primary} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: THEME.colors.textDark }}>{chapter.title}</span>
            {chapter.description && (
              <div style={{ fontSize: "12px", color: THEME.colors.textGray, marginTop: "2px" }}>{chapter.description}</div>
            )}
          </div>
          {allItemsImported && !chapterExcluded && (
            <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", background: THEME.colors.primaryBg, color: THEME.colors.primary }}>
              All imported
            </span>
          )}
          {chapterExcluded && (
            <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", background: THEME.colors.errorLight, color: THEME.colors.error }}>
              Excluded
            </span>
          )}
        </button>
        {!chapterExcluded && (
          <div style={{ padding: "0 12px" }}>
            <ToggleSwitch
              size="sm"
              isImported={chapterImported || allItemsImported}
              onImport={() => onImport({
                id: chapterId,
                title: chapter.title,
                level: "chapter",
                version: chapter.version || "1.0",
                package_id: packageId,
                items: chapter.items || []
              })}
              onUnimport={() => onUnimport({
                id: chapterId,
                title: chapter.title,
                level: "chapter",
                version: chapter.version || "1.0",
                items: chapter.items || []
              })}
            />
          </div>
        )}
      </div>
      {isOpen && chapter.items && (
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "7px" }}>
          {chapter.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isImported={importedItems.some(i => i.id === item.id && i.level === "item")}
              isExcluded={excludedItems.some(i => i.id === item.id && i.level === "item")}
              onImport={onImport}
              onUnimport={onUnimport}
              onAddException={() => onAddException({ ...item, id: item.id, level: "item" })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Package Panel Component ───────────────────────────── */
const PackagePanel = ({ pkg, importedItems, excludedItems, onImport, onUnimport, onAddException, isNew }) => {
  const [isOpen, setIsOpen] = useState(true);
  const pkgId = pkg.id;
  const allItems = pkg.chapters?.flatMap(c => c.items) || [];
  const allChapters = pkg.chapters || [];

  const importedPkg = importedItems.find(i => i.id === pkgId && i.level === "package");
  const allItemsImported = allItems.length > 0 && allItems.every(item =>
    importedItems.some(i => i.id === item.id && i.level === "item")
  );
  const allChaptersImported = allChapters.length > 0 && allChapters.every(ch =>
    importedItems.some(i => i.id === ch.id && i.level === "chapter")
  );
  const pkgImported = importedPkg || (allItemsImported && allChaptersImported);
  const pkgExcluded = excludedItems.some(i => i.id === pkgId && i.level === "package");

  const importedCount = allItems.filter(item => importedItems.some(i => i.id === item.id && i.level === "item")).length;
  const importedChaptersCount = allChapters.filter(ch => {
    return importedItems.some(i => i.id === ch.id && i.level === "chapter") ||
      ch.items?.every(item => importedItems.some(i => i.id === item.id && i.level === "item"));
  }).length;

  return (
    <div style={{
      borderRadius: "20px",
      border: `1.5px solid ${isOpen ? THEME.colors.primary + "50" : THEME.colors.borderLight}`,
      background: pkgExcluded ? THEME.colors.errorLight : THEME.colors.white,
      boxShadow: isOpen ? `0 4px 22px ${THEME.colors.primary}14` : THEME.shadows.card,
      overflow: "hidden",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        background: isOpen ? `linear-gradient(to right, ${THEME.colors.primary}10, transparent)` : THEME.colors.borderLight,
        borderBottom: isOpen ? `1px solid ${THEME.colors.borderLight}` : "none",
      }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "13px",
          padding: "15px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "20px", fontWeight: "900", color: pkgExcluded ? THEME.colors.error : THEME.colors.textDark }}>{pkg.title}</span>
              {isNew && !pkgImported && !pkgExcluded && (
                <span style={{ fontSize: "10px", fontWeight: "700", background: THEME.colors.primaryBg, color: THEME.colors.primary, padding: "2px 8px", borderRadius: "12px", border: `1px solid ${THEME.colors.primary}40` }}>New</span>
              )}
              {pkgExcluded && (
                <span style={{ fontSize: "10px", fontWeight: "700", background: THEME.colors.errorLight, color: THEME.colors.error, padding: "2px 8px", borderRadius: "12px", border: `1px solid ${THEME.colors.error}40` }}>Excluded</span>
              )}
              <span style={{ fontSize: "11px", color: THEME.colors.primary, background: `${THEME.colors.primary}15`, padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>v{pkg.version || "1.0"}</span>
              <Badge variant={pkg.type === "mandatory" ? "error" : "primary"}>
                {pkg.type === "mandatory" ? "Mandatory" : pkg.type === "recommended" ? "Recommended" : "Optional"}
              </Badge>
            </div>
            {pkg.description && (
              <div style={{ fontSize: "12px", color: THEME.colors.textGray, marginTop: "4px" }}>{pkg.description}</div>
            )}
            {allItems.length > 0 && !pkgExcluded && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "120px", height: "4px", background: THEME.colors.borderLight, borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(importedCount / allItems.length) * 100}%`, background: THEME.gradients.button, borderRadius: "99px", transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: "10px", color: THEME.colors.textLight }}>
                    {importedChaptersCount}/{allChapters.length} chapters · {importedCount}/{allItems.length} items imported
                  </span>
                </div>
              </div>
            )}
            {pkgExcluded && (
              <div style={{ fontSize: "11px", color: THEME.colors.error, marginTop: "4px" }}>
                This package is excluded from compliance scope
              </div>
            )}
          </div>
          <ChevronDown size={14} style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
            marginRight: "4px",
            color: THEME.colors.textLight,
          }} />
        </button>
        {!pkgExcluded && (
          <div style={{ padding: "0 16px" }}>
            <ToggleSwitch
              size="md"
              isImported={pkgImported}
              onImport={() => onImport({
                id: pkgId,
                title: pkg.title,
                level: "package",
                version: pkg.version || "1.0",
                chapters: pkg.chapters,
                chaptersCount: allChapters.length,
                itemsCount: allItems.length
              })}
              onUnimport={() => onUnimport({
                id: pkgId,
                title: pkg.title,
                level: "package",
                version: pkg.version || "1.0",
                chapters: pkg.chapters
              })}
            />
          </div>
        )}
      </div>
      {isOpen && pkg.chapters && !pkgExcluded && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {pkg.chapters.map((ch) => (
            <ChapterCard
              key={ch.id}
              chapter={{ ...ch, id: ch.id }}
              importedItems={importedItems}
              excludedItems={excludedItems}
              onImport={onImport}
              onUnimport={onUnimport}
              onAddException={onAddException}
              packageId={pkgId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Helper Functions ───────────────────────────── */
const resolveId = (obj) => {
  if (!obj) return undefined;
  return obj.id ?? obj.item_id ?? obj.chapter_id ?? obj.package_id ?? obj.policy_id ?? undefined;
};

const formatImportedItems = (data) =>
  data.map(i => ({
    id: i.policyId ?? i.id,
    level: i.level,
    title: i.title,
    version: i.version
  })).filter(item => item.id != null);

/* ─── Main Policy Library Page ───────────────────────────── */
export default function PolicyLibrary() {
  const navigate = useNavigate();
  const [importModal, setImportModal] = useState(null);
  const [unimportModal, setUnimportModal] = useState(null);
  const [exceptionModal, setExceptionModal] = useState(null);
  const [filterPackage, setFilterPackage] = useState("all");
  const [search, setSearch] = useState("");
  const [importedItems, setImportedItems] = useState([]);
  const [excludedItems, setExcludedItems] = useState([]);
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshImportedItems = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/framauditor/imported-policies", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImportedItems(formatImportedItems(data));
    } catch (err) {
      console.error("Failed to refresh imported items:", err);
    }
  };

  const refreshExcludedItems = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/framauditor/exceptions", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const formatted = (Array.isArray(data) ? data : data.exceptions || data.data || []).map(ex => ({
        id: resolveId(ex),
        level: ex.level,
        title: ex.title,
        reason: ex.reason
      })).filter(ex => ex.id != null);
      setExcludedItems(formatted);
    } catch (err) {
      console.error("Failed to refresh excluded items:", err);
    }
  };

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("http://localhost:3000/api/frameworks/policies");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setPolicies(data);
      } catch (err) {
        console.error("Error loading policies:", err);
        setError(err.message || "Failed to load policies");
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  useEffect(() => {
    refreshImportedItems();
    refreshExcludedItems();
  }, []);

  const handleImport = async (target) => {
    if (!target || target.id == null) return;

    let imports = [];

    if (target.level === "package") {
      imports.push({ policyId: target.id, level: "package", title: target.title, version: target.version || "1.0", chaptersCount: target.chaptersCount, itemsCount: target.itemsCount });
      target.chapters?.forEach(ch => {
        const chId = resolveId(ch);
        if (chId == null) return;
        imports.push({ policyId: chId, level: "chapter", title: ch.title, version: ch.version || "1.0" });
        ch.items?.forEach(item => {
          const itemId = resolveId(item);
          if (itemId == null) return;
          imports.push({ policyId: itemId, level: "item", title: item.title, version: item.version || "1.0" });
        });
      });
    } else if (target.level === "chapter") {
      imports.push({ policyId: target.id, level: "chapter", title: target.title, version: target.version || "1.0", itemsCount: target.items?.length || 0 });
      target.items?.forEach(item => {
        const itemId = resolveId(item);
        if (itemId == null) return;
        imports.push({ policyId: itemId, level: "item", title: item.title, version: item.version || "1.0" });
      });
    } else {
      imports.push({ policyId: target.id, level: "item", title: target.title, version: target.version || "1.0" });
    }

    const optimisticItems = imports.map(imp => ({ id: imp.policyId, level: imp.level, title: imp.title, version: imp.version }));
    setImportedItems(prev => {
      const existingKeys = new Set(prev.map(i => `${i.id}-${i.level}`));
      const newItems = optimisticItems.filter(i => !existingKeys.has(`${i.id}-${i.level}`));
      return [...prev, ...newItems];
    });

    try {
      const promises = imports.map(imp =>
        fetch("http://localhost:3000/api/framauditor/import-policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(imp)
        }).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      );
      await Promise.allSettled(promises);
      await refreshImportedItems();
    } catch (err) {
      console.error("Import error:", err);
      await refreshImportedItems();
      throw err;
    }
  };

  const handleUnimport = async (target) => {
    if (!target || target.id == null) return;

    let deletions = [];

    if (target.level === "package") {
      deletions.push({ policyId: target.id, level: "package" });
      target.chapters?.forEach(ch => {
        const chId = resolveId(ch);
        if (chId == null) return;
        deletions.push({ policyId: chId, level: "chapter" });
        ch.items?.forEach(item => {
          const itemId = resolveId(item);
          if (itemId == null) return;
          deletions.push({ policyId: itemId, level: "item" });
        });
      });
    } else if (target.level === "chapter") {
      deletions.push({ policyId: target.id, level: "chapter" });
      target.items?.forEach(item => {
        const itemId = resolveId(item);
        if (itemId == null) return;
        deletions.push({ policyId: itemId, level: "item" });
      });
    } else {
      deletions.push({ policyId: target.id, level: "item" });
    }

    const deletionKeys = new Set(deletions.map(d => `${d.policyId}-${d.level}`));
    setImportedItems(prev => prev.filter(i => !deletionKeys.has(`${resolveId(i)}-${i.level}`)));

    try {
      const promises = deletions.map(del =>
        fetch("http://localhost:3000/api/framauditor/unimport-policy", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ policyId: del.policyId, level: del.level })
        })
      );
      await Promise.allSettled(promises);
      await refreshImportedItems();
    } catch (err) {
      console.error("Unimport error:", err);
      await refreshImportedItems();
    }
  };

  const handleAddException = async (target, reason) => {
    if (!target || target.id == null || excludedItems.some(i => i.id === target.id && i.level === target.level)) return;
    try {
      await fetch("http://localhost:3000/api/framauditor/add-exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policyId: target.id, level: target.level, title: target.title, reason })
      });
      await refreshExcludedItems();
    } catch (err) {
      console.error("Error saving exception:", err);
    }
  };

  const allPolicies = policies;
  const displayed = (allPolicies || [])
    .filter(p => filterPackage === "all" || resolveId(p) === parseInt(filterPackage))
    .filter(p => {
      if (showImportedOnly) return importedItems.some(i => i.id === resolveId(p) && i.level === "package");
      return true;
    })
    .filter(p => {
      if (!search) return true;
      const s = search.toLowerCase();
      return p.title?.toLowerCase().includes(s) ||
        p.chapters?.some(c => c.title?.toLowerCase().includes(s) || c.items?.some(i => i.title?.toLowerCase().includes(s)));
    });

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: THEME.colors.background, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${THEME.colors.border}`, borderTopColor: THEME.colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: THEME.colors.textGray }}>Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: THEME.colors.background, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", background: THEME.colors.white, padding: 32, borderRadius: 20, border: `1px solid ${THEME.colors.border}` }}>
          <AlertCircle size={48} style={{ marginBottom: 16, color: THEME.colors.error }} />
          <p style={{ color: THEME.colors.error, marginBottom: 16 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", borderRadius: "10px", background: THEME.gradients.button, color: THEME.colors.white, border: "none", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: THEME.colors.background, minHeight: "100vh", padding: "26px 30px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { 
          border-color: ${THEME.colors.primary} !important; 
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1); 
        }
      `}</style>

      <div style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: THEME.colors.primary, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>Compliance Library</div>
            <h1 style={{ fontSize: "25px", fontWeight: "900", color: THEME.colors.textDark, margin: 0 }}>
              Policy Library
              <span style={{ fontSize: "12px", background: THEME.colors.primaryBg, color: THEME.colors.primary, padding: "3px 8px", borderRadius: "20px", marginLeft: "10px" }}>{importedItems.length} imported</span>
            </h1>
            <p style={{ fontSize: "13px", color: THEME.colors.textGray, marginTop: "8px" }}>
              Import policies from admin to your library. Importing a package imports all its chapters and items automatically.
              Click "Add exception" to exclude policies from compliance scope.
            </p>
          </div>
          <button onClick={() => navigate("/layout/exception")} style={{
            padding: "8px 16px",
            borderRadius: "10px",
            border: `1.5px solid ${THEME.colors.primary}`,
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            color: THEME.colors.primary,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: THEME.colors.white,
            transition: "all 0.2s",
          }} onMouseEnter={(e) => e.currentTarget.style.background = THEME.colors.primaryBg} onMouseLeave={(e) => e.currentTarget.style.background = THEME.colors.white}>
            <AlertCircle size={14} />
            View Exceptions ({excludedItems.length})
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setFilterPackage("all")} style={{
          padding: "5px 13px",
          borderRadius: "20px",
          border: "none",
          cursor: "pointer",
          background: filterPackage === "all" ? THEME.gradients.button : THEME.colors.borderLight,
          color: filterPackage === "all" ? THEME.colors.white : THEME.colors.textGray,
          fontSize: "12px",
          fontWeight: "600",
          transition: "all 0.15s",
          boxShadow: filterPackage === "all" ? THEME.shadows.button : "none",
        }}>All</button>
        {allPolicies?.map(p => {
          const pId = resolveId(p);
          return (
            <button key={pId} onClick={() => setFilterPackage(pId?.toString() || "")} style={{
              padding: "5px 13px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: filterPackage === pId?.toString() ? THEME.gradients.button : THEME.colors.borderLight,
              color: filterPackage === pId?.toString() ? THEME.colors.white : THEME.colors.textGray,
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.15s",
              boxShadow: filterPackage === pId?.toString() ? THEME.shadows.button : "none",
            }}>
              {p.title.length > 20 ? p.title.substring(0, 20) + "..." : p.title}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={showImportedOnly} onChange={e => setShowImportedOnly(e.target.checked)} />
            <span style={{ fontSize: "12px", color: THEME.colors.textGray }}>Show only imported</span>
          </label>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: THEME.colors.textLight }} />
            <input
              placeholder="Search policies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "190px",
                padding: "7px 12px 7px 30px",
                border: `1.5px solid ${THEME.colors.border}`,
                borderRadius: "10px",
                fontSize: "13px",
                color: THEME.colors.textDark,
                background: THEME.colors.white,
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = THEME.colors.primary}
              onBlur={(e) => e.target.style.borderColor = THEME.colors.border}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: THEME.colors.textLight, fontSize: "14px" }}>
            No policies match your search.
          </div>
        ) : (
          <motion.div variants={THEME.animation.staggerContainer} initial="hidden" animate="visible">
            {displayed.map((pkg, idx) => {
              const pkgId = resolveId(pkg);
              const isNew = !importedItems.some(i => i.id === pkgId && i.level === "package") &&
                            !excludedItems.some(i => i.id === pkgId && i.level === "package");
              return (
                <motion.div key={pkgId ?? idx} variants={THEME.animation.fadeUp} custom={idx}>
                  <PackagePanel
                    pkg={{ ...pkg, id: pkgId }}
                    isNew={isNew}
                    importedItems={importedItems}
                    excludedItems={excludedItems}
                    onImport={target => setImportModal({ target })}
                    onUnimport={target => setUnimportModal({ target })}
                    onAddException={target => setExceptionModal({ target })}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {importModal && (
          <ImportModal
            target={importModal.target}
            onClose={() => setImportModal(null)}
            onConfirm={handleImport}
          />
        )}
        {unimportModal && (
          <UnimportModal
            target={unimportModal.target}
            onClose={() => setUnimportModal(null)}
            onConfirm={handleUnimport}
          />
        )}
        {exceptionModal && (
          <ExceptionModal
            target={exceptionModal.target}
            onClose={() => setExceptionModal(null)}
            onConfirm={reason => handleAddException(exceptionModal.target, reason)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}