import { useState, useCallback , useEffect} from "react";

import { useLocation, useNavigate } from "react-router-dom";
import zxcvbn from "zxcvbn";

const WEAK_PASSWORDS = [
  "password", "123456", "admin", "qwerty", "azerty",
  "welcome", "12345678", "000000", "user"
];


const REQUIREMENTS = [
  { id: "len",     label: "16 characters min.", test: (pw) => pw.length >= 16 },
  { id: "upper",   label: "2 uppercase letters min.",  test: (pw) => (pw.match(/[A-Z]/g) || []).length >= 2 },
  { id: "lower",   label: "2 lowercase letters min.",  test: (pw) => (pw.match(/[a-z]/g) || []).length >= 2 },
  { id: "num",     label: "3 digits min.",    test: (pw) => (pw.match(/\d/g) || []).length >= 3 },
  { id: "special", label: "2 special characters min.", test: (pw) => (pw.match(/[^A-Za-z0-9]/g) || []).length >= 2 },
  { id: "no-seq",  label: "No sequences (123, abc)", test: (pw) => !/123|234|345|456|567|678|789|abc|bcd|cde|def|qwerty|azerty/i.test(pw) },
  { id: "no-repeat", label: "No repetitions", test: (pw) => !/(.)\1{2,}/.test(pw) },
];
function isPasswordStrong(pw, email) {
  
  if (pw.length < 16) {
    return { valid: false, reason: "Minimum 16 characters (like the generated password)" };
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

  // No repetitions
  if (/(.)\1{2,}/.test(pw)) {
    return { valid: false, reason: "No more than 2 identical consecutive characters" };
  }

  // No dictionary words
  const commonWords = [
    "password", "admin", "user", "test", "yosr", "youssef", "mohamed", "ahmed",
    "welcome", "hello", "bonjour", "soleil", "lune", "etoile", "amour", "vie"
  ];
  
  const lowerPw = pw.toLowerCase();
  for (const word of commonWords) {
    if (lowerPw.includes(word) && word.length > 2) {
      return { valid: false, reason: "Must not contain common words" };
    }
  }

  // 4. Check that email is not included
  if (email) {
    const emailName = email.split("@")[0].toLowerCase();
    if (lowerPw.includes(emailName) && emailName.length > 2) {
      return { valid: false, reason: "Must not contain your email" };
    }
  }

  // 5. Check with zxcvbn (score 4 required - maximum)
  const result = zxcvbn(pw);
  if (result.score < 4) {
    return { valid: false, reason: "Password not random enough (zxcvbn score < 4)" };
  }

  // 6. Check entropy (measure of randomness)
  const entropy = calculateEntropy(pw);
  if (entropy < 80) {
    return { valid: false, reason: "Insufficient entropy - not random enough" };
  }

  return { valid: true };
}

// Function to calculate entropy (higher is more random)
function calculateEntropy(password) {
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/\d/.test(password)) charsetSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) charsetSize += 33;
  
  // Entropy = length * log2(charset size)
  return password.length * Math.log2(charsetSize);
}
function getScore(pw) {
  return REQUIREMENTS.filter((r) => r.test(pw)).length;
}
function useQuery() {
  return new URLSearchParams(useLocation().search);
}
function generatePassword(length = 16) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+[]{}|;:,.<>?";

  let password = "";

  // 1. Add 2 uppercase letters (requirement)
  for (let i = 0; i < 2; i++) {
    password += upper[Math.floor(Math.random() * upper.length)];
  }

  // 2. Add 2 lowercase letters (requirement)
  for (let i = 0; i < 2; i++) {
    password += lower[Math.floor(Math.random() * lower.length)];
  }

  // 3. Add 3 digits (requirement)
  for (let i = 0; i < 3; i++) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }

  // 4. Add 2 special characters (requirement)
  for (let i = 0; i < 2; i++) {
    password += special[Math.floor(Math.random() * special.length)];
  }

  // 5. Fill the rest up to the requested length
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

const STRENGTH_CONFIG = [
  { min: 0, label: "Very weak", color: "#ef4444" },
  { min: 6, label: "Weak", color: "#f97316" },
  { min: 12, label: "Medium", color: "#eab308" },
  { min: 15, label: "Strong", color: "#3b82f6" },
  { min: 20, label: "Very strong", color: "#1d4ed8" },
];

// --- Icons ---
const ShieldCheckIcon = ({ size = 24 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// --- Main Component ---
export default function ActivatePage() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [activated, setActivated] = useState(false);
  const [hoveringBtn, setHoveringBtn] = useState(false);
  const query = useQuery();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
  const token = query.get("token");

  if (token) {
    setToken(token);

    fetch(`http://localhost:3000/api/activate/by-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setEmail(data.email); 
        }
      })
      .catch(err => console.error(err));
  }
}, [query]);
  
  const score = getAdvancedScore(pw1);
  function getAdvancedScore(pw) {
  let score = 0;

  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;

  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if ((pw.match(/\d/g) || []).length >= 2) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  // penalties
  if (/(.)\1{2,}/.test(pw)) score--;
  if (/^[a-zA-Z]+$/.test(pw)) score--;

  return Math.max(0, score);
}
  const strengthCfg = pw1.length > 0 ? STRENGTH_CONFIG[score - 1] : null;

  const matchState =
    pw2.length === 0 ? "none"
    : pw1 === pw2    ? "ok"
    : "ko";

  const advancedCheck = isPasswordStrong(pw1, email);

  const isValid =
    pw1 === pw2 &&
    pw2.length > 0 &&
    advancedCheck.valid;

  const handleActivate = useCallback(async () => {
  if (!isValid) return;

  try {
    const res = await fetch("http://localhost:3000/api/activate", {
      method: "POST",
      credentials:"include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        password: pw1
      }),
    });

    if (res.ok) {
      // password successfully saved
      setActivated(true);

      // wait a short delay to show the animation
      setTimeout(() => {
        navigate("/mfa", { state: { email: email } });  // <-- here you redirect to the MFA page
      }, 1000); // 1s to let the success message be visible

    } else {
      const data = await res.json();
      alert(data.message || "Error during activation");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}, [isValid, email, token, pw1, navigate]);
  const inputStyle = (state) => ({
    width: "100%",
    border: `1.5px solid ${
      state === "readonly" ? "#bfdbfe"
      : state === "error"   ? "#fca5a5"
      : state === "valid"   ? "#93c5fd"
      : "#e2e8f0"
    }`,
    borderRadius: "10px",
    padding: "12px 44px 12px 40px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    color: state === "readonly" ? "#1d4ed8" : "#0f172a",
    background: state === "readonly" ? "#eff6ff" : "#ffffff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important;
        }
        .eye-btn:hover { color: #3b82f6 !important; }
        .activate-btn:not(:disabled):hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 32px rgba(59,130,246,0.4) !important;
        }
        .activate-btn:not(:disabled):active { transform: translateY(0) !important; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#f0f6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: "fixed",
            top: "-160px",
            right: "-160px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: "-120px",
            left: "-100px",
            width: "440px",
            height: "440px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(29,78,216,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "44px 40px 40px",
            width: "100%",
            maxWidth: "460px",
            position: "relative",
            zIndex: 1,
            boxShadow:
              "0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(59,130,246,0.12), 0 0 0 1px rgba(59,130,246,0.08)",
            overflow: "hidden",
            animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #60a5fa, #1d4ed8)",
              borderRadius: "20px 20px 0 0",
            }}
          />

          {/* Success overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.97)",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              opacity: activated ? 1 : 0,
              pointerEvents: activated ? "all" : "none",
              transition: "opacity 0.4s",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                border: "2px solid #3b82f6",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                boxShadow: "0 0 0 12px rgba(59,130,246,0.08)",
                animation: activated
                  ? "successPop 0.5s cubic-bezier(0.22,1,0.36,1) both"
                  : "none",
              }}
            >
              <ShieldCheckIcon size={30} />
            </div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Account activated!
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                textAlign: "center",
                maxWidth: "290px",
                lineHeight: 1.6,
              }}
            >
              Your account has been successfully activated. You can now
              access the GRC platform.
            </div>
          </div>

          {/* Icon */}
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              border: "1px solid #bfdbfe",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px",
              color: "#2563eb",
            }}
          >
            <ShieldCheckIcon size={24} />
          </div>

          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "21px",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: "6px",
              letterSpacing: "-0.3px",
            }}
          >
            Account Activation
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "#64748b",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            Welcome to the GRC platform. Set your password to activate your
            access.
          </p>

          {/* ---- Email field ---- */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.7px",
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: "7px",
              }}
            >
              Email Address
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "13px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <MailIcon />
              </span>
              <input
                type="email"
                readOnly
                value={email}
                style={inputStyle("readonly")}
              />
            </div>
          </div>

          {/* ---- Password 1 ---- */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.7px",
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: "7px",
              }}
            >
              New Password
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "13px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <LockIcon />
              </span>
              <input
                type={show1 ? "text" : "password"}
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Create your password"
                style={inputStyle("normal")}
              />
              <div
                style={{
                  position: "absolute",
                  right: "10px",
                  display: "flex",
                  gap: "6px",
                }}
              >
                {/* Generate */}
                <button
                  type="button"
                  onClick={() => {
                    const newPw = generatePassword();
                    setPw1(newPw);
                    setPw2(newPw);
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
                
  

                {/* Show / hide */}
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShow1(!show1)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {show1 ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {/* Strength bars */}
            <div
              style={{
                display: "flex",
                gap: "5px",
                marginTop: "8px",
                alignItems: "center",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "3px",
                    borderRadius: "10px",
                    background:
                      pw1.length > 0 && i < score
                        ? strengthCfg?.color
                        : "#e2e8f0",
                    transition: "background 0.3s",
                  }}
                />
              ))}
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: strengthCfg?.color || "#94a3b8",
                  minWidth: "54px",
                  letterSpacing: "0.3px",
                }}
              >
                {strengthCfg?.label || ""}
              </span>
            </div>
          </div>

          {/* ---- Password 2 ---- */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.7px",
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: "7px",
              }}
            >
              Confirm Password
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "13px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <LockIcon />
              </span>
              <input
                type={show2 ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Repeat your password"
                style={inputStyle(
                  matchState === "ok"
                    ? "valid"
                    : matchState === "ko"
                      ? "error"
                      : "normal",
                )}
              />
              <button
                className="eye-btn"
                onClick={() => setShow2(!show2)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  transition: "color 0.15s",
                }}
              >
                {show2 ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div
              style={{
                fontSize: "11.5px",
                marginTop: "6px",
                height: "18px",
                color:
                  matchState === "ok"
                    ? "#2563eb"
                    : matchState === "ko"
                      ? "#ef4444"
                      : "transparent",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "color 0.2s",
              }}
            >
              {matchState === "ok" && (
                <>
                  <CheckIcon /> Passwords match
                </>
              )}
              {matchState === "ko" && (
                <>
                  <XIcon /> Passwords do not match
                </>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div
            style={{
              background: "#f8faff",
              border: "1px solid #dbeafe",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {REQUIREMENTS.map((req) => {
              const met = req.test(pw1);
              return (
                <div
                  key={req.id}
                  style={{
                    fontSize: "12px",
                    color: met ? "#1d4ed8" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    transition: "color 0.2s",
                    fontWeight: met ? 600 : 400,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: met ? "#3b82f6" : "#cbd5e1",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  />
                  {req.label}
                </div>
              );
            })}
          </div>

          {/* Activate Button */}
          <button
            className="activate-btn"
            disabled={!isValid}
            onClick={handleActivate}
            onMouseEnter={() => setHoveringBtn(true)}
            onMouseLeave={() => setHoveringBtn(false)}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "12px",
              background: isValid
                ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                : "linear-gradient(135deg, #bfdbfe, #93c5fd)",
              color: isValid ? "#fff" : "#7bbffc",
              fontFamily: "'Syne', sans-serif",
              fontSize: "14.5px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              cursor: isValid ? "pointer" : "not-allowed",
              transition: "transform 0.15s, box-shadow 0.2s, background 0.3s",
              boxShadow: isValid ? "0 6px 24px rgba(59,130,246,0.35)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
            }}
          >
            <ShieldCheckIcon size={17} />
            Confirm Activation
          </button>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontSize: "11.5px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <LockIcon size={13} />
            Secure Connection · GRC Platform
          </div>
        </div>
      </div>
    </>
  );
}