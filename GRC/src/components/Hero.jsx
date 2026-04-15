import { useState } from "react";
import {
  ShieldCheck, TrendingUp, Zap, ChevronRight
} from "lucide-react";
import LoginPage from "../pages/LoginPage";

const REASONS = [
  {
    icon: ShieldCheck,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    title: "Centralized Compliance",
    desc: "ISO 27001, ISO 22301, NIST — manage all your regulatory obligations from a single unified workspace.",
  },
  {
    icon: TrendingUp,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    title: "Risk Management",
    desc: "Identify, assess, and mitigate your cyber risks with a dynamic matrix and approval workflows.",
  },
  {
    icon: Zap,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    title: "Instant AI Analysis",
    desc: "Upload your policies and get a compliance check within seconds powered by AI.",
  },
];

export default function WelcomePage({ onLogin }) {
  const [hovered, setHovered] = useState(null);
  const [openLogin, setOpenLogin] = useState(false);

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#ffffff",
      minHeight: "100vh",
      color: "#0f172a",
      overflowX: "hidden",
      padding: "80px 60px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.5; transform:scale(.8); }
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(38px, 5.5vw, 68px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -1.5px;
          color: #0f172a;
        }
        .hero-title .gradient-word {
          background: linear-gradient(120deg, #7c3aed 0%, #2563eb 60%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }

        .reason-card {
          background: #fff;
          border: 1px solid #e9eaf0;
          border-radius: 16px;
          padding: 28px;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .reason-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #2563eb);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .3s ease;
          border-radius: 3px 3px 0 0;
        }
        .reason-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 48px rgba(124,58,237,0.10), 0 4px 16px rgba(37,99,235,0.08);
          border-color: #ddd6fe;
        }
        .reason-card:hover::after { transform: scaleX(1); }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f8f9fb; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* ── HERO SECTION ── */}
      <section style={{ textAlign: "center", marginBottom: 80 }}>
        <h1 className="hero-title" style={{ marginBottom: 12 }}>
          Welcome to <span className="gradient-word">our Platform</span>
        </h1>
        <p style={{
          fontSize: 18, fontWeight: 400, color: "#475569",
          maxWidth: 600, lineHeight: 1.75, margin: "0 auto 40px"
        }}>
          Manage your organization's governance, risk, and compliance clearly and efficiently with one platform.
        </p>
        <button
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 28px", background: "linear-gradient(120deg, #7c3aed, #2563eb)",
            border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 6px 24px rgba(124,58,237,0.32)"
          }}
          onClick={() => setOpenLogin(true)}
        >
          <ShieldCheck size={17} />
          Access Platform
        </button>
        {/* Login Modal */}
        {openLogin && (
          <div style={MODAL_OVERLAY}>
            <LoginPage onClose={() => setOpenLogin(false)} />
          </div>
        )}
      </section>

      {/* ── WHY OUR PLATFORM ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {REASONS.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={i}
              className="reason-card"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                animationDelay: `${i * 0.07}s`,
                boxShadow: hovered === i
                  ? "0 20px 48px rgba(124,58,237,0.10), 0 4px 16px rgba(37,99,235,0.08)"
                  : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: r.bg, border: `1px solid ${r.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 18,
                transition: "transform .2s",
                transform: hovered === i ? "scale(1.08)" : "scale(1)",
              }}>
                <Icon size={22} color={r.color} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                {r.desc}
              </div>
                          </div>
          );
        })}
      </section>
    </div>
  );
}
const MODAL_OVERLAY = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000
};