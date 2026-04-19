import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Shield, Eye, BarChart3, Users, Target, Zap, CheckCircle2, ArrowRight,
  Bot, Lock, FileText, GitBranch, Globe, Database, Award, Clock, Headphones,
  Star, ChevronRight, X
} from "lucide-react";

/* ─── Animation variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (i = 0) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: (i = 0) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Typo helper ────────────────────────────────────────────── */
const serif = "Georgia, 'Times New Roman', serif";

/* ─── Data ────────────────────────────────────────────────────── */
const pillars = [
  {
    icon: Shield, title: "Governance", color: "#3B6FFF", gradient: "linear-gradient(135deg, #3B6FFF 0%, #5B8CFF 100%)",
    description: "Define and drive your policies, processes, and compliance frameworks with a unified view across your entire organization.",
  },
  {
    icon: Eye, title: "Risk Management", color: "#6D28D9", gradient: "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)",
    description: "Identify, assess, and treat your risks in real-time with dynamic mapping and intelligent alerts.",
  },
  {
    icon: BarChart3, title: "Compliance", color: "#0891B2", gradient: "linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)",
    description: "Ensure compliance with ISO 27001, SOC 2, GDPR and more, with automated control monitoring.",
  },
];

const features = [
  { icon: Bot ,     title: "Real-Time Check",  description: "Get instant compliance insights powered by AI by analyzing your policies in real time within seconds." },
  { icon: Lock,     title: "Role-Based Access",    description: "Granular permissions ensure each stakeholder sees exactly what they need." },
  { icon: FileText, title: "Automated Reports",    description: "Generate compliance reports and audit trails with one click." },
  { icon: GitBranch,title: "Framework Mapping",    description: "Map controls across multiple frameworks simultaneously to eliminate redundant compliance efforts." },
  { icon: Globe,    title: "Multi-Tenant Support",    description: "Manage multiple subsidiaries or client organizations from a centralized, isolated platform." },
  { icon: Database, title: "Evidence Management",     description: "Centralize evidence, documents, and audit artifacts with full version history and validation workflows." },
];

/* ─── Login Modal Component ───────────────────────────────────── */
const LoginModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 40,
          maxWidth: 440,
          width: "90%",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={20} color="#666" />
        </button>
        
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: "#0A0F2C", marginBottom: 8 }}>Welcome Back</h3>
          <p style={{ fontSize: 14, color: "#5A6A85" }}>Sign in to access your account</p>
        </div>

        <form>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0A0F2C", marginBottom: 8 }}>Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #E8EEFF",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#3B6FFF"}
              onBlur={(e) => e.target.style.borderColor = "#E8EEFF"}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0A0F2C", marginBottom: 8 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #E8EEFF",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#3B6FFF"}
              onBlur={(e) => e.target.style.borderColor = "#E8EEFF"}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#3B6FFF",
              color: "#fff",
              border: "none",
              padding: "12px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#2D5AE0"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#3B6FFF"}
          >
            Sign In
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a href="#" style={{ fontSize: 13, color: "#3B6FFF", textDecoration: "none" }}>Forgot password?</a>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────── */
const PillarCard = ({ icon: Icon, title, description, gradient, i }) => (
  <motion.div
    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
    whileHover={{ y: -8, transition: { duration: 0.2 } }}
    className="group"
    style={{
      background: "#fff", borderRadius: 24, border: "1px solid rgba(59,111,255,0.1)",
      padding: "40px 32px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
      display: "flex", flexDirection: "column", gap: 20, cursor: "default",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }}
  >
    <div style={{ 
      width: 56, height: 56, borderRadius: 16, 
      background: gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 16px -4px rgba(59,111,255,0.2)"
    }}>
      <Icon size={26} color="#fff" />
    </div>
    <div>
      <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: "#0A0F2C", margin: "0 0 12px 0" }}>{title}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5A6A85", margin: 0 }}>{description}</p>
    </div>
  </motion.div>
);

const FeatureItem = ({ icon: Icon, title, description, i }) => (
  <motion.div
    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{
      display: "flex", gap: 20, padding: "28px 32px", borderRadius: 20,
      background: "#fff", border: "1px solid #F0F2F5",
      boxShadow: "0 2px 12px rgba(0,0,0,0.02)", cursor: "default",
      transition: "all 0.2s ease",
    }}
  >
    <div style={{
      flexShrink: 0, width: 48, height: 48, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(59,111,255,0.12) 0%, rgba(109,40,217,0.08) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={22} color="#3B6FFF" strokeWidth={1.75} />
    </div>
    <div>
      <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: "#0A0F2C", margin: "0 0 8px 0" }}>{title}</h4>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "#5A6A85", margin: 0 }}>{description}</p>
    </div>
  </motion.div>
);

