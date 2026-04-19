import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Eye,
  BarChart3,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  Lock,
} from "lucide-react";
import LoginPage from "../pages/LoginPage";

/* ─── Animation Constants ───────────────── */
const ANIMATION = {
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  },
};

/* ─── Theme Constants ───────────────── */
const THEME = {
  colors: {
    primary: "#6366F1",
    primaryLight: "#818CF8",
    secondary: "#8B5CF6",
    secondaryLight: "#A855F7",
    dark: "#0B0F2A",
    darkLight: "#0F1535",
    darkMedium: "#1A1F4A",
    textDark: "#0F172A",
    textGray: "#6B7280",
    textLight: "rgba(255,255,255,0.7)",
    white: "#fff",
    background: "#F9FAFB",
  },
  gradients: {
    hero: "linear-gradient(135deg, #0B0F2A 0%, #0F1535 50%, #1A1F4A 100%)",
    cta: "linear-gradient(135deg, #0B0F2A 0%, #1A1F4A 100%)",
    button: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    text: "linear-gradient(135deg, #818CF8, #A855F7, #F472B6)",
  },
  shadows: {
    button: "0 8px 28px rgba(99,102,241,0.4)",
    card: "0 10px 30px rgba(0,0,0,0.04)",
  },
};

/* ─── Data ───────────────── */
const benefits = [
  {
    title: "Centralized Compliance",
    description:
      "Manage ISO 27001, NIST, and regulatory frameworks in one unified workspace.",
    icon: Shield,
    gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  },
  {
    title: "Risk Management",
    description:
      "Identify and mitigate risks with dynamic scoring and approval workflows.",
    icon: Eye,
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)",
  },
  {
    title: "AI-Powered Analysis",
    description:
      "Instant compliance analysis powered by artificial intelligence.",
    icon: BarChart3,
    gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)",
  },
];

/* ─── Hero Section ───────────────── */
const Hero = ({ onAccessPlatform }) => {
  const styles = {
    section: {
      minHeight: "90vh",
      padding: "140px 24px 100px",
      background: THEME.gradients.hero,
      position: "relative",
      overflow: "hidden",
    },
    orbPrimary: {
      position: "absolute",
      top: "10%",
      left: "-5%",
      width: "400px",
      height: "400px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
      filter: "blur(60px)",
    },
    orbSecondary: {
      position: "absolute",
      bottom: "10%",
      right: "-5%",
      width: "450px",
      height: "450px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
      filter: "blur(60px)",
    },
    grid: {
      position: "absolute",
      inset: 0,
      backgroundImage: `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
      pointerEvents: "none",
    },
    container: {
      maxWidth: 1100,
      margin: "0 auto",
      textAlign: "center",
      position: "relative",
      zIndex: 2,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 20px",
      borderRadius: 999,
      background: "rgba(99,102,241,0.12)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(99,102,241,0.25)",
      marginBottom: 32,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: 600,
      color: THEME.colors.primaryLight,
      letterSpacing: "0.3px",
    },
    title: {
      fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)",
      color: THEME.colors.white,
      fontWeight: 800,
      marginBottom: 20,
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    titleGradient: {
      background: THEME.gradients.text,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      color: THEME.colors.textLight,
      fontSize: "clamp(1rem, 1.8vw, 1.125rem)",
      maxWidth: 600,
      margin: "0 auto 48px",
      lineHeight: 1.7,
    },
  };

  return (
    <section style={styles.section}>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={styles.orbPrimary}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={styles.orbSecondary}
      />
      <div style={styles.grid} />

      <div style={styles.container}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0 }}
          style={styles.badge}
        >
          <Sparkles size={16} color={THEME.colors.primaryLight} />
          <span style={styles.badgeText}>AI-Powered GRC Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={styles.title}
        >
          Welcome To Our
          <br />
          <span style={styles.titleGradient}>GRC Platform</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={styles.subtitle}
        >
          A unified platform to manage governance, risks, and compliance with
          AI-powered insights and real-time monitoring.
        </motion.p>
      </div>
    </section>
  );
};

/* ─── Benefits Section ───────────────── */
const BenefitsSection = () => {
  const styles = {
    section: {
      padding: "100px 24px",
      background: THEME.colors.background,
    },
    container: {
      maxWidth: 1100,
      margin: "0 auto",
    },
    header: {
      textAlign: "center",
      marginBottom: 60,
    },
    badge: {
      fontSize: 13,
      fontWeight: 700,
      color: THEME.colors.primary,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
    title: {
      fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
      fontWeight: 800,
      marginTop: 16,
      marginBottom: 12,
      color: THEME.colors.textDark,
    },
    subtitle: {
      color: THEME.colors.textGray,
      maxWidth: 500,
      margin: "0 auto",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 30,
    },
    card: {
      background: THEME.colors.white,
      padding: 36,
      borderRadius: 24,
      border: "1px solid rgba(0,0,0,0.05)",
      boxShadow: THEME.shadows.card,
      transition: "all 0.3s ease",
    },
    iconContainer: (gradient) => ({
      width: 52,
      height: 52,
      borderRadius: 16,
      background: gradient,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    }),
    cardTitle: {
      fontSize: 20,
      fontWeight: 700,
      marginBottom: 10,
      color: THEME.colors.textDark,
    },
    cardDescription: {
      color: THEME.colors.textGray,
      lineHeight: 1.6,
    },
  };

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <motion.div
          variants={ANIMATION.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={styles.header}
        >
          <span style={styles.badge}>Why Choose Us</span>
          <h2 style={styles.title}>A smarter way to manage GRC</h2>
          <p style={styles.subtitle}>
            Built for modern organizations that need real-time visibility
          </p>
        </motion.div>

        <motion.div
          variants={ANIMATION.staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={styles.grid}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              variants={ANIMATION.fadeUp}
              custom={index}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              style={styles.card}
            >
              <div style={styles.iconContainer(benefit.gradient)}>
                <benefit.icon size={24} color={THEME.colors.white} />
              </div>
              <h3 style={styles.cardTitle}>{benefit.title}</h3>
              <p style={styles.cardDescription}>{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─── CTA Section ───────────────── */
const CTASection = ({ onAccessPlatform }) => {
  const styles = {
    section: {
      padding: "80px 24px",
      background: THEME.gradients.cta,
      textAlign: "center",
    },
    container: {
      maxWidth: 700,
      margin: "0 auto",
    },
    title: {
      fontSize: "clamp(1.8rem, 3vw, 2.2rem)",
      fontWeight: 700,
      color: THEME.colors.white,
      marginBottom: 16,
    },
    subtitle: {
      color: THEME.colors.textLight,
      marginBottom: 32,
    },
    button: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 36px",
      borderRadius: 999,
      border: "none",
      background: THEME.gradients.button,
      color: THEME.colors.white,
      fontWeight: 600,
      fontSize: 15,
      cursor: "pointer",
      boxShadow: THEME.shadows.button,
    },
  };

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={styles.title}
        >
          Ready to transform your GRC strategy?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={styles.subtitle}
        >
          Join hundreds of enterprises already mastering their risks
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAccessPlatform}
          style={styles.button}
        >
          <ShieldCheck size={18} />
          Access Platform
          <ArrowRight size={16} />
        </motion.button>
      </div>
    </section>
  );
};

/* ─── Modal Styles ───────────────── */
const MODAL_STYLE = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15,23,42,0.8)",
  backdropFilter: "blur(8px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

/* ─── Home Component ───────────────── */
const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar />
      <Hero onAccessPlatform={handleOpenModal} />
      <BenefitsSection />
      <CTASection onAccessPlatform={handleOpenModal} />
      <Footer />

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={MODAL_STYLE}
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LoginPage onClose={handleCloseModal} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;