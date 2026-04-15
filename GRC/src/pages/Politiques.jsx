import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F8FAFF", surface: "#FFFFFF", surfaceAlt: "#F0F4FF",
  border: "#E2E8F8", borderStrong: "#C7D2F0",
  accent: "#3B6FFF", accentLight: "#EEF2FF", accentHover: "#2D5CE8",
  purple: "#6D28D9", purpleLight: "#F5F0FF",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#D97706", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  info: "#0891B2", infoLight: "#ECFEFF",
  text: "#0F172A", textMid: "#475569", textMuted: "#94A3B8",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
  shadowMd: "0 4px 12px rgba(15,23,42,0.09)",
  shadowLg: "0 10px 30px rgba(15,23,42,0.13)",
};
const F = { display: "'Fraunces', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" };

const STATUS_S = {
  mandatory:   { bg: "#FEF2F2", text: "#DC2626", label: "Mandatory" },
  recommended: { bg: "#FFFBEB", text: "#D97706", label: "Recommended" },
  optional:    { bg: "#F0FDF4", text: "#059669", label: "Optional" },
};

// ─── Safe ID extractor ────────────────────────────────────────────────────────
function resolveId(obj) {
  if (!obj) return undefined;
  return obj.id ?? obj.item_id ?? obj.chapter_id ?? obj.package_id ?? obj.policy_id ?? undefined;
}

function Badge({ bg, text, children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, backgroundColor:bg, color:text, fontFamily:F.body }}>{children}</span>;
}

// ─── Exception Badge ──────────────────────────────────────────────────────────
function ExceptionBadge({ onAddException, isExcluded }) {
  const [hov, setHov] = useState(false);
  if (isExcluded) {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:C.warningLight, color:C.warning, border:`1px solid ${C.warning}40` }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Excluded
      </span>
    );
  }
  return (
    <button onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onAddException}
      style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, border:`1px solid ${hov ? C.warning : C.border}`, cursor:"pointer",
        background: hov ? C.warningLight : C.surfaceAlt, color: hov ? C.warning : C.textMuted,
        fontFamily:F.body, fontSize:10, fontWeight:600, transition:"all .15s" }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Add exception
    </button>
  );
}

