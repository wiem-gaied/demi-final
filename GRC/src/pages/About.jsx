import React, { useRef } from 'react'
import Navbar from '../components/Navbar'
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Shield, Eye, BarChart3, Users, Target, Zap, CheckCircle2, ArrowRight,
  Bot, Lock, FileText, GitBranch, Globe, Database,
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
    icon: Shield, title: "Governance", color: "#3B6FFF", bg: "rgba(59,111,255,0.08)",
    description: "Define and drive your policies, processes, and compliance frameworks with a unified view across your entire organization.",
  },
  {
    icon: Eye, title: "Risks", color: "#6D28D9", bg: "rgba(109,40,217,0.08)",
    description: "Identify, assess, and treat your risks in real-time with dynamic mapping and intelligent alerts.",
  },
  {
    icon: BarChart3, title: "Compliance", color: "#0891B2", bg: "rgba(8,145,178,0.08)",
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

/* ─── Sub-components ─────────────────────────────────────────── */
const PillarCard = ({ icon: Icon, title, description, color, bg, i }) => (
  <motion.div
    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
    whileHover={{ y: -6 }}
    style={{
      background: "#fff", borderRadius: 20, border: "1px solid #E8EEFF",
      padding: "36px 32px", boxShadow: "0 4px 24px rgba(59,111,255,0.07)",
      display: "flex", flexDirection: "column", gap: 16, cursor: "default",
      transition: "box-shadow 0.25s",
    }}
  >
    <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0" }}>{title}</h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#64748B", margin: 0 }}>{description}</p>
    </div>
  </motion.div>
);

