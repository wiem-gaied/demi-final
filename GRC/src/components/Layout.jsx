// src/components/Layout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";

import {
  BotMessageSquare,
  Send,
  Loader2,
  RefreshCw,
  Minimize2,
  Maximize2,
  Menu as MenuIcon,
  X,
  LayoutDashboard,
  Bell,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle as CheckCircleIcon,
  Shield,
  UserCircle,
  LogOut,
  ShieldCheck,
  BarChart,
  AlertCircle
} from "lucide-react";

const SEED_ORGS = [];
const MOCK_NOTIFICATIONS = [];

const menuItems = [
  { to: "/layout/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  {
    icon: CheckCircle, label: "Compliance", subOptions: [
      { to: "/layout/conformite/Politiques", label: "All Policies & Proofs" },
      { to: "/layout/conformite", label: "Compliance Test" },
      { to: "/layout/exception", label: "Exception " },
    ],
  },
  {
    to: "/layout/risques", icon: AlertTriangle, label: "Risk management", subOptions: [
      { to: "/layout/risques", label: "Identification & Assessment" },
      { to: "/layout/assets", label: "Assets " },
      { to: "/layout/business", label: "Business " },
    ]
  },
  { to: "/layout/logs", icon: FileText, label: "Logs", roles: ["auditor"] },
  { to: "/layout/reporting", icon: BarChart, label: "Reporting" },
  { to: "/layout/settings", icon: Settings, label: "Settings", roles: ["auditor"] },
];

