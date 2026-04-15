import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import zxcvbn from "zxcvbn";

// === STRENGTH FUNCTIONS FROM ACTIVATE PAGE ===
const REQUIREMENTS = [
  { id: "len", label: "16 characters min.", test: (pw) => pw.length >= 16 },
  { id: "upper", label: "2 uppercase letters min.", test: (pw) => (pw.match(/[A-Z]/g) || []).length >= 2 },
  { id: "lower", label: "2 lowercase letters min.", test: (pw) => (pw.match(/[a-z]/g) || []).length >= 2 },
  { id: "num", label: "3 digits min.", test: (pw) => (pw.match(/\d/g) || []).length >= 3 },
  { id: "special", label: "2 special characters min.", test: (pw) => (pw.match(/[^A-Za-z0-9]/g) || []).length >= 2 },
  { id: "no-seq", label: "No sequences (123, abc)", test: (pw) => !/123|234|345|456|567|678|789|abc|bcd|cde|def|qwerty|azerty/i.test(pw) },
  { id: "no-repeat", label: "No repetitions", test: (pw) => !/(.)\1{2,}/.test(pw) },
];

function isPasswordStrong(pw, email) {
  if (pw.length < 16) {
    return { valid: false, reason: "Minimum 16 characters required" };
  }

  const upperCount = (pw.match(/[A-Z]/g) || []).length;
  if (upperCount < 2) {
    return { valid: false, reason: "Add at least 2 uppercase letters" };
  }

  const lowerCount = (pw.match(/[a-z]/g) || []).length;
  if (lowerCount < 2) {
    return { valid: false, reason: "Add at least 2 lowercase letters" };
  }

  const digitCount = (pw.match(/\d/g) || []).length;
  if (digitCount < 3) {
    return { valid: false, reason: "Add at least 3 digits" };
  }

  const specialCount = (pw.match(/[^A-Za-z0-9]/g) || []).length;
  if (specialCount < 2) {
    return { valid: false, reason: "Add at least 2 special characters" };
  }

  if (/123|456|789|abc|qwerty|azerty|yxcvbn/i.test(pw)) {
    return { valid: false, reason: "Avoid predictable character sequences" };
  }

  if (/(.)\1{2,}/.test(pw)) {
    return { valid: false, reason: "No more than 2 identical consecutive characters" };
  }

  const commonWords = [
    "password", "admin", "user", "test", "welcome", "hello", "bonjour"
  ];
  
  const lowerPw = pw.toLowerCase();
  for (const word of commonWords) {
    if (lowerPw.includes(word) && word.length > 2) {
      return { valid: false, reason: "Must not contain common words" };
    }
  }

  if (email) {
    const emailName = email.split("@")[0].toLowerCase();
    if (lowerPw.includes(emailName) && emailName.length > 2) {
      return { valid: false, reason: "Must not contain your email" };
    }
  }

  const result = zxcvbn(pw);

if (result.score < 3 && getAdvancedScore(pw) < 6) {
  return { valid: false, reason: "Weak password" };
}

  return { valid: true };
}

function getAdvancedScore(pw) {
  let score = 0;

  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;

  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if ((pw.match(/\d/g) || []).length >= 2) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (/(.)\1{2,}/.test(pw)) score--;
  if (/^[a-zA-Z]+$/.test(pw)) score--;

  return Math.max(0, Math.min(8, score));
}

const STRENGTH_CONFIG = [
  { min: 0, label: "Very weak", color: "#ef4444" },
  { min: 2, label: "Weak", color: "#f97316" },
  { min: 3, label: "Medium", color: "#eab308" },
  { min: 5, label: "Strong", color: "#3b82f6" },
  { min: 6, label: "Very strong", color: "#16a34a" },
];
function getStrengthConfig(score) {
  for (let i = STRENGTH_CONFIG.length - 1; i >= 0; i--) {
    if (score >= STRENGTH_CONFIG[i].min) {
      return STRENGTH_CONFIG[i];
    }
  }
  return STRENGTH_CONFIG[0];
}

