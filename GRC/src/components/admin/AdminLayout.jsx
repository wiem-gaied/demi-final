import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShieldCheck, Bell, ChevronLeft, ChevronRight,
  Users, Key, Settings, LogOut, UserCircle, Building2, Plus, X,
  Search, Globe, Mail, Phone, Trash2, Loader2, Layers, List, BarChart,
  Bot, Send, Minimize2, Maximize2, RefreshCw, BotMessageSquare, AlertCircle, FileText
} from "lucide-react";

// ─── Design tokens ───────────────────────────────────────────
const C = {
  wow: "#3B6FFF",
  warning: "#061585",
};
C.accent = `linear-gradient(135deg, ${C.wow}, ${C.warning})`;
// Couleur unie proche du dégradé (bordures / texte, où le dégradé est impossible)
C.accentSolid = "#2A4AD0";

const fetchAdminProfile = async () => {
  const res = await fetch("http://localhost:3000/api/admin/profile", {
    credentials: "include"
  });
  if (!res.ok) throw new Error("Erreur récupération profil");
  return res.json();
};

const handleLogout = async () => {
  try {
    await fetch("http://localhost:3000/api/logout", { method: "POST", credentials: "include" });
  } catch (err) {
    console.error("Logout error:", err);
  }
  window.location.href = "/";
};

const SECTOR_COLORS = {
  "Finance":     { bg: "#EEF4FF", accent: "#3B6FFF", light: "#DBEAFE" },
  "Santé":       { bg: "#F0FDF4", accent: "#16A34A", light: "#DCFCE7" },
  "Industrie":   { bg: "#FFF7ED", accent: "#EA580C", light: "#FFEDD5" },
  "Technologie": { bg: "#FAF5FF", accent: "#7C3AED", light: "#EDE9FE" },
  "Éducation":   { bg: "#FFFBEB", accent: "#D97706", light: "#FEF3C7" },
  "Autre":       { bg: "#F8FAFC", accent: "#475569", light: "#E2E8F0" },
};

function AdminAvatar({ admin, size = 28, radius = "7px", fontSize = "10px" }) {
  if (admin?.avatar) {
    return (
      <img src={admin.avatar} alt={admin?.name ?? "Admin"}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: C.accent,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize, fontWeight: "700",
    }}>
      {admin?.initials ?? "?"}
    </div>
  );
}

function ProfileSkeleton() {
  const bar = (w, h = "10px") => (
    <div style={{ width: w, height: h, borderRadius: "5px", background: "#E2E8F0", animation: "shimmer 1.4s ease-in-out infinite" }} />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "5px 11px 5px 5px", borderRadius: "9px", border: "1.5px solid #F1F5F9", background: "#fff" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#E2E8F0", animation: "shimmer 1.4s ease-in-out infinite", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {bar("80px")}
        {bar("52px", "8px")}
      </div>
    </div>
  );
}

// ─── AI Chatbot Component - Version OLLAMA (identique à Layout.jsx) ──────────
function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your GRC assistant powered by Mistral AI. I can help you with compliance questions, risk analysis, audit queries, and more. How can I help you today?",
      ts: new Date(),
    }
  ]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Vérifier la connexion au backend
  useEffect(() => {
    checkBackendConnection();
  }, []);