const handleLogout = async () => {
  try {
    await fetch("http://localhost:3000/api/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
  window.location.href = "/";
};

/* ─── OrgSelector ──────────────────────────────────────────── */
const OrgSelector = ({ orgs, activeOrg, setActiveOrg }) => {
  const [open, setOpen] = useState(false);
  const org = orgs.find(o => o.id === activeOrg);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "7px 12px", background: "#fff",
          border: "1.5px solid #F1F5F9", borderRadius: "10px",
          cursor: "pointer", transition: "border-color .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#3B6FFF"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#F1F5F9"}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
          color: "#fff", fontWeight: 700, fontSize: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {org?.logo}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{org?.name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>{org?.sector}</div>
        </div>
        <ChevronDown size={14} style={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            width: 250, background: "#fff",
            border: "1.5px solid #F1F5F9", borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            zIndex: 50, animation: "fadeDown .18s ease-out",
          }}>
            <div style={{ padding: "9px 14px 7px", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Organisations
              </span>
            </div>
            {orgs.map(o => (
              <div
                key={o.id}
                onClick={() => { setActiveOrg(o.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  background: o.id === activeOrg ? "#EEF4FF" : "transparent",
                  transition: "background .15s",
                }}
                onMouseEnter={e => { if (o.id !== activeOrg) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={e => { if (o.id !== activeOrg) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: o.id === activeOrg ? "linear-gradient(135deg,#3B6FFF,#6D28D9)" : "#EEF4FF",
                  color: o.id === activeOrg ? "#fff" : "#3B6FFF",
                  fontWeight: 700, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {o.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{o.sector}</div>
                </div>
                {o.id === activeOrg && <CheckCircleIcon size={14} style={{ color: "#3B6FFF" }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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

function UserAvatar({ user, size = 28, radius = "7px", fontSize = "10px" }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name ?? "user"}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize, fontWeight: "700",
    }}>
      {user?.initials ?? "?"}
    </div>
  );
}

// ─── AI Chatbot Component with Ollama Mistral ────────────────────────────────
function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
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

  // Vérifier le statut d'Ollama au démarrage
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/chatbot/status", {
        method: "GET",
        credentials: "include"
      });
      const data = await response.json();
      setOllamaStatus(data);
      
      if (!data.ollamaRunning) {
        setError("Ollama n'est pas disponible. Veuillez démarrer Ollama.");
      }
    } catch (err) {
      console.error("Erreur vérification statut:", err);
      setError("Impossible de se connecter au serveur chatbot.");
      setOllamaStatus({ ollamaRunning: false });
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
    if (!text || loading || error) return;

    const userMsg = { role: "user", content: text, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/api/chatbot/message", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message, 
          ts: new Date() 
        }]);
      } else {
        throw new Error(data.error || "Erreur de réponse");
      }
    } catch (err) {
      console.error("Erreur envoi message:", err);
      setError(err.message || "Erreur de connexion au chatbot");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error. Please check if the chatbot backend is running and Ollama is started.",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/chatbot/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId }),
      });
      
      const data = await response.json();
      
      setMessages([{
        role: "assistant",
        content: "Conversation réinitialisée ! Comment puis-je vous aider aujourd'hui ?",
        ts: new Date(),
      }]);
      
      if (data.message) {
        console.log("Reset confirmé:", data.message);
      }
    } catch (err) {
      console.error("Erreur reset:", err);
    } finally {
      setLoading(false);
    }
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
      {/* ── Floating Button ─────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 999,
            width: "54px", height: "54px", borderRadius: "16px", border: "none",
            background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
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

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
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
            background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
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
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: ollamaStatus?.ollamaRunning ? "#4ADE80" : "#EF4444" }} />
                {ollamaStatus?.ollamaRunning ? "Mistral AI · Prêt" : "Ollama indisponible"}
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

          {/* Quick suggestions */}
          {messages.length === 1 && ollamaStatus?.ollamaRunning && (
            <div style={{ padding: "12px 14px 4px", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0, borderBottom: "1px solid #F1F5F9" }}>
              {["ISO 27001 controls", "Risk assessment matrix", "Audit checklist", "GDPR compliance", "NIS2 requirements"].map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{
                  padding: "5px 10px", borderRadius: "20px", border: "1.5px solid #E8EFFE",
                  background: "#F5F8FF", color: "#3B6FFF", fontSize: "11px", fontWeight: "600",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BotMessageSquare size={12} color="#fff" />
                  </div>
                )}
                <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: "3px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding: "10px 13px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "linear-gradient(135deg,#3B6FFF,#6D28D9)" : "#F8FAFF",
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

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "linear-gradient(135deg,#3B6FFF,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BotMessageSquare size={12} color="#fff" />
                </div>
                <div style={{ padding: "12px 15px", borderRadius: "14px", background: "#F8FAFF", border: "1.5px solid #EEF4FF", display: "flex", gap: "4px" }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3B6FFF", animation: `bounce 0.9s ${delay}s ease-in-out infinite` }} />
                  ))}
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
                disabled={!ollamaStatus?.ollamaRunning}
                style={{
                  flex: 1, border: "none", background: "transparent", outline: "none",
                  fontSize: "12.5px", color: "#1E293B", resize: "none",
                  lineHeight: "1.5", maxHeight: "80px", overflowY: "auto",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !ollamaStatus?.ollamaRunning}
                style={{
                  width: "32px", height: "32px", borderRadius: "9px", border: "none", flexShrink: 0,
                  background: input.trim() && !loading && ollamaStatus?.ollamaRunning ? "linear-gradient(135deg,#3B6FFF,#6D28D9)" : "#E2E8F0",
                  color: input.trim() && !loading && ollamaStatus?.ollamaRunning ? "#fff" : "#94A3B8",
                  cursor: input.trim() && !loading && ollamaStatus?.ollamaRunning ? "pointer" : "default",
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

/* ─── NotificationsDropdown ─────────────────────────────────── */
const NotificationsDropdown = ({ notifications, onNotificationClick, onMarkAllAsRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const navigate = useNavigate();
  const location = useLocation();

  const typeStyle = (type) => ({
    warning: { bg: "#FFFBEB", color: "#D97706" },
    success: { bg: "#F0FDF4", color: "#16A34A" },
    info: { bg: "#EFF6FF", color: "#3B6FFF" },
  }[type] || { bg: "#EEF4FF", color: "#3B6FFF" });

  const handleClick = (notif) => {
    onNotificationClick(notif);
    const routes = { warning: "/risques", success: "/audit", info: "/conformite" };
    const target = routes[notif.type] || "/dashboard";
    if (location.pathname !== target) navigate(target);
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          width: "36px", height: "36px",
          borderRadius: 9, border: "1.5px solid #F1F5F9",
          background: isOpen ? "#EEF4FF" : "#fff",
          color: isOpen ? "#3B6FFF" : "#64748B",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .15s",
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = "#F8FAFC"; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = "#fff"; } }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            width: 15, height: 15,
            background: "#EF4444", color: "#fff",
            fontSize: 8, fontWeight: 700, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "44px",
            width: 300, background: "#fff",
            border: "1.5px solid #F1F5F9", borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            zIndex: 50, animation: "fadeDown .2s ease",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 16px", borderBottom: "1px solid #F1F5F9",
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={() => { onMarkAllAsRead(); setIsOpen(false); }}
                  style={{ fontSize: 11, color: "#3B6FFF", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                  Aucune notification
                </div>
              ) : notifications.map(notif => {
                const ts = typeStyle(notif.type);
                return (
                  <div key={notif.id} onClick={() => handleClick(notif)}
                    style={{
                      padding: "11px 16px", borderBottom: "1px solid #F8FAFC",
                      background: notif.read ? "#fff" : "#F8FBFF",
                      cursor: "pointer", display: "flex", gap: 10,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                    onMouseLeave={e => e.currentTarget.style.background = notif.read ? "#fff" : "#F8FBFF"}
                  >
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: notif.read ? "#E2E8F0" : ts.color,
                      flexShrink: 0, marginTop: 4,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: notif.read ? 400 : 500, color: notif.read ? "#94A3B8" : "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {notif.title}
                        </p>
                      </div>
                      <p style={{ fontSize: 10, color: "#CBD5E1", marginTop: 2 }}>{notif.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid #F1F5F9" }}>
              <button onClick={() => setIsOpen(false)} style={{
                width: "100%", padding: "8px", borderRadius: 8,
                background: "#EEF4FF", border: "none",
                color: "#3B6FFF", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                onMouseLeave={e => e.currentTarget.style.background = "#EEF4FF"}
              >
                Voir toutes les notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Layout principal ──────────────────────────────────────── */
const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [showNotif, setShowNotif] = useState(false);

  const toggleSubMenu = (label) => {
    setOpenMenu(openMenu === label ? null : label);
  };
  const [role, setRole] = useState(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [orgs] = useState(SEED_ORGS);
  const [activeOrg, setActiveOrg] = useState(() => localStorage.getItem("activeOrg") || SEED_ORGS[0]?.id);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const currentPath = location.pathname;
  const currentItem = menuItems.find(item => item.to === currentPath);
  const currentLabel = currentItem ? currentItem.label : "Dashboard";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/admin/profile", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error("Erreur lors de la récupération du profile");

        const data = await res.json();
        setUser({
          ...data,
          initials: data.initials,
        });
        setRole(data.role);
        setUserLoading(false);
      } catch (err) {
        console.error(err);
        setUserError(true);
        setUserLoading(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (activeOrg) localStorage.setItem("activeOrg", activeOrg);
  }, [activeOrg]);

  const handleNotificationClick = (notification) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC", overflow: "hidden" }}>

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside style={{
        width: menuOpen ? "224px" : "62px",
        background: "#fff",
        borderRight: "1px solid #F1F5F9",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.26s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
        zIndex: 20,
        overflow: "hidden",
        boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 13px",
          borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", gap: "10px",
          minHeight: "60px",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(59,111,255,0.3)",
          }}>
            <Shield size={16} style={{ color: "#fff" }} />
          </div>
          {menuOpen && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A", fontFamily: "'Fraunces', serif" }}>
                GRC Platform
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>
                Sécurité & Conformité
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{
          padding: "10px 7px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}>
          {menuOpen && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#CBD5E1",
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "2px 11px 8px", whiteSpace: "nowrap",
            }}>
              Navigation
            </div>
          )}

          {filteredMenuItems.map((item) => {
            const active = currentPath === item.to;
            return (
              <div key={item.label}>
                {/* Item principal */}
                <button
                  onClick={() => {
                    if (item.subOptions) {
                      toggleSubMenu(item.label);
                    } else if (item.to) {
                      navigate(item.to);
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 11px",
                    borderRadius: 9, border: "none",
                    background: active ? "#EEF4FF" : "transparent",
                    color: active ? "#3B6FFF" : "#64748B",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap", overflow: "hidden",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#0F172A"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; } }}
                >
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {menuOpen && (
                    <span style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      {item.label}
                      {item.subOptions && (
                        <ChevronDown size={12} style={{
                          transform: openMenu === item.label ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform .2s",
                        }} />
                      )}
                    </span>
                  )}
                  {active && menuOpen && (
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B6FFF", boxShadow: "0 0 6px #3B6FFF80" }} />
                  )}
                </button>

                {/* Sous-menu */}
                {item.subOptions && openMenu === item.label && menuOpen && (
                  <div style={{
                    paddingLeft: "30px",
                    display: "flex", flexDirection: "column", gap: 2,
                    marginTop: 2,
                  }}>
                    {item.subOptions.map((sub) => (
                      <NavLink
                        key={sub.label}
                        to={sub.to}
                        end
                        style={({ isActive }) => ({
                          padding: "7px 12px",
                          borderRadius: 7,
                          textDecoration: "none",
                          color: isActive ? "#3B6FFF" : "#64748B",
                          background: isActive ? "#EEF4FF" : "transparent",
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          transition: "all 0.15s",
                          display: "block",
                        })}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div style={{ padding: "10px 7px", borderTop: "1px solid #F1F5F9" }}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            style={{
              display: "flex", alignItems: "center", gap: "9px",
              padding: "9px 11px", borderRadius: 9,
              border: "none", background: "#F8FAFC",
              color: "#94A3B8", cursor: "pointer",
              width: "100%", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#EEF4FF"; e.currentTarget.style.color = "#3B6FFF"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            {menuOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            {menuOpen && <span style={{ fontSize: 12, fontWeight: 500 }}>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
        background: "#F8FAFC",
      }}>

        {/* ── Topbar ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 22px",
          height: 60,
          background: "#fff",
          borderBottom: "1px solid #F1F5F9",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          flexShrink: 0,
          zIndex: 30,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13, color: "#CBD5E1" }}>GRC</span>
              <span style={{ color: "#E2E8F0" }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                {currentLabel}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationsDropdown
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAllAsRead={handleMarkAllAsRead}
            />

            {/* ── Profil user — dynamique ─────────────────────────── */}
            <div style={{ position: "relative" }}>
              {/* État chargement */}
              {userLoading && <ProfileSkeleton />}

              {/* État erreur */}
              {!userLoading && userError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "5px 12px 5px 5px", borderRadius: "9px",
                  border: "1.5px solid #FEE2E2", background: "#FEF2F2",
                }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "7px",
                    background: "#FECACA",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <UserCircle size={16} color="#EF4444" />
                  </div>
                  <span style={{ color: "#EF4444", fontSize: "11px", fontWeight: "600" }}>
                    Profil indisponible
                  </span>
                </div>
              )}

              {/* État chargé avec succès */}
              {!userLoading && !userError && user && (
                <button
                  onClick={() => {
                    setShowProfile((v) => !v);
                    setShowNotif(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "9px",
                    padding: "5px 11px 5px 5px", borderRadius: "9px",
                    border: "1.5px solid #F1F5F9",
                    background: showProfile ? "#EEF4FF" : "#fff",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <UserAvatar user={user} size={28} radius="7px" fontSize="10px" />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ color: "#0F172A", fontSize: "12px", fontWeight: "700" }}>
                      {user.name}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "10px" }}>
                      {user.role}
                    </div>
                  </div>
                </button>
              )}

              {/* Dropdown profil */}
              {showProfile && user && (
                <div style={{
                  position: "absolute", right: 0, top: "44px",
                  width: "260px", background: "#fff",
                  border: "1.5px solid #F1F5F9", borderRadius: "14px",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
                  animation: "fadeDown 0.2s ease", zIndex: 100, overflow: "hidden",
                }}>
                  {/* En-tête */}
                  <div style={{
                    padding: "20px 18px 16px", borderBottom: "1px solid #F1F5F9",
                    textAlign: "center",
                  }}>
                    <div style={{
                      margin: "0 auto 10px", width: "fit-content",
                      boxShadow: "0 6px 20px rgba(59,111,255,0.25)", borderRadius: "13px",
                    }}>
                      <UserAvatar user={user} size={52} radius="13px" fontSize="18px" />
                    </div>
                    <div style={{
                      color: "#0F172A", fontSize: "14px", fontWeight: "800",
                      fontFamily: "'Fraunces',serif",
                    }}>
                      {user.name}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "11px", marginTop: "3px" }}>
                      {user.email}
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      marginTop: "9px", background: "#EEF4FF", color: "#3B6FFF",
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "10px", fontWeight: "700",
                    }}>
                      <ShieldCheck size={9} /> {user.role}
                    </div>
                  </div>

                  {/* Méta infos */}
                  <div style={{
                    padding: "11px 16px", borderBottom: "1px solid #F1F5F9",
                    display: "flex", flexDirection: "column", gap: "6px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#94A3B8", fontSize: "10px", fontWeight: "600" }}>Organization</span>
                      <span style={{ color: "#475569", fontSize: "11px", fontWeight: "600" }}>{user.organization}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#94A3B8", fontSize: "10px", fontWeight: "600" }}>last login</span>
                      <span style={{ color: "#475569", fontSize: "11px" }}>{user.lastLogin}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {[
                    { icon: UserCircle, label: "profile" },
                    { icon: Settings, label: "Settings" },
                  ].map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button key={i} style={{
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
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex", alignItems: "center", gap: "9px",
                      width: "100%", padding: "10px 13px",
                      border: "none", borderTop: "1px solid #F1F5F9",
                      background: "transparent", color: "#EF4444",
                      fontSize: "12px", fontWeight: "600",
                      cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "auto", padding: "36px" }}>
          <Outlet
            context={{
              activeOrg,
              orgs,
              setActiveOrg,
              notifications,
              setNotifications,
              handleNotificationClick,
              handleMarkAllAsRead,
            }}
          />
        </div>
      </main>
      <AIChatbot />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        nav::-webkit-scrollbar { width: 4px; }
        nav::-webkit-scrollbar-track { background: #F8FAFC; }
        nav::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 2px; }
      `}</style>
    </div>
  );
};

export default Layout;