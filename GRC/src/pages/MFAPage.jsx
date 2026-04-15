import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function MFAPage() {
  const location = useLocation();
  const email = location.state?.email;
  const navigate = useNavigate();

  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      setError("Email not provided");
      return;
    }
    fetch("http://localhost:3000/api/users/setup-mfa", {
      method: "POST",
      credentials:"include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Server error");
        }
        return res.json();
      })
      .then((data) => setQrCode(data.qrCodeUrl))
      .catch((err) => setError(err.message));
  }, [email]);

  const handleVerify = async () => {
    if (!token) return alert("Please enter the MFA code");
    try {
      const res = await fetch("http://localhost:3000/api/users/verify-mfa", {
        method: "POST",
        credentials:"include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (data.success) setVerified(true);
      else alert(data.message);
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ── Success screen ──────────────────────────────────────────────
  if (verified) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div style={s.page}>
          <div style={s.bgBlob1} />
          <div style={s.bgBlob2} />
          <div style={{ ...s.card, animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div style={s.topBar} />
            <div style={s.successWrap}>
              <div style={s.successRing}>
                <CheckBigIcon />
              </div>
              <h2 style={s.successTitle}>MFA successfully activated!</h2>
              <p style={s.successSub}>
                Your two-factor authentication is now active.<br />
                You can now log in securely.
              </p>
              <button
                style={{
                marginTop: "16px",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "14px",
                transition: "background 0.2s",
                }}
                onClick={() => navigate("/")}
                onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                onMouseLeave={e => e.currentTarget.style.background = "#3b82f6"}
                >
                    Return to home
                    </button>

            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main screen ─────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={s.page}>
        <div style={s.bgBlob1} />
        <div style={s.bgBlob2} />

        <div style={s.card}>
          <div style={s.topBar} />

          {/* Header */}
          <div style={s.iconWrap}>
            <ShieldIcon />
          </div>
          <h2 style={s.heading}>Two-Factor Authentication</h2>
          <p style={s.subtitle}>
            Scan the QR code with <strong style={{ color: "#1d4ed8" }}>any authenticator app</strong> then
            enter the generated code to activate two-factor authentication.
          </p>

          {/* Steps */}
          <div style={s.stepsRow}>
            {["Scan QR code", "Enter code", "Confirm"].map((step, i) => (
              <div key={i} style={s.step}>
                <div style={{ ...s.stepNum, background: i < 2 ? "#3b82f6" : "#e2e8f0", color: i < 2 ? "#fff" : "#94a3b8" }}>
                  {i + 1}
                </div>
                <span style={{ ...s.stepLabel, color: i < 2 ? "#1e40af" : "#94a3b8" }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={s.divider} />

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {/* QR Code area */}
          <div style={s.qrSection}>
            {qrCode ? (
              <div style={s.qrFrame}>
                <img src={qrCode} alt="MFA QR Code" style={s.qrImg} />
              </div>
            ) : !error ? (
              <div style={s.qrPlaceholder}>
                <div style={s.spinner} />
                <p style={s.loadingText}>Loading QR code…</p>
              </div>
            ) : null}
          </div>

          {/* Code input */}
          <div style={s.inputSection}>
            <label style={s.label}>6-DIGIT CODE</label>
            <div style={s.digitWrap}>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                style={s.digitInput}
              />
              <span style={s.digitCount}>{token.length}/6</span>
            </div>
          </div>

          {/* Verify button */}
          <button
            className="verify-btn"
            onClick={handleVerify}
            style={s.verifyBtn(token.length === 6)}
          >
            <ShieldCheckIcon />
            Verify code
          </button>

          {/* Footer */}
          <p style={s.footer}>
            <LockSmIcon /> Secure session · GRC Platform
          </p>
        </div>
      </div>
    </>
  );
}

// ── Icons ────────────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const CheckBigIcon = () => (
  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const LockSmIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Global CSS ───────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes successPop {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.06); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .verify-btn:not(:disabled):hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 30px rgba(59,130,246,0.4) !important;
  }
  .verify-btn:not(:disabled):active { transform: translateY(0) !important; }
`;

// ── Style objects ────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#f0f6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },
  bgBlob1: {
    position: "fixed", top: "-160px", right: "-160px",
    width: "520px", height: "520px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  bgBlob2: {
    position: "fixed", bottom: "-120px", left: "-100px",
    width: "440px", height: "440px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(29,78,216,0.07) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "44px 40px 40px",
    width: "100%",
    maxWidth: "460px",
    position: "relative",
    zIndex: 1,
    boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(59,130,246,0.12), 0 0 0 1px rgba(59,130,246,0.08)",
    animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
  },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
    background: "linear-gradient(90deg, #60a5fa, #1d4ed8)",
    borderRadius: "20px 20px 0 0",
  },
  iconWrap: {
    width: "52px", height: "52px",
    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: "18px", color: "#2563eb",
  },
  heading: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "21px", fontWeight: 800,
    color: "#0f172a", marginBottom: "8px", letterSpacing: "-0.3px",
  },
  subtitle: {
    fontSize: "13.5px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px",
  },
  stepsRow: {
    display: "flex", alignItems: "center", gap: "0",
    marginBottom: "22px",
  },
  step: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", gap: "6px", position: "relative",
  },
  stepNum: {
    width: "28px", height: "28px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: 700,
    transition: "all 0.3s",
  },
  stepLabel: {
    fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.2px",
    textAlign: "center",
  },
  divider: {
    height: "1px", background: "#e0eaff", marginBottom: "22px",
  },
  errorBox: {
    background: "#fff1f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "12px 14px",
    color: "#dc2626", fontSize: "13px",
    display: "flex", alignItems: "center", gap: "8px",
    marginBottom: "18px",
  },
  qrSection: {
    display: "flex", justifyContent: "center",
    marginBottom: "24px",
  },
  qrFrame: {
    padding: "12px",
    background: "#f8faff",
    border: "1.5px solid #bfdbfe",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(59,130,246,0.1)",
  },
  qrImg: {
    width: "180px", height: "180px",
    display: "block", borderRadius: "8px",
  },
  qrPlaceholder: {
    width: "204px", height: "204px",
    background: "#f8faff",
    border: "1.5px dashed #bfdbfe",
    borderRadius: "16px",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "12px",
  },
  spinner: {
    width: "32px", height: "32px",
    border: "3px solid #dbeafe",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  loadingText: {
    fontSize: "12px", color: "#64748b",
  },
  inputSection: {
    marginBottom: "22px",
  },
  label: {
    display: "block",
    fontSize: "11px", fontWeight: 700,
    letterSpacing: "0.7px", textTransform: "uppercase",
    color: "#64748b", marginBottom: "8px",
  },
  digitWrap: {
    position: "relative", display: "flex", alignItems: "center",
  },
  digitInput: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px 52px 14px 18px",
    fontSize: "22px",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    letterSpacing: "14px",
    color: "#1d4ed8",
    textAlign: "center",
    background: "#f8faff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  digitCount: {
    position: "absolute", right: "14px",
    fontSize: "11px", fontWeight: 700,
    color: "#94a3b8",
  },
  verifyBtn: (active) => ({
    width: "100%", padding: "14px", border: "none",
    borderRadius: "12px",
    background: active
      ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
      : "linear-gradient(135deg, #bfdbfe, #93c5fd)",
    color: active ? "#fff" : "#7bbffc",
    fontFamily: "'Syne', sans-serif",
    fontSize: "14.5px", fontWeight: 700, letterSpacing: "0.3px",
    cursor: active ? "pointer" : "default",
    transition: "transform 0.15s, box-shadow 0.2s, background 0.3s",
    boxShadow: active ? "0 6px 24px rgba(59,130,246,0.35)" : "none",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "9px",
    marginBottom: "0",
  }),
  footer: {
    textAlign: "center", marginTop: "20px",
    fontSize: "11.5px", color: "#94a3b8",
  },
  successWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", textAlign: "center",
    padding: "16px 0 8px",
    gap: "14px",
    animation: "successPop 0.5s cubic-bezier(0.22,1,0.36,1) both",
  },
  successRing: {
    width: "76px", height: "76px", borderRadius: "50%",
    border: "2px solid #3b82f6",
    background: "#eff6ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#2563eb",
    boxShadow: "0 0 0 12px rgba(59,130,246,0.08)",
  },
  successTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "20px", fontWeight: 800, color: "#0f172a",
  },
  successSub: {
    fontSize: "13.5px", color: "#64748b", lineHeight: 1.7,
    maxWidth: "300px",
  },
};