// Au lieu de /api/chatbot/chatbot/status, utilisez /api/chatbot/status
const checkBackendConnection = async () => {
  try {
    console.log("🔍 Vérification connexion backend...");
    // ✅ Correction : enlever un /chatbot
    const response = await fetch("http://localhost:3000/api/chatbot/status", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend connecté:", data);
      setOllamaStatus({ status: 'ok', activeSessions: 0 });
      setError(null);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.error("❌ Erreur connexion backend:", err);
    setError("Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:3000");
    setOllamaStatus({ status: 'error', activeSessions: 0 });
  }
};
  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      console.log("📤 Envoi du message:", text);
      
      const response = await fetch("http://localhost:3000/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId
        })
      });
      
      console.log("📥 Statut réponse:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📦 Données reçues:", data);
      
      if (data.success) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message, 
          ts: new Date() 
        }]);
        
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
        }
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (err) {
      console.error("❌ Erreur:", err);
      setError(`Erreur: ${err.message}`);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Erreur de connexion: ${err.message}. Vérifiez que le backend est démarré.`,
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      role: "assistant",
      content: "Conversation réinitialisée ! Comment puis-je vous aider aujourd'hui ?",
      ts: new Date(),
    }]);
    setSessionId(`session_${Date.now()}`);
    setError(null);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = ts => ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const chatW = expanded ? "440px" : "380px";
  const chatH = expanded ? "640px" : "520px";

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 999,
            width: "54px", height: "54px", borderRadius: "16px", border: "none",
            background: C.accent,
            boxShadow: "0 8px 32px rgba(59,111,255,0.40)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          title="GRC AI Assistant (Mistral)"
        >
          <BotMessageSquare size={24} color="#fff" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: "28px", right: "28px", zIndex: 999,
          width: chatW, height: chatH,
          background: "#fff", borderRadius: "20px",
          border: "1.5px solid #E8EFFE",
          boxShadow: "0 24px 80px rgba(59,111,255,0.18)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "width 0.22s, height 0.22s",
        }}>
          {/* Header */}
          <div style={{
            background: C.accent,
            padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
          }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "10px",
              background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BotMessageSquare size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: "13px", fontWeight: "700" }}>GRC Assistant</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: ollamaStatus?.status === 'ok' ? "#4ADE80" : "#EF4444" }} />
                {ollamaStatus?.status === 'ok' ? "Connecté · Mistral AI" : "Ollama indisponible"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={resetChat} title="Reset chat" style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={13} />
              </button>
              <button onClick={() => setExpanded(v => !v)} style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button onClick={() => setOpen(false)} style={{ width: "28px", height: "28px", borderRadius: "7px", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              padding: "10px 14px", background: "#FEF2F2", borderBottom: "1px solid #FEE2E2",
              display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#DC2626"
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BotMessageSquare size={12} color="#fff" />
                  </div>
                )}
                <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: "3px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding: "10px 13px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? C.accent : "#F8FAFF",
                    color: msg.role === "user" ? "#fff" : "#1E293B",
                    fontSize: "12.5px", lineHeight: "1.55",
                    border: msg.role === "assistant" ? "1.5px solid #EEF4FF" : "none",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ color: "#CBD5E1", fontSize: "9.5px" }}>{formatTime(msg.ts)}</div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BotMessageSquare size={12} color="#fff" />
                </div>
                <div style={{ padding: "12px 15px", borderRadius: "14px", background: "#F8FAFF", border: "1.5px solid #EEF4FF", display: "flex", gap: "4px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.accentSolid, animation: "bounce 0.9s 0s ease-in-out infinite" }} />
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.accentSolid, animation: "bounce 0.9s 0.2s ease-in-out infinite" }} />
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.accentSolid, animation: "bounce 0.9s 0.4s ease-in-out infinite" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1.5px solid #F1F5F9", flexShrink: 0, background: "#fff" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", background: "#F8FAFF", borderRadius: "13px", border: "1.5px solid #EEF4FF", padding: "8px 12px" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about compliance, risks, audits..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, border: "none", background: "transparent", outline: "none",
                  fontSize: "12.5px", color: "#1E293B", resize: "none",
                  lineHeight: "1.5", maxHeight: "80px", overflowY: "auto",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  width: "32px", height: "32px", borderRadius: "9px", border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? C.accent : "#E2E8F0",
                  color: input.trim() && !loading ? "#fff" : "#94A3B8",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              </button>
            </div>
            <div style={{ textAlign: "center", color: "#CBD5E1", fontSize: "9.5px", marginTop: "7px" }}>
              Powered by Mistral AI (Ollama) · GRC Platform
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
// ─── Main App ─────────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage]               = useState("dashboard");
  const [showNotif, setShowNotif]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [admin, setAdmin]               = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError]     = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const [notifs, setNotifs]             = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  useEffect(() => {
    setAdminLoading(true);
    fetchAdminProfile()
      .then(data  => { setAdmin(data);             setAdminLoading(false); })
      .catch(err  => { setAdminError(err.message); setAdminLoading(false); });
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const navItems = [
    { to: '/admin/dashboard',  id: "dashboard",  label: "Managed companies",        icon: LayoutDashboard },
    { to: '/admin/access',     id: "access",     label: "Access & Controls", icon: ShieldCheck     },
    { to: '/admin/frameworks', id: "frameworks", label: "Policies Library",        icon: Layers          },
    {  icon: FileText, label: "Logs", subOptions: [
      { to: "/admin/log", icon: FileText, label: " Event Log"},
      { to: "/admin/LogsActivityadmin", icon: FileText, label: " Activity Log"}
      ]
    },
    
  ];

  const notifColor = t =>
    t === "alert"   ? "#EF4444" :
    t === "warning" ? "#F59E0B" :
    t === "success" ? "#16A34A" : "#3B6FFF";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn    { from { opacity:0; transform:scale(0.92); }     to { opacity:1; transform:scale(1);    } }
        @keyframes shimmer  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin     { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes bounce   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #F8FAFC; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 2px; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "#F8FAFC", overflow: "hidden" }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div style={{
          width: sidebarOpen ? "224px" : "62px",
          background: "#fff", borderRight: "1px solid #F1F5F9",
          display: "flex", flexDirection: "column",
          transition: "width 0.26s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0, zIndex: 20, overflow: "hidden",
          boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
        }}>
          <div style={{ padding: "16px 13px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px", minHeight: "60px" }}>
            
            {sidebarOpen && (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <div style={{ color: "#0F172A", fontSize: 15, fontWeight: "800", fontFamily: "'Fraunces', serif" }}>GRC Admin</div>
              </div>
            )}
          </div>

          <nav style={{ flex: 1, padding: "10px 7px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {navItems.map(item => {
  const Icon = item.icon;
  const active = page === item.id;
  const hasSubOptions = item.subOptions?.length > 0;
  const isOpen = openSubMenu === item.id;

  return (
    <div key={item.id}>
      <button
        onClick={() => {
          if (hasSubOptions) {
            setOpenSubMenu(isOpen ? null : item.id);
          } else {
            setPage(item.id);
            navigate(item.to);
          }
        }}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 11px", borderRadius: "9px",
          border: active ? `2px solid ${C.accentSolid}` : "2px solid transparent",
          background: "transparent",
          color: active ? C.accentSolid : "#64748B",
          cursor: "pointer", width: "100%", whiteSpace: "nowrap", overflow: "hidden",
        }}
      >
        <Icon size={17} style={{ flexShrink: 0 }} />
        {sidebarOpen && <span style={{ fontSize: "13px", fontWeight: active ? "700" : "500" }}>{item.label}</span>}
        {sidebarOpen && hasSubOptions && (
          <ChevronRight size={13} style={{ marginLeft: "auto", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
        )}
      </button>

      {/* Sous-menu */}
      {hasSubOptions && isOpen && sidebarOpen && (
        <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
          {item.subOptions.map(sub => {
            const SubIcon = sub.icon;
            return (
              <button
                key={sub.to}
                onClick={() => { setPage(item.id); navigate(sub.to); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 11px", borderRadius: "8px", border: "none",
                  background: "transparent", color: "#64748B",
                  cursor: "pointer", fontSize: "12px", width: "100%",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#0F172A"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
              >
                <SubIcon size={14} style={{ flexShrink: 0 }} />
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
})}
          </nav>

          <div style={{ padding: "10px 7px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{
              display: "flex", alignItems: "center", gap: "9px", padding: "9px 11px",
              borderRadius: "9px", border: "none", background: "#F8FAFC",
              color: "#94A3B8", cursor: "pointer", width: "100%", transition: "all 0.15s",
            }}>
              {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              {sidebarOpen && <span style={{ fontSize: "12px", fontWeight: "500" }}>Réduire</span>}
            </button>
          </div>
        </div>

        {/* ── Right ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Topbar ────────────────────────────────────────────────────── */}
          <div style={{
            height: "60px", background: "#fff", borderBottom: "1px solid #F1F5F9",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 22px", flexShrink: 0, boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ color: "#CBD5E1", fontSize: "13px" }}>Admin</span>
              <span style={{ color: "#E2E8F0" }}>/</span>
              <span style={{ color: "#0F172A", fontSize: "13px", fontWeight: "600" }}>
                {navItems.find(n => n.id === page)?.label ?? "Dashboard"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

              {/* ── Notifications ──────────────────────────────────────────── */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowNotif(v => !v); setShowProfile(false); }} style={{
                  width: "36px", height: "36px", borderRadius: "9px", border: "1.5px solid #F1F5F9",
                  background: showNotif ? "#EEF4FF" : "#fff", color: showNotif ? "#3B6FFF" : "#64748B",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", transition: "all 0.15s",
                }}>
                  <Bell size={16} />
                  {!notifsLoading && unread > 0 && (
                    <div style={{ position: "absolute", top: "5px", right: "5px", width: "15px", height: "15px", borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: "8px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{unread}</div>
                  )}
                </button>

                {showNotif && (
                  <div style={{ position: "absolute", right: 0, top: "44px", width: "300px", background: "#fff", border: "1.5px solid #F1F5F9", borderRadius: "14px", boxShadow: "0 16px 48px rgba(0,0,0,0.12)", animation: "fadeDown 0.2s ease", zIndex: 100, overflow: "hidden" }}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#0F172A", fontSize: "13px", fontWeight: "700" }}>Notifications</span>
                      <button onClick={() => setNotifs(ns => ns.map(n => ({ ...n, read: true })))} style={{ background: "none", border: "none", color: C.accentSolid, fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Read all</button>
                    </div>
                    {notifsLoading ? (
                      <div style={{ padding: "28px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <Loader2 size={18} color="#94A3B8" style={{ animation: "spin 1s linear infinite" }} />
                      </div>
                    ) : notifs.length === 0 ? (
                      <div style={{ padding: "28px", textAlign: "center", color: "#94A3B8", fontSize: "12px" }}>Aucune notification</div>
                    ) : notifs.map(n => (
                      <div key={n.id} style={{ padding: "11px 16px", display: "flex", gap: "10px", alignItems: "flex-start", background: n.read ? "#fff" : "#F8FBFF", borderBottom: "1px solid #F8FAFC", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                        onMouseLeave={e => e.currentTarget.style.background = n.read ? "#fff" : "#F8FBFF"}
                      >
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: n.read ? "#E2E8F0" : notifColor(n.type), flexShrink: 0, marginTop: "4px" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: n.read ? "#94A3B8" : "#0F172A", fontSize: "12px", fontWeight: n.read ? "400" : "500" }}>{n.title}</div>
                          <div style={{ color: "#CBD5E1", fontSize: "10px", marginTop: "2px" }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Profil admin ────────────────────────────────────────────── */}
              <div style={{ position: "relative" }}>
                {adminLoading && <ProfileSkeleton />}
                {!adminLoading && adminError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 12px 5px 5px", borderRadius: "9px", border: "1.5px solid #FEE2E2", background: "#FEF2F2" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#FECACA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UserCircle size={16} color="#EF4444" />
                    </div>
                    <span style={{ color: "#EF4444", fontSize: "11px", fontWeight: "600" }}>Profil indisponible</span>
                  </div>
                )}
                {!adminLoading && !adminError && admin && (
                  <button onClick={() => { setShowProfile(v => !v); setShowNotif(false); }} style={{
                    display: "flex", alignItems: "center", gap: "9px", padding: "5px 11px 5px 5px",
                    borderRadius: "9px", border: "1.5px solid #F1F5F9",
                    background: showProfile ? "#EEF4FF" : "#fff", cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <AdminAvatar admin={admin} size={28} radius="7px" fontSize="10px" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#0F172A", fontSize: "12px", fontWeight: "700" }}>{admin.name}</div>
                      <div style={{ color: "#94A3B8", fontSize: "10px" }}>{admin.role}</div>
                    </div>
                  </button>
                )}
                {showProfile && admin && (
                  <div style={{ position: "absolute", right: 0, top: "44px", width: "260px", background: "#fff", border: "1.5px solid #F1F5F9", borderRadius: "14px", boxShadow: "0 16px 48px rgba(0,0,0,0.12)", animation: "fadeDown 0.2s ease", zIndex: 100, overflow: "hidden" }}>
                    <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #F1F5F9", textAlign: "center" }}>
                      <div style={{ margin: "0 auto 10px", width: "fit-content", boxShadow: "0 6px 20px rgba(59,111,255,0.25)", borderRadius: "13px" }}>
                        <AdminAvatar admin={admin} size={52} radius="13px" fontSize="18px" />
                      </div>
                      <div style={{ color: "#0F172A", fontSize: "14px", fontWeight: "800", fontFamily: "'Fraunces',serif" }}>{admin.name}</div>
                      <div style={{ color: "#94A3B8", fontSize: "11px", marginTop: "3px" }}>{admin.email}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "9px", background: C.accent, color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "700" }}>
                        <ShieldCheck size={9} /> {admin.role}
                      </div>
                    </div>
                    <div style={{ padding: "11px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94A3B8", fontSize: "10px", fontWeight: "600" }}>Organization</span>
                        <span style={{ color: "#475569", fontSize: "11px", fontWeight: "600" }}>{admin.organization}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94A3B8", fontSize: "10px", fontWeight: "600" }}>last login</span>
                        <span style={{ color: "#475569", fontSize: "11px" }}>{admin.lastLogin}</span>
                      </div>
                    </div>
                    {[{ to:"/layout/profile", icon: UserCircle, label: "Profile" }].map((a, i) => {
                      const Icon = a.icon;
                      return (
                      <button key={i} 
                       onClick={() => a.to && navigate(a.to)}
                       style={{
                        display: "flex", alignItems: "center", gap: "9px",
                        width: "100%", padding: "10px 13px",
                        border: "none", background: "transparent",
                        color: "#475569", fontSize: "12px", fontWeight: "500",
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <Icon size={14} /> {a.label}
                      </button>
                    );
                    })}
                    <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "9px", width: "100%", padding: "10px 13px", border: "none", borderTop: "1px solid #F1F5F9", background: "transparent", color: "#EF4444", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "36px" }}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── AI Chatbot — fixed bottom-right, outside layout flow ─────────── */}
      <AIChatbot />
    </>
  );
}