/* ─── Main Component ──────────────────────────────────────────── */
const About = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "'Inter', 'DM Sans', sans-serif", paddingTop: "80px" }}>
      <Navbar />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Hero Section - Professional Dark Theme */}
      <section style={{
        padding: "120px 24px 100px",
        position: "relative",
        overflow: "hidden",
        background: "#0A0F2C",
      }}>
        {/* Grid Pattern Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(59,111,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,111,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          pointerEvents: "none"
        }} />
        
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                fontFamily: serif,
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.2,
                marginBottom: 24,
                maxWidth: 900
              }}
            >
              Master your risks.{' '}
              <span style={{ color: "#3B6FFF" }}>Strengthen your compliance.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.75)",
                maxWidth: 650,
                marginBottom: 40
              }}
            >
              Our GRC platform centralizes governance, risk management, and compliance
              to give you a clear, actionable, real-time view of your security posture.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}
            >
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section style={{ padding: "100px 24px", background: "#F8FAFF" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#3B6FFF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Our Approach</p>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#0A0F2C", marginBottom: 20 }}>
              The three pillars of GRC
            </h2>
            <p style={{ fontSize: 17, color: "#5A6A85", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
              An integrated platform covering the entire GRC spectrum for holistic security management.
            </p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
            {pillars.map((p, i) => <PillarCard key={p.title} {...p} i={i + 1} />)}
          </div>
        </div>
      </section>

      {/* Vision Section - Alternating layout */}
      <section style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Our Roots</p>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#0A0F2C", marginBottom: 20 }}>
              A vision born from the field
            </h2>
            <p style={{ fontSize: 17, color: "#5A6A85", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
              Built by practitioners, for practitioners — every feature addresses a real operational need.
            </p>
          </motion.div>

          <div style={{ display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap", marginBottom: 96 }}>
            <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
              style={{ flex: "1 1 400px" }}>
              <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 40px -12px rgba(59,111,255,0.15)" }}>
                <img
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80"
                  alt="Team collaboration"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            </motion.div>
            <motion.div variants={fadeRight} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              style={{ flex: "1 1 400px" }}>
              <h3 style={{ fontFamily: serif, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, color: "#0A0F2C", marginBottom: 24 }}>
                Frustrated with existing tools?
              </h3>
              <p style={{ fontSize: 16, color: "#5A6A85", lineHeight: 1.7, marginBottom: 20 }}>
                Founded by NextStep, our platform was born from a simple observation: GRC tools on the market were either
                too complex or too rigid to adapt to the realities of field teams.
              </p>
              <p style={{ fontSize: 16, color: "#5A6A85", lineHeight: 1.7, marginBottom: 32 }}>
                We built a solution that brings together security, compliance, and audit in one intuitive space.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["ISO 27001", "NIST", "ISO 22301"].map((tag) => (
                  <span key={tag} style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    background: "#F8FAFF",
                    border: "1px solid #E8EEFF",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#3B6FFF"
                  }}>{tag}</span>
                ))}
              </div>
            </motion.div>
          </div>

          <div style={{ display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap-reverse" }}>
            <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
              style={{ flex: "1 1 400px" }}>
              <h3 style={{ fontFamily: serif, fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, color: "#0A0F2C", marginBottom: 24 }}>
                Where modern GRC begins
              </h3>
              <p style={{ fontSize: 16, color: "#5A6A85", lineHeight: 1.7, marginBottom: 20 }}>
                A modern and innovative GRC platform designed for today's digital landscape, combining intuitive design,
                real-time visibility, and automated workflows.
              </p>
              <p style={{ fontSize: 16, color: "#5A6A85", lineHeight: 1.7, marginBottom: 32 }}>
                Our solution brings a fresh approach to governance, risk, and compliance by eliminating silos and providing
                actionable insights when you need them most.
              </p>
            </motion.div>
            <motion.div variants={fadeRight} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              style={{ flex: "1 1 400px" }}>
              <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 40px -12px rgba(109,40,217,0.15)" }}>
                <img
                  src="https://cbglobalservices.com/wp-content/uploads/2024/06/GRC.png"
                  alt="GRC dashboard"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section style={{ padding: "100px 24px", background: "#F8FAFF" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Platform Capabilities</p>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 800, color: "#0A0F2C", marginBottom: 20 }}>
              Everything you need, ready to use
            </h2>
            <p style={{ fontSize: 17, color: "#5A6A85", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
              Features designed to remove friction from your compliance workflows.
            </p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
            {features.map((f, i) => <FeatureItem key={f.title} {...f} i={i + 1} />)}
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer style={{ background: "#F8FAFF", padding: "32px 24px", textAlign: "center", borderTop: "1px solid #E8EEFF" }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>© {new Date().getFullYear()} GRC Platform. All rights reserved.</p>
      </footer>

      <style>{`
        .group:hover { box-shadow: 0 20px 40px -12px rgba(59,111,255,0.15) !important; border-color: rgba(59,111,255,0.2) !important; }
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
        button, [role="button"] { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default About;