const FeatureItem = ({ icon: Icon, title, description, i }) => (
  <motion.div
    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
    whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(59,111,255,0.12)" }}
    style={{
      display: "flex", gap: 18, padding: "24px 28px", borderRadius: 16,
      background: "#fff", border: "1px solid #E8EEFF",
      boxShadow: "0 2px 16px rgba(59,111,255,0.05)", cursor: "default",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
  >
    <div style={{
      flexShrink: 0, width: 44, height: 44, borderRadius: 12,
      background: "linear-gradient(135deg,rgba(59,111,255,0.12),rgba(109,40,217,0.1))",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={20} color="#3B6FFF" />
    </div>
    <div>
      <h4 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 5px 0" }}>{title}</h4>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "#64748B", margin: 0 }}>{description}</p>
    </div>
  </motion.div>
);

/* ─── Main Component ──────────────────────────────────────────── */
const About = () => (
  <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'DM Sans', sans-serif" , paddingTop: "80px" }}>
    <Navbar />

    {/* ── Hero ─────────────────────────────────────────────────── */}
    <section style={{
  padding: "120px 24px 100px",
  position: "relative",
  overflow: "hidden",
  background: "#0B1220"
}}>
      <div style={{
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "600px",
  height: "600px",
  background: "radial-gradient(circle, rgba(0,0,0,0.06), transparent 60%)",
  filter: "blur(40px)",
  opacity: 0.6,
}} />
      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <motion.p initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>
          About Us
        </motion.p>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
          style={{ fontFamily: serif, fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 800, color: "#fff", lineHeight: 1.18, marginBottom: 24 }}>
          Master your risks.<br />
          <span style={{ color: "rgba(255,255,255,0.75)" }}>Strengthen your compliance.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.55 }}
          style={{ fontSize: 17, lineHeight: 1.75, color: "rgba(255,255,255,0.72)", maxWidth: 580, margin: "0 auto 40px" }}>
          Our GRC platform centralizes governance, risk management, and compliance
          to give you a clear, actionable, real-time view of your security posture.
        </motion.p>

        
      </div>
    </section>

    {/* ── Three Pillars ─────────────────────────────────────────── */}
    <section style={{ padding: "88px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#3B6FFF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Our Approach</p>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, color: "#0F172A", marginBottom: 16 }}>
            The three pillars of GRC
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            An integrated platform covering the entire GRC spectrum for holistic security management.
          </p>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {pillars.map((p, i) => <PillarCard key={p.title} {...p} i={i + 1} />)}
        </div>
      </div>
    </section>

    
    {/* ── Foundation — Alternating image + text ───────────────────── */}
    <section style={{ padding: "88px 24px", background: "#F0F4FF" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Our Roots</p>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, color: "#0F172A", marginBottom: 16 }}>
            A vision born from the field
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>
            Built by practitioners, for practitioners — every feature addresses a real operational need.
          </p>
        </motion.div>

        {/* Row 1 — image left, text right */}
        <div style={{ display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap", marginBottom: 80 }}>
          <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            style={{ flex: "1 1 420px" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(59,111,255,0.12)", aspectRatio: "16/10", position: "relative" }}>
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80"
                alt="Team at work"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(59,111,255,0.08), rgba(109,40,217,0.04))" }} />
            </div>
          </motion.div>

          <motion.div variants={fadeRight} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            style={{ flex: "1 1 360px" }}>
            
            <h3 style={{ fontFamily: serif, fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)", fontWeight: 800, color: "#0F172A", lineHeight: 1.3, marginBottom: 20 }}>
              Born from a frustration with existing tools
            </h3>
            <p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.8, marginBottom: 14 }}>
              Founded by NextStep, our platform was born from a simple observation: GRC tools on the market were either
              too complex or too rigid to adapt to the realities of field teams.
            </p>
            <p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.8, marginBottom: 28 }}>
              We built a solution that brings together in one space security, compliance,
              and audit .
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["ISO 27001", "ISO 22301", "NIST"].map((tag) => (
                <span key={tag} style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: "#fff", border: "1px solid #E8EEFF",
                  fontSize: 13, fontWeight: 600, color: "#3B6FFF",
                  boxShadow: "0 2px 8px rgba(59,111,255,0.07)",
                }}>{tag}</span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Row 2 — text left, image right */}
        <div style={{ display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap-reverse" }}>
          <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            style={{ flex: "1 1 360px" }}>
            
            <h3 style={{ fontFamily: serif, fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)", fontWeight: 800, color: "#0F172A", lineHeight: 1.3, marginBottom: 20 }}>
              Where modern GRC begins
            </h3>
            <p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.8, marginBottom: 14 }}>
              A modern and innovative GRC platform designed for today’s digital landscape.
            </p>
            <p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.8, marginBottom: 32 }}>
              Our solution brings a fresh, modern approach to governance, risk, and compliance by combining intuitive design, real-time visibility, and automated workflows in a single unified platform.

            </p>
            
          </motion.div>

          <motion.div variants={fadeRight} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            style={{ flex: "1 1 420px" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(109,40,217,0.12)", aspectRatio: "16/10", position: "relative" }}>
              <img
                src="https://cbglobalservices.com/wp-content/uploads/2024/06/GRC.png"
                alt="Analytics dashboard"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(109,40,217,0.06), rgba(59,111,255,0.04))" }} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* ── Platform Features ─────────────────────────────────────── */}
    <section style={{ padding: "88px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Platform Capabilities</p>
          <h2 style={{ fontFamily: serif, fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 800, color: "#0F172A", marginBottom: 16 }}>
            Everything you need, ready to use
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Features designed to remove friction from your compliance workflows.
          </p>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {features.map((f, i) => <FeatureItem key={f.title} {...f} i={i + 1} />)}
        </div>
      </div>
    </section>

    
    {/* ── Footer ────────────────────────────────────────────────── */}
    <footer style={{ borderTop: "1px solid #E8EEFF", padding: "28px 24px", textAlign: "center", fontSize: 13.5, color: "#94A3B8" }}>
      © {new Date().getFullYear()} GRC Platform. All rights reserved.
    </footer>

    <style>{`
      .pillar-card:hover { box-shadow: 0 12px 40px rgba(59,111,255,0.14) !important; }
      @media (max-width: 768px) {
        section { padding-left: 16px !important; padding-right: 16px !important; }
      }
    `}</style>
  </div>
);

export default About;