// ─── Toggle Switch (replaces Import/Remove Button) ────────────────────────────
function ImportUnimportBtn({ color, onImport, onUnimport, size = "md", isImported }) {
  const [hov, setHov] = useState(false);
  const isSmall = size === "sm";
  const trackW = isSmall ? 36 : 44;
  const trackH = isSmall ? 20 : 24;
  const knobSize = isSmall ? 14 : 18;
  const knobOffset = isSmall ? 3 : 3;
  const knobTranslate = isSmall ? 16 : 20;

  const trackColor = isImported
    ? (hov ? color : color)
    : (hov ? `${color}30` : C.surfaceAlt);

  const trackBorder = isImported
    ? `1.5px solid ${color}`
    : `1.5px solid ${hov ? color + "60" : C.border}`;

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={isImported ? onUnimport : onImport}
      title={isImported ? "Remove" : "Import"}
      style={{
        position: "relative",
        width: trackW,
        height: trackH,
        borderRadius: trackH,
        border: trackBorder,
        background: trackColor,
        cursor: "pointer",
        padding: 0,
        transition: "background .22s, border-color .22s, box-shadow .22s",
        boxShadow: isImported
          ? `0 0 0 3px ${color}22`
          : hov ? `0 0 0 2px ${color}18` : "none",
        flexShrink: 0,
        outline: "none",
      }}
    >
      {/* Knob */}
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: knobOffset,
          transform: `translateY(-50%) translateX(${isImported ? knobTranslate : 0}px)`,
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: isImported ? "#fff" : (hov ? color : C.borderStrong),
          transition: "transform .22s cubic-bezier(.34,1.56,.64,1), background .18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isImported ? `0 1px 4px ${color}40` : "0 1px 3px rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}
      >
        {/* Checkmark when imported */}
        {isImported && (
          <svg width={isSmall ? 7 : 9} height={isSmall ? 7 : 9} viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
    </button>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ target, color, onClose, onConfirm }) {
  const [isImporting, setIsImporting] = useState(false);
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
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(15,23,42,0.48)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(5px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:C.surface, borderRadius:20, padding:30, width:460, maxWidth:"92vw", boxShadow:C.shadowLg, border:`1px solid ${C.border}`, animation:"slideUp .2s ease" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:F.display, fontSize:18, fontWeight:800, color:C.text, marginBottom:3 }}>Import Policy</div>
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textMid }}>
              Import <span style={{ color, fontWeight:700 }}>{target?.title || "this policy"}</span> to your library
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"none", background:C.surfaceAlt, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.textMid }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", padding:"12px 16px", borderRadius:12, background:`${color}08`, marginBottom:20, border:`1px solid ${color}20` }}>
          <span style={{ fontFamily:F.body, fontSize:13, fontWeight:600, color:C.text }}>Version:</span>
          <span style={{ fontFamily:F.body, fontSize:12, color }}>v{target?.version || "1.0"}</span>
          {target?.level === "package" && target?.chaptersCount && (
            <>
              <span style={{ fontFamily:F.body, fontSize:13, fontWeight:600, color:C.text }}>Contains:</span>
              <span style={{ fontFamily:F.body, fontSize:12, color:C.textMuted }}>{target.chaptersCount} chapters, {target.itemsCount} items</span>
            </>
          )}
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textMid, marginBottom:8 }}>
            {target?.level === "package"
              ? `This will import the entire package "${target.title}" including all its chapters and items.`
              : `This policy will be added to your imported policies library.`}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontFamily:F.body, fontSize:13, fontWeight:600, color:C.textMid }}>
            Cancel
          </button>
          <button onClick={handleImport} disabled={isImporting}
            style={{ padding:"8px 22px", borderRadius:9, border:"none", cursor:isImporting?"wait":"pointer",
              background:isImporting?C.borderStrong:`linear-gradient(135deg,${color},${C.accentHover})`,
              color:"#fff", fontFamily:F.body, fontSize:13, fontWeight:600,
              boxShadow:isImporting?"none":`0 2px 8px ${color}40`, transition:"all .15s",
              display:"flex", alignItems:"center", gap:8 }}>
            {isImporting ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Importing...
              </>
            ) : "Confirm Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Unimport Modal ───────────────────────────────────────────────────────────
function UnimportModal({ target, color, onClose, onConfirm }) {
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
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(15,23,42,0.48)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(5px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:C.surface, borderRadius:20, padding:30, width:460, maxWidth:"92vw", boxShadow:C.shadowLg, border:`1px solid ${C.border}`, animation:"slideUp .2s ease" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:F.display, fontSize:18, fontWeight:800, color:C.text, marginBottom:3 }}>Remove Imported Policy</div>
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textMid }}>
              Remove <span style={{ color, fontWeight:700 }}>{target?.title || "this policy"}</span> from your library
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"none", background:C.surfaceAlt, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.textMid }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", padding:"12px 16px", borderRadius:12, background:`${C.danger}08`, marginBottom:20, border:`1px solid ${C.danger}20` }}>
          <span style={{ fontFamily:F.body, fontSize:13, fontWeight:600, color:C.text }}>Version:</span>
          <span style={{ fontFamily:F.body, fontSize:12, color }}>v{target?.version || "1.0"}</span>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textMid, marginBottom:8 }}>
            {target?.level === "package"
              ? `This will remove the entire package "${target.title}" including all chapters and items.`
              : `This policy will be removed from your imported policies library.`}
          </div>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.warning, background:C.warningLight, padding:"8px 12px", borderRadius:8, marginTop:8 }}>
            ⚠️ This action cannot be undone.
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontFamily:F.body, fontSize:13, fontWeight:600, color:C.textMid }}>
            Cancel
          </button>
          <button onClick={handleUnimport} disabled={isUnimporting}
            style={{ padding:"8px 22px", borderRadius:9, border:"none", cursor:isUnimporting?"wait":"pointer",
              background:isUnimporting?C.borderStrong:C.danger, color:"#fff",
              fontFamily:F.body, fontSize:13, fontWeight:600,
              boxShadow:isUnimporting?"none":`0 2px 8px ${C.danger}40`, transition:"all .15s",
              display:"flex", alignItems:"center", gap:8 }}>
            {isUnimporting ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Removing...
              </>
            ) : "Confirm Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exception Modal ──────────────────────────────────────────────────────────
function ExceptionModal({ target, onClose, onConfirm }) {
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
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(15,23,42,0.48)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(5px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:C.surface, borderRadius:20, padding:30, width:460, maxWidth:"92vw", boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:F.display, fontSize:18, fontWeight:800 }}>Add Exception</div>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textMid }}>Exclude <b>{target?.title}</b> from compliance scope</div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700 }}>Reason *</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)}
            style={{ width:"100%", minHeight:100, marginTop:8, padding:10, borderRadius:8, border:`1px solid ${C.border}`, boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontFamily:F.body, fontSize:13, color:C.textMid }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!reason.trim() || isAdding}
            style={{ background:C.warning, color:"#fff", padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:F.body, fontSize:13, fontWeight:600 }}>
            {isAdding ? "Adding..." : "Confirm Exception"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, pkgColor, isImported, isExcluded, onImport, onUnimport, onAddException }) {
  const [hov, setHov] = useState(false);
  const itemId = resolveId(item);

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderRadius:10, border:`1px solid ${hov?pkgColor+"44":C.border}`, background:isExcluded?C.warningLight:C.surface, padding:"11px 14px", transition:"all .18s", boxShadow:hov?`0 3px 12px ${pkgColor}12`:C.shadow, transform:hov?"translateY(-1px)":"none" }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <div style={{ width:7, height:7, borderRadius:"50%", marginTop:6, flexShrink:0, backgroundColor:isExcluded?C.warning:(isImported?C.success:C.border), transition:"all .2s" }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:3 }}>
            <span style={{ fontFamily:F.display, fontSize:13, fontWeight:700, color:isExcluded?C.warning:C.text }}>{item.title}</span>
            <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted, background:C.surfaceAlt, padding:"1px 6px", borderRadius:5, fontWeight:600 }}>v{item.version||"1.0"}</span>
            <Badge bg={STATUS_S[item.type]?.bg||C.surfaceAlt} text={STATUS_S[item.type]?.text||C.textMuted}>{STATUS_S[item.type]?.label||item.type||"Optional"}</Badge>
            <ExceptionBadge isExcluded={isExcluded} onAddException={onAddException}/>
          </div>
          <p style={{ fontFamily:F.body, fontSize:12, color:C.textMid, margin:"0 0 7px", lineHeight:1.5 }}>{item.description}</p>
        </div>
        {!isExcluded && (
          <ImportUnimportBtn color={pkgColor} size="sm" isImported={isImported}
            onImport={() => onImport({
              id: itemId,
              title: item.title,
              level: "item",
              version: item.version || "1.0",
              chapter_id: item.chapter_id,
              package_id: item.package_id
            })}
            onUnimport={() => onUnimport({
              id: itemId,
              title: item.title,
              level: "item",
              version: item.version || "1.0"
            })}
          />
        )}
      </div>
    </div>
  );
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({ chapter, pkgColor, importedItems, excludedItems, onImport, onUnimport, onAddException, packageId }) {
  const [open, setOpen] = useState(true);
  const chapterId = resolveId(chapter);
  const importedChapter = importedItems.find(
  i => i.id === chapterId && i.level === "chapter"
);

const isChapterChanged =
  importedChapter &&
  importedChapter.itemsCount !== (chapter.items?.length || 0);

const chapterImported = importedChapter && !isChapterChanged;
  const chapterExcluded = excludedItems.some(i =>i.id === chapterId && i.level === "chapter");
  const allItemsImported = chapter.items?.length > 0 && chapter.items.every(item =>
    importedItems.some(i =>i.id === resolveId(item) && i.level === "item")
  );

  return (
    <div style={{ borderRadius:12, border:`1.5px solid ${open?pkgColor+"28":C.border}`, overflow:"hidden", background:C.surface }}>
      <div style={{ display:"flex", alignItems:"center", background:open?`${pkgColor}07`:C.surfaceAlt, borderBottom:open?`1px solid ${C.border}`:"none" }}>
        <button onClick={()=>setOpen(o=>!o)}
          style={{ flex:1, display:"flex", alignItems:"center", gap:9, padding:"10px 14px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ transform:open?"rotate(90deg)":"none", transition:"transform .2s", flexShrink:0 }}>
            <path d="M4 2.5L9 6.5L4 10.5" stroke={pkgColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
          {allItemsImported && !chapterExcluded && (
            <span style={{ fontFamily:F.body, fontSize:10, fontWeight:600, color:C.success, background:C.successLight, padding:"2px 8px", borderRadius:12 }}>All imported</span>
          )}
          {chapterExcluded && (
            <span style={{ fontFamily:F.body, fontSize:10, fontWeight:600, color:C.warning, background:C.warningLight, padding:"2px 8px", borderRadius:12 }}>Excluded</span>
          )}
        </button>
        {!chapterExcluded && (
          <div style={{ padding:"0 12px" }}>
            <ImportUnimportBtn color={pkgColor} size="sm" isImported={chapterImported||allItemsImported}
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
      {open && chapter.items && (
        <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:7 }}>
          {chapter.items.map((item, idx) => {
            const itemId = resolveId(item);
            return (
              <ItemRow key={itemId ?? idx} item={item} pkgColor={pkgColor}
                isImported={importedItems.some(i =>i.id === itemId && i.level === "item")}
                isExcluded={excludedItems.some(i =>i.id === itemId && i.level === "item")}
                onImport={onImport}
                onUnimport={onUnimport}
                onAddException={() => onAddException({ ...item, id: itemId, level: "item" })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Package Panel ────────────────────────────────────────────────────────────
function PackagePanel({ pkg, importedItems, excludedItems, onImport, onUnimport, onAddException, isNew }) {
  const [open, setOpen] = useState(true);
  const pkgId = resolveId(pkg);
  const allItems = pkg.chapters?.flatMap(c => c.items) || [];
  const allChapters = pkg.chapters || [];

  const importedPkg = importedItems.find(
  i => i.id === pkgId && i.level === "package"
);

const allItemsImported =
  allItems.length > 0 &&
  allItems.every(item =>
    importedItems.some(i => i.id === resolveId(item) && i.level === "item")
  );
  const allChaptersImported =
  allChapters.length > 0 &&
  allChapters.every(ch =>
    importedItems.some(i => i.id === resolveId(ch) && i.level === "chapter")
  );
const isStructureChanged =
  importedPkg &&
  (
    importedPkg.chaptersCount !== allChapters.length ||
    importedPkg.itemsCount !== allItems.length
  );

const pkgImported =
  importedPkg ||
  (allItemsImported && allChaptersImported);
  const pkgExcluded = excludedItems.some(i =>i.id === pkgId && i.level === "package");

  const importedCount = allItems.filter(item => importedItems.some(i =>i.id === resolveId(item) && i.level === "item")).length;
  const importedChaptersCount = allChapters.filter(ch => {
    const chId = resolveId(ch);
    return importedItems.some(i =>i.id === chId && i.level === "chapter") ||
      ch.items?.every(item => importedItems.some(i =>i.id === resolveId(item) && i.level === "item"));
  }).length;

  const colors = ["#3B6FFF", "#059669", "#EA580C", "#7C3AED", "#0891B2", "#D97706"];
  const pkgColor = pkg.color || colors[pkgId % colors.length] || colors[0];

  return (
    <div style={{ borderRadius:16, border:`1.5px solid ${open?pkgColor+"50":C.border}`, background:pkgExcluded?C.warningLight:C.surface, boxShadow:open?`0 4px 22px ${pkgColor}14`:C.shadow, overflow:"hidden", transition:"box-shadow .2s, border-color .2s" }}>
      <div style={{ display:"flex", alignItems:"center", background:open?`linear-gradient(to right,${pkgColor}10,transparent)`:C.surfaceAlt, borderBottom:open?`1px solid ${C.border}`:"none" }}>
        <button onClick={()=>setOpen(o=>!o)}
          style={{ flex:1, display:"flex", alignItems:"center", gap:13, padding:"15px 18px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontFamily:F.display, fontSize:20, fontWeight:900, color:pkgExcluded?C.warning:C.text }}>{pkg.title}</span>
              {pkg.description && (
  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
    {pkg.description}
  </div>
)}
              {isNew && !pkgImported && !pkgExcluded && (
                <span style={{ fontFamily:F.body, fontSize:10, fontWeight:700, background:C.warningLight, color:C.warning, padding:"2px 8px", borderRadius:12, border:`1px solid ${C.warning}40` }}>New</span>
              )}
              {pkgExcluded && (
                <span style={{ fontFamily:F.body, fontSize:10, fontWeight:700, background:C.warningLight, color:C.warning, padding:"2px 8px", borderRadius:12, border:`1px solid ${C.warning}40` }}>Excluded</span>
              )}
              <span style={{ fontFamily:F.body, fontSize:11, color:pkgColor, background:`${pkgColor}15`, padding:"2px 8px", borderRadius:6, fontWeight:700 }}>v{pkg.version||"1.0"}</span>
              <Badge bg={STATUS_S[pkg.type]?.bg||C.surfaceAlt} text={STATUS_S[pkg.type]?.text||C.textMuted}>{STATUS_S[pkg.type]?.label||"Optional"}</Badge>
            </div>
            {allItems.length > 0 && !pkgExcluded && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:120, height:4, background:C.surfaceAlt, borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(importedCount/allItems.length)*100}%`, background:`linear-gradient(90deg,${pkgColor},${C.purple})`, borderRadius:99, transition:"width .4s" }}/>
                </div>
                <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>
                  {importedChaptersCount}/{allChapters.length} chapters · {importedCount}/{allItems.length} items imported
                </span>
              </div>
            )}
            {pkgExcluded && (
              <div style={{ fontFamily:F.body, fontSize:11, color:C.warning, marginTop:4 }}>This package is excluded from compliance scope</div>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform:open?"rotate(180deg)":"none", transition:"transform .2s", flexShrink:0, marginRight:4 }}>
            <path d="M3 5L7 9L11 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!pkgExcluded && (
          <div style={{ padding:"0 16px" }}>
            <ImportUnimportBtn color={pkgColor} size="md" isImported={pkgImported}
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
      {open && pkg.chapters && !pkgExcluded && (
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          {pkg.chapters.map((ch, idx) => {
            const chId = resolveId(ch);
            return (
              <ChapterCard key={chId ?? idx} chapter={{ ...ch, id: chId }} pkgColor={pkgColor}
                importedItems={importedItems} excludedItems={excludedItems}
                onImport={onImport} onUnimport={onUnimport} onAddException={onAddException}
                packageId={pkgId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Politiques() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [unimportModal, setUnimportModal] = useState(null);
  const [exceptionModal, setExceptionModal] = useState(null);
  const [filterPkg, setFilterPkg] = useState("all");
  const [search, setSearch] = useState("");
  const [importedItems, setImportedItems] = useState([]);
  const [excludedItems, setExcludedItems] = useState([]);
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatImportedItems = (data) =>
    data.map(i => ({
      id: i.policyId ?? i.id,
      level: i.level,
      title: i.title,
      version: i.version
    })).filter(item => item.id != null);

  const refreshImportedItems = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/framauditor/imported-policies", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImportedItems(formatImportedItems(data));
    } catch (err) {
      console.error("❌ Failed to refresh imported items:", err);
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
      console.error("❌ Failed to refresh excluded items:", err);
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
      console.error("❌ Import error:", err);
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
      console.error("❌ Unimport error:", err);
      await refreshImportedItems();
    }
  };

  const handleAddException = async (target, reason) => {
    if (!target || target.id == null || excludedItems.some(i =>i.id === target.id && i.level === target.level)) return;
    try {
      await fetch("http://localhost:3000/api/framauditor/add-exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policyId: target.id, level: target.level, title: target.title, reason })
      });
      await refreshExcludedItems();
    } catch (err) {
      console.error("❌ Error saving exception:", err);
    }
  };

  const allPolicies = policies;
  const displayed = (allPolicies || [])
    .filter(p => filterPkg === "all" || resolveId(p) === parseInt(filterPkg))
    .filter(p => {
      if (showImportedOnly) return importedItems.some(i =>i.id === resolveId(p) && i.level === "package");
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
      <div style={{ fontFamily:F.body, background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:16 }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:C.textMid }}>Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily:F.body, background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center", background:C.surface, padding:32, borderRadius:16, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <p style={{ color:C.danger, marginBottom:16 }}>{error}</p>
          <button onClick={()=>window.location.reload()} style={{ padding:"8px 20px", borderRadius:8, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:F.body, background:C.bg, minHeight:"100vh", padding:"26px 30px" }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <h1 style={{ fontFamily:F.display, fontSize:25, fontWeight:900, color:C.text, margin:0 }}>Policy Library</h1>
              <span style={{ fontFamily:F.body, fontSize:12, background:C.successLight, color:C.success, padding:"3px 8px", borderRadius:20 }}>
                {importedItems.length} imported
              </span>
            </div>
            <p style={{ fontFamily:F.body, fontSize:13, color:C.textMid, margin:0 }}>
              Import policies from admin to your library. Importing a package imports all its chapters and items automatically.
              Click "Add exception" to exclude policies from compliance scope.
            </p>
          </div>
          <button onClick={()=>navigate("/layout/exception")}
            style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${C.accent}`, cursor:"pointer", fontFamily:F.body, fontSize:13, fontWeight:600, color:C.accent, display:"flex", alignItems:"center", gap:7, background:C.surface }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            View Exceptions ({excludedItems.length})
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={()=>setFilterPkg("all")} style={{ padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer", background:filterPkg==="all"?`linear-gradient(135deg,${C.accent},${C.accentHover})`:C.surfaceAlt, color:filterPkg==="all"?"#fff":C.textMid, fontFamily:F.body, fontSize:12, fontWeight:600, transition:"all .15s", boxShadow:filterPkg==="all"?"0 2px 6px rgba(59,111,255,.3)":"none" }}>All</button>
        {allPolicies?.map(p => {
          const pId = resolveId(p);
          return (
            <button key={pId} onClick={()=>setFilterPkg(pId?.toString() || "")} style={{ padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer", background:filterPkg===pId?.toString()?`linear-gradient(135deg,${C.accent},${C.accentHover})`:C.surfaceAlt, color:filterPkg===pId?.toString()?"#fff":C.textMid, fontFamily:F.body, fontSize:12, fontWeight:600, transition:"all .15s", boxShadow:filterPkg===pId?.toString()?"0 2px 6px rgba(59,111,255,.3)":"none" }}>
              {p.title.length > 20 ? p.title.substring(0,20)+"..." : p.title}
            </button>
          );
        })}
        <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
            <input type="checkbox" checked={showImportedOnly} onChange={e=>setShowImportedOnly(e.target.checked)}/>
            <span style={{ fontFamily:F.body, fontSize:12, color:C.textMid }}>Show only imported</span>
          </label>
          <div style={{ position:"relative" }}>
            <input placeholder="Search policies…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ width:190, padding:"7px 12px 7px 30px", border:`1px solid ${C.border}`, borderRadius:9, fontFamily:F.body, fontSize:13, color:C.text, background:C.surface, outline:"none" }}/>
            <svg style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)" }} width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke={C.textMuted} strokeWidth="1.4"/>
              <path d="M9 9L12 12" stroke={C.textMuted} strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {displayed.length === 0
          ? <div style={{ textAlign:"center", padding:"50px 0", color:C.textMuted, fontFamily:F.body, fontSize:14 }}>No policies match your search.</div>
          : displayed.map((pkg, idx) => {
              const pkgId = resolveId(pkg);
              const isNew = !importedItems.some(i =>i.id === pkgId && i.level === "package") &&
                            !excludedItems.some(i =>i.id === pkgId && i.level === "package");
              return (
                <PackagePanel key={pkgId ?? idx}
                  pkg={{ ...pkg, id: pkgId }}
                  isNew={isNew}
                  importedItems={importedItems}
                  excludedItems={excludedItems}
                  onImport={target => setModal({ target, color: pkg.color || "#3B6FFF" })}
                  onUnimport={target => setUnimportModal({ target, color: pkg.color || "#3B6FFF" })}
                  onAddException={target => setExceptionModal({ target })}
                />
              );
            })
        }
      </div>

      {modal && (
        <ImportModal
          target={modal.target}
          color={modal.color}
          onClose={()=>setModal(null)}
          onConfirm={handleImport}
        />
      )}
      {unimportModal && (
        <UnimportModal
          target={unimportModal.target}
          color={unimportModal.color}
          onClose={()=>setUnimportModal(null)}
          onConfirm={handleUnimport}
        />
      )}
      {exceptionModal && (
        <ExceptionModal
          target={exceptionModal.target}
          onClose={()=>setExceptionModal(null)}
          onConfirm={reason=>handleAddException(exceptionModal.target, reason)}
        />
      )}
    </div>
  );
}