function generatePassword(length = 16) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+[]{}|;:,.<>?";

  let password = "";

  for (let i = 0; i < 2; i++) password += upper[Math.floor(Math.random() * upper.length)];
  for (let i = 0; i < 2; i++) password += lower[Math.floor(Math.random() * lower.length)];
  for (let i = 0; i < 3; i++) password += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 0; i < 2; i++) password += special[Math.floor(Math.random() * special.length)];

  const all = upper + lower + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  password = password.split("").sort(() => Math.random() - 0.5).join("");

  if (/123|234|345|456|567|678|789|abc|bcd|cde|def|qwerty|azerty/i.test(password)) {
    return generatePassword(length);
  }

  return password;
}

// === STYLES ===
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
  alignItems: "center",
  gap: 8,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 10,
  padding: "10px 14px",
  marginBottom: 16,
  color: "#dc2626",
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

// === MAIN COMPONENT ===
export default function ForgotPasswordPage() {
  const [screen, setScreen] = useState("email");
  const [email, setEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();
  const hasValidated = useRef(false);

  // Calcul du score avancé
  const advancedScore = getAdvancedScore(newPwd);
  const strengthConfig = getStrengthConfig(advancedScore);
  const advancedCheck = isPasswordStrong(newPwd, email);

  const isValid = newPwd === confirmPwd && confirmPwd.length > 0 && advancedCheck.valid;

  console.log("🔍 Component mounted. Token:", token);
  console.log("📱 Current screen:", screen);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setScreen("email");
        return;
      }

      if (hasValidated.current) return;

      try {
        const response = await fetch(`http://localhost:3000/api/reset/verify-token/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          setTokenValid(true);
          setScreen("reset");
          setError("");
          hasValidated.current = true;
        } else {
          setTokenValid(false);
          setError("This reset link is invalid or has expired.");
          hasValidated.current = true;
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err) {
        setTokenValid(false);
        setError("Unable to verify reset link. Please try again.");
        hasValidated.current = true;
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    validateToken();
  }, [token, navigate]);

  const sendReset = async () => {
    setError("");
    if (!email.trim() || !email.includes("@")) { 
      setError("Please enter a valid email address."); 
      return; 
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/reset/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error sending reset link");
      }
      
      setScreen("sent");
    } catch (err) { 
      setError(err.message || "Server error. Please try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  const resetPassword = async () => {
    setError("");
    
    if (!newPwd) { 
      setError("Please enter a new password."); 
      return; 
    }
    
    if (!advancedCheck.valid) {
      setError(advancedCheck.reason || "Password does not meet security requirements");
      return;
    }
    
    if (newPwd !== confirmPwd) { 
      setError("Passwords do not match."); 
      return; 
    }
    
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/reset/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPwd }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error resetting password");
      }
      
      setScreen("done");
    } catch (err) { 
      setError(err.message || "Error updating password. Please try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  const Header = ({ title, sub }) => (
    <div style={{ padding: "28px 34px 20px", borderBottom: "1px solid #f1f5f9" }}>
      <PlatformHeader />
      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sub}</div>
    </div>
  );

  const BackBtn = () => (
    <button onClick={() => navigate("/login")}
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b", fontFamily: "inherit", padding: 0, marginTop: 16, transition: "color .15s" }}
      onMouseEnter={e => e.currentTarget.style.color = "#7c3aed"}
      onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
      <ArrowLeft size={14} /> Back to login
    </button>
  );

  // Error screen
  if (error && token && !tokenValid) {
    return (
      <div style={MODAL_CONTAINER}>
        <div style={{ padding: "40px 34px", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, marginBottom: 22,
            background: "#fef2f2",
            border: "2px solid #fecaca",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertCircle size={36} color="#dc2626" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 8 }}>Invalid Reset Link</div>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: "0 0 28px" }}>
            {error}<br />
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // Email screen
  if (screen === "email") {
    return (
      <div style={MODAL_CONTAINER}>
        <Header title="Forgot password?" sub="We'll send you a reset link" />
        <div style={{ padding: "24px 34px 30px" }}>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.65 }}>
            Enter the email address associated with your account and we'll send you a reset link.
          </p>
          {error && !token && <div style={ERROR_BOX}><AlertCircle size={15} color="#dc2626" /><span style={{ fontSize: 13 }}>{error}</span></div>}
          <label style={LBL}>Email address</label>
          <IconField icon={Mail} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReset()}
            type="email" placeholder="you@company.com" />
          <button onClick={sendReset} disabled={loading}
            style={{ ...LOGIN_BTN, marginTop: 18, opacity: loading ? 0.75 : 1 }}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <div style={{ textAlign: "center" }}><BackBtn /></div>
        </div>
      </div>
    );
  }

  // Reset password screen with advanced strength
  if (screen === "reset") {
    return (
      <div style={MODAL_CONTAINER}>
        <Header title="Set new password" sub="Choose a strong password" />
        <div style={{ padding: "24px 34px 30px" }}>
          {error && <div style={ERROR_BOX}><AlertCircle size={15} color="#dc2626" /><span style={{ fontSize: 13 }}>{error}</span></div>}
          
          {/* New password field */}
          <div style={{ marginBottom: 14 }}>
            <label style={LBL}>New password</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                onKeyDown={e => e.key === "Enter" && resetPassword()}
                placeholder="At least 16 characters"
                style={{
                  ...INPUT,
                  paddingRight: 90,
                }}
              />
              <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newPw = generatePassword();
                    setNewPwd(newPw);
                    setConfirmPwd(newPw);
                    navigator.clipboard.writeText(newPw);
                  }}
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "4px 6px",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "#1d4ed8",
                  }}
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            
            {/* Strength bars */}
            {newPwd && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: i < advancedScore ? strengthConfig.color : "#e2e8f0",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: strengthConfig.color }}>
                  {strengthConfig.label}
                </div>
              </div>
            )}
          </div>
          
          {/* Confirm password field */}
          <div style={{ marginBottom: 20 }}>
            <label style={LBL}>Confirm password</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                onKeyDown={e => e.key === "Enter" && resetPassword()}
                placeholder="Repeat new password"
                style={{
                  ...INPUT,
                  borderColor: confirmPwd && newPwd !== confirmPwd ? "#dc2626" : confirmPwd && newPwd === confirmPwd ? "#16a34a" : "#e2e8f0",
                  paddingRight: 40,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPwd && newPwd !== confirmPwd && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>Passwords do not match</div>
            )}
            {confirmPwd && newPwd === confirmPwd && (
              <div style={{ fontSize: 12, color: "#16a34a", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={13} /> Passwords match
              </div>
            )}
          </div>
          
          {/* Requirements grid */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Security Requirements</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {REQUIREMENTS.map((req) => {
                const met = req.test(newPwd);
                return (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: met ? "#16a34a" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {met && <CheckCircle2 size={10} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 11, color: met ? "#16a34a" : "#94a3b8", fontWeight: met ? 500 : 400 }}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button onClick={resetPassword} disabled={loading || !isValid}
            style={{ ...LOGIN_BTN, opacity: (loading || !isValid) ? 0.6 : 1, cursor: (loading || !isValid) ? "not-allowed" : "pointer" }}>
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </div>
      </div>
    );
  }

  // Sent screen
  if (screen === "sent") {
    return (
      <div style={MODAL_CONTAINER}>
        <div style={{ padding: "40px 34px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, marginBottom: 22,
            background: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
            border: "2px solid #c7d2fe",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail size={36} color="#4f46e5" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 8 }}>Check your email</div>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: "0 0 28px" }}>
            We've sent a password reset link to<br />
            <strong>{email}</strong>
          </p>
          <button onClick={sendReset}
            style={{ ...LOGIN_BTN, width: "auto", padding: "11px 32px", background: "#f1f5f9", color: "#475569", boxShadow: "none" }}>
            Send again
          </button>
          <div style={{ textAlign: "center" }}><BackBtn /></div>
        </div>
      </div>
    );
  }

  // Done screen
  return (
    <div style={MODAL_CONTAINER}>
      <div style={{ padding: "40px 34px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, marginBottom: 22,
          background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
          border: "2px solid #86efac",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 size={36} color="#16a34a" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 8 }}>Password updated!</div>
        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: "0 0 28px" }}>
          Your password has been successfully reset.<br />
          You can now sign in with your new credentials.
        </p>
        <button onClick={() => navigate("/login")}
          style={{ ...LOGIN_BTN, width: "auto", padding: "11px 32px" }}>
          Back to Login
        </button>
      </div>
    </div>
  );
}