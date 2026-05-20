import { useState, useMemo, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — same palette as your GRC platform
// ─────────────────────────────────────────────────────────────────
const C = {
  primary:  "#3B6FFF",
  purple:   "#6D28D9",
  bg:       "#F8FAFF",
  surface:  "#FFFFFF",
  border:   "#E4EAF8",
  borderLight: "#EFF3FC",
  text:     "#0F1A3E",
  muted:    "#64748B",
  danger:   "#EF4444",
  warning:  "#F97316",
  amber:    "#F59E0B",
  success:  "#10B981",
  teal:     "#0D9488",
  shadow: "0 1px 3px rgba(15,23,42,0.07)",
};

// ─────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(15,26,62,0.5)", backdropFilter: "blur(5px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div style={{
      background: C.surface, borderRadius: 16,
      width: wide ? "min(760px,97vw)" : "min(600px,95vw)",
      maxHeight: "92vh", overflowY: "auto",
      boxShadow: "0 24px 64px rgba(59,111,255,0.18)",
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        padding: "18px 26px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, background: C.surface, zIndex: 1,
      }}>
        <h2 style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 19, color: C.text, fontWeight: 700 }}>
          {title}
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted }}>×</button>
      </div>
      <div style={{ padding: 26 }}>{children}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE — name + description only
// ─────────────────────────────────────────────────────────────────
export default function BusinessRisks() {
  const [risks, setRisks] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // ── Load risks (only id, name, description are kept)
  useEffect(() => {
    fetch("http://localhost:3000/api/risks/getrisks")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mappedRisks = data.map(risk => ({
            id: risk.id,
            title: risk.intitule,
            description: risk.description,
          }));
          setRisks(mappedRisks);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // ── derived
  const filteredRisks = useMemo(() => {
    const safeRisks = Array.isArray(risks) ? risks : [];
    const q = search.toLowerCase().trim();
    return safeRisks.filter(r =>
      (r.title || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q)
    );
  }, [risks, search]);

  // ── delete
  const confirmDelete = (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
    setModal("delete");
  };
  const doDelete = async () => {
    await fetch(`http://localhost:3000/api/businessRisks/${deleteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setRisks(prev => prev.filter(r => r.id !== deleteId));
    setModal(null);
  };

  // ── styles
  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${C.border}`,
    fontFamily: "'DM Sans',sans-serif", fontSize: 14,
    color: C.text, background: C.bg, boxSizing: "border-box", outline: "none",
  };
  const btnGhost = {
    background: "none", color: C.primary, border: `1.5px solid ${C.primary}`,
    borderRadius: 8, padding: "7px 16px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13,
  };
  const btnPrimary = {
    background: `linear-gradient(135deg,${C.primary},${C.purple})`,
    color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 20px", cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14,
  };
  const iconBtn = {
    background: "none", border: `1px solid ${C.border}`,
    borderRadius: 7, cursor: "pointer", padding: "4px 8px",
    color: C.muted, fontSize: 13, lineHeight: 1,
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:6px;}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 28px", fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0,  fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.4 }}>
              Business Risk Register
            </h1>
            <p style={{ margin: "5px 0 0", color: C.muted, fontSize: 14 }}>
              Identify and track enterprise-level business risks.
            </p>
          </div>
        </div>

        {/* ── SEARCH ─────────────────────────────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 12, padding: "14px 18px",
          border: `1px solid ${C.border}`, marginBottom: 22,
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        }}>
          <input
            placeholder="🔍 Search by name or description…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inp, width: 320, flex: "0 0 auto" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ ...btnGhost, fontSize: 12, padding: "6px 12px" }}>Clear</button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted, fontWeight: 600 }}>
            {filteredRisks.length} / {risks.length} risks
          </span>
        </div>

        {/* ── RISK LIST (name + description only) ─────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredRisks.length === 0 && (
            <div style={{
              background: C.surface, borderRadius: 12, padding: "52px 0",
              textAlign: "center", color: C.muted,
              border: `1px solid ${C.border}`, fontSize: 14,
            }}>No business risks found.</div>
          )}

          {filteredRisks.map(risk => (
            <div
              key={risk.id}
              style={{
                background: C.surface,
                borderRadius: 14,
                border: `2px solid ${C.border}`,
                overflow: "hidden",
                boxShadow: C.shadow,
              }}
            >
              <div style={{
                padding: "16px 20px",
                borderLeft: `4px solid ${C.primary}`,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.3 }}>
                    {risk.title}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
                    {risk.description || "—"}
                  </div>
                </div>
                <button onClick={e => confirmDelete(risk.id, e)} style={iconBtn} title="Delete">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DELETE CONFIRM ──────────────────────────────────────── */}
      {modal === "delete" && (
        <Modal title="Delete Business Risk" onClose={() => setModal(null)}>
          <p style={{ margin: "0 0 24px", color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete this business risk? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={btnGhost} onClick={() => setModal(null)}>Cancel</button>
            <button style={{ ...btnPrimary, background: C.danger }} onClick={doDelete}>Delete permanently</button>
          </div>
        </Modal>
      )}
    </>
  );
}