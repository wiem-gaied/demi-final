import { useState, useRef } from "react";
import { ShieldCheck, Eye, EyeOff, Lock, Mail, AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";


// ─── Shared styles ────────────────────────────────────────────────────────────
const MODAL_CONTAINER = {
  width: 420,
  fontFamily: "'DM Sans', Segoe UI, sans-serif",
  background: "#fff",
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 40px rgba(109,40,217,0.10), 0 2px 8px rgba(0,0,0,0.06)",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const INPUT = { 
  width: "100%", 
  padding: "11px 12px 11px 38px", 
  border: "1.5px solid #e2e8f0", 
  borderRadius: 10,
  fontSize: 13,
  fontFamily: "inherit",
  color: "#0f172a",
  background: "#f8fafc",
  outline: "none",
  transition: "border-color .2s, box-shadow .2s",
  boxSizing: "border-box",
};

const LBL = {
  fontSize: 12, 
  fontWeight: 600, 
  color: "#475569",
  marginBottom: 6, 
  display: "block",
};

const LOGIN_BTN = {
  width: "100%",
  background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  color: "#fff",
  padding: "12px",
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 4px 14px rgba(109,40,217,0.28)",
  transition: "box-shadow .2s, opacity .2s",
};

const ERROR_BOX = {
  display: "flex", 
  gap: 8,
  background: "#fef2f2", 
  border: "1px solid #fca5a5",
  padding: "10px 12px", 
  borderRadius: 10, 
  marginBottom: 16,
  alignItems: "center",
};

const CLOSE_BTN = {
  position: "absolute", 
  top: 12, 
  right: 12,
  background: "none", 
  border: "none", 
  cursor: "pointer",
  color: "#94a3b8", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center",
  width: 28, 
  height: 28, 
  borderRadius: 7,
  transition: "background .15s, color .15s",
};

function PlatformHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
        border: "1px solid #ddd6fe",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(109,40,217,0.15)",
      }}>
        <ShieldCheck size={22} color="#7c3aed" />
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 19, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>GRC Platform</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Governance · Risk · Compliance</div>
      </div>
    </div>
  );
}

function IconField({ icon: Icon, value, onChange, onKeyDown, type = "text", placeholder, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Icon size={15} color={focused ? "#7c3aed" : "#94a3b8"}
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", transition: "color .15s", pointerEvents: "none" }} />
      <input
        style={{
          ...INPUT,
          borderColor: focused ? "#7c3aed" : "#e2e8f0",
          boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.10)" : "none",
          paddingRight: rightSlot ? 40 : 12,
        }}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightSlot}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export  default function LoginPage({ onClose, onForgotPassword}){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [setupMfa, setSetupMfa] = useState(false);
  const [requireMfa, setRequireMfa] = useState(false);
  const navigate = useNavigate();
  

 const handleSubmit = async () => {
  setError("");

  // 🔹 CAS 1 : MFA SETUP (scan QR)
  if (setupMfa) {
    if (!mfaCode) {
      setError("Enter verification code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/users/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,

          token: mfaCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSetupMfa(false);
        setRequireMfa(true); // 🔥 forcer login MFA après setup
        setMfaCode("");
      } else {
        setError(data.message || "Invalid code");
      }

    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }

    return;
  }

  // 🔹 CAS 2 : MFA LOGIN
  if (requireMfa) {
    if (!mfaCode) {
      setError("Enter MFA code");
      return;
    }
  }

  // 🔹 CAS 3 : LOGIN NORMAL
  if (!email.trim() || !password.trim()) {
    setError("Please fill in all fields.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(requireMfa && { token: mfaCode })
      })
    });

    const data = await res.json();
    console.log("🔥 LOGIN RESPONSE:", data);

    if (res.ok) {

      // 🔥 PREMIER LOGIN → MFA SETUP
      if (data.mfaSetup) {
        console.log("🟢 MFA SETUP ACTIVATED");
  console.log("QR CODE:", data.qrCode);
  console.log("USER ID:", data.userId);

  setQrCode(data.qrCode);
  setSetupMfa(true);
  sessionStorage.setItem("userId", data.userId);
  return;
}
      // 🔐 MFA REQUIS
      if (data.mfaRequired) {
        console.log("🔐 MFA REQUIRED STEP TRIGGERED");
  setRequireMfa(true);
  return;
}

      // ✅ SUCCESS
      if (data.redirect) {
        window.location.href = data.redirect;
      }

    } else {
      setError(data.message || "Login failed");
    }

  } catch {
    setError("Server error");
  } finally {
    setLoading(false);
  }
};
  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // MFA Setup
  if (setupMfa) {
    return (
      <div style={MODAL_CONTAINER}>
        <div style={{ padding: "28px 34px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <PlatformHeader />
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>MFA Setup</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Scan the QR code below</div>
        </div>
        <div style={{ padding: "24px 34px 28px" }}>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px", lineHeight: 1.6 }}>
            Scan this QR code with your authenticator app then enter the 6-digit code.
          </p>
          {qrCode && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ background: "white", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <img src={qrCode} alt="MFA QR Code" style={{ width: 110, height: 110, display: "block" }} />
              </div>
            </div>
          )}
          <label style={LBL}>Verification code</label>
          <input
            style={{ ...INPUT, paddingLeft: 12, textAlign: "center", letterSpacing: 6, fontSize: 18, fontWeight: 700 }}
            placeholder="••••••"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            onKeyDown={handleKey}
          />
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 16px", textAlign: "center" }}>
            Valid for 30 seconds · Automatically renewed
          </p>
          <button onClick={handleSubmit} disabled={loading} style={LOGIN_BTN}>
            {loading ? "Verifying..." : "Verify code"}
          </button>
          {error && (
            <div style={{ ...ERROR_BOX, marginTop: 14, marginBottom: 0 }}>
              <AlertCircle size={15} color="#dc2626" />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MFA Required
  if (requireMfa) {
    return (
      <div style={MODAL_CONTAINER}>
        <div style={{ padding: "28px 34px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <PlatformHeader />
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>MFA Authentication</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Identity verification</div>
        </div>
        <div style={{ padding: "24px 34px 28px" }}>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px", lineHeight: 1.6 }}>
            Enter the 6-digit code displayed in your authenticator app.
          </p>
          <label style={LBL}>6-digit code</label>
          <input
            style={{ ...INPUT, paddingLeft: 12, textAlign: "center", letterSpacing: 6, fontSize: 18, fontWeight: 700 }}
            placeholder="••••••"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            onKeyDown={handleKey}
          />
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0 16px", textAlign: "center" }}>
            Valid for 30 seconds · Automatically renewed
          </p>
          <button onClick={handleSubmit} disabled={loading} style={LOGIN_BTN}>
            {loading ? "Verifying..." : "Sign In"}
          </button>
          {error && (
            <div style={{ ...ERROR_BOX, marginTop: 14, marginBottom: 0 }}>
              <AlertCircle size={15} color="#dc2626" />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal Login
  return (
    <div style={MODAL_CONTAINER}>
      <button
  onClick={() => {
    onClose?.(); // sécurité si undefined
  }}
  style={CLOSE_BTN}
>
  <X size={18} />
</button>
      <div
        style={{ padding: "30px 36px 22px", borderBottom: "1px solid #f1f5f9" }}
      >
        <PlatformHeader />
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
          Welcome back
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
          Sign in to your secure workspace
        </div>
      </div>

      <div style={{ padding: "26px 36px 30px" }}>
        {error && (
          <div style={ERROR_BOX}>
            <AlertCircle size={15} color="#dc2626" />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LBL}>Email</label>
            <IconField
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              type="email"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label style={{ ...LBL, marginBottom: 0 }}>Password</label>
              <button
                onClick={() => navigate("/forgot")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#7c3aed",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>

            <IconField
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              rightSlot={
                <button
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              onClick={() => setRemember((v) => !v)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                flexShrink: 0,
                cursor: "pointer",
                border: `2px solid ${remember ? "#7c3aed" : "#e2e8f0"}`,
                background: remember ? "#7c3aed" : "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {remember && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5L4 7.5L8.5 2.5"
                    stroke="#fff"
                    strokeWidth="1.8"
                  />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Keep me signed in
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...LOGIN_BTN, opacity: loading ? 0.75 : 1 }}
          >
            {loading ? "Checking…" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}