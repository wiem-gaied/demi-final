import React, { useEffect, useState } from "react";
import zxcvbn from "zxcvbn";

const avatarUrl =
  "https://tse2.mm.bing.net/th/id/OIP.sbRjMD2zaP12rWg1bR1PDAHaHa?pid=Api&P=0&h=180";

const privileges = [
  { name: "Edit & Draft Policies", auditor: "Auditors: View Only" },
  { name: "Approve Risk Assessments", auditor: "Auditors: Comment Only" },
  { name: "Force System Audit", auditor: "Auditors: Denied" },
];

const iconBgMap = {
  primary: { bg: "#d9e2ff", color: "#285ab9" },
  neutral: { bg: "#dbe4ea", color: "#586065" },
  danger: { bg: "rgba(254,137,131,0.2)", color: "#9f403d" },
};

function MaterialIcon({ name, filled = false, className = "" }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
    >
      {name}
    </span>
  );
}

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

  if (result.score < 3) {
    return { valid: false, reason: "Weak password" };
  }

  return { valid: true };
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
        type="checkbox"
      />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#285ab9]"></div>
    </label>
  );
}

export default function Dashboard() {
  // User Profile states
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Settings states
  const [twoFA, setTwoFA] = useState(true);
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [passwordStrengthError, setPasswordStrengthError] = useState("");
  const [density, setDensity] = useState("Spacious");
  const [theme, setTheme] = useState("Light");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [notifications, setNotifications] = useState({
    riskEmail: true, riskApp: true,
    complianceEmail: true, complianceApp: false,
    auditEmail: false, auditApp: true,
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const toggleNotif = (key) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  // User Profile useEffect
  useEffect(() => {
    setPage(1);
  }, [logs]);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(
        `http://localhost:3000/api/logs/${user.email}`
      );
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    };
    if (user?.email) fetchLogs();
  }, [user]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/admin/profile", {
          credentials: "include",
        });
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // Password check useEffect
  useEffect(() => {
    if (!password.currentPassword) {
      setCurrentPasswordError("");
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/api/reset/check-password",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currentPassword: password.currentPassword,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setCurrentPasswordError(data.message || "Current password is incorrect");
        } else {
          setCurrentPasswordError("");
        }
      } catch (err) {
        console.error("Error checking password:", err);
        setCurrentPasswordError("Unable to verify password. Please try again.");
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [password.currentPassword]);

  useEffect(() => {
    if (!password.newPassword) {
      setPasswordStrengthError("");
      return;
    }

    const result = isPasswordStrong(password.newPassword, user?.email);

    if (!result.valid) {
      setPasswordStrengthError(result.reason);
    } else {
      setPasswordStrengthError("");
    }
  }, [password.newPassword, user]);

  const handlePasswordChange = (field, value) => {
    setPassword(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleUpdatePassword = async () => {
    setError("");

    if (!password.currentPassword) {
      setError("Please enter your current password");
      return;
    }

    if (currentPasswordError) {
      setError("Please correct the current password error before proceeding");
      return;
    }

    if (!password.newPassword) {
      setError("Please enter a new password");
      return;
    }
    
    if (password.currentPassword === password.newPassword) {
      setError("New password must be different from the current password");
      return;
    }

    if (password.newPassword.length < 16) {
      setError("Password must be at least 16 characters long");
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password.newPassword);
    const hasLowerCase = /[a-z]/.test(password.newPassword);
    const hasNumbers = (password.newPassword.match(/[0-9]/g) || []).length >= 2;
    const hasSpecialChars = (password.newPassword.match(/[!@#$%^&*]/g) || []).length >= 2;

    if (!hasUpperCase || !hasLowerCase) {
      setError("Password must contain both uppercase and lowercase letters");
      return;
    }

    if (!hasNumbers) {
      setError("Password must contain at least two numbers");
      return;
    }

    if (!hasSpecialChars) {
      setError("Password must contain at least two special characters (!@#$%^&*)");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/reset/change-password", {
        method: "PUT",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update password");
        return;
      }

      alert("Password updated successfully!");

      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setCurrentPasswordError("");
      setError("");

    } catch (err) {
      console.error(err);
      setError("Server error. Please try again later.");
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
        rel="stylesheet"
      />

      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-family: 'Material Symbols Outlined';
        }
        body { font-family: 'Inter', sans-serif; background: #f8f9fb; color: #2b3438; margin: 0; padding: 0; }
        h1, h2, h3, h4 { font-family: 'Manrope', sans-serif; }

        :root {
          --primary: #285ab9;
          --primary-dim: #154dac;
          --on-primary: #f7f7ff;
          --primary-container: #d9e2ff;
          --on-primary-container: #144dab;
          --secondary: #4f607c;
          --secondary-container: #d6e3ff;
          --on-secondary-container: #42526e;
          --tertiary: #615b77;
          --tertiary-container: #e3dbfd;
          --on-tertiary-container: #524c68;
          --error: #9f403d;
          --error-container: #fe8983;
          --on-error-container: #752121;
          --background: #f8f9fb;
          --surface: #f8f9fb;
          --surface-dim: #d1dce2;
          --surface-bright: #f8f9fb;
          --surface-container-lowest: #ffffff;
          --surface-container-low: #f1f4f7;
          --surface-container: #eaeef2;
          --surface-container-high: #e2e9ee;
          --surface-container-highest: #dbe4ea;
          --surface-variant: #dbe4ea;
          --on-surface: #2b3438;
          --on-surface-variant: #586065;
          --outline: #737c81;
          --outline-variant: #aab3b9;
          --inverse-surface: #0c0f10;
          --inverse-primary: #6d98fb;
        }

        .bg-surface { background-color: var(--surface); }
        .bg-surface-container-low { background-color: var(--surface-container-low); }
        .bg-surface-container { background-color: var(--surface-container); }
        .bg-surface-container-lowest { background-color: var(--surface-container-lowest); }
        .text-on-surface { color: var(--on-surface); }
        .text-on-surface-variant { color: var(--on-surface-variant); }
        .text-primary { color: var(--primary); }
        .text-secondary { color: var(--secondary); }
        .text-tertiary { color: var(--tertiary); }
        .text-error { color: var(--error); }
        .bg-primary { background-color: var(--primary); }
        .bg-primary-dim { background-color: var(--primary-dim); }
        .bg-primary-container { background-color: var(--primary-container); }
        .ring-primary { --tw-ring-color: var(--primary); }
        .border-primary { border-color: var(--primary); }
        .shadow-primary { --tw-shadow-color: var(--primary); }
        .hover\\:bg-surface-container:hover { background-color: var(--surface-container); }
        .hover\\:bg-surface-container-low:hover { background-color: var(--surface-container-low); }
        .peer-checked\\:bg-\\[\\#285ab9\\]:checked ~ div { background-color: #285ab9; }
        .focus\\:ring-primary:focus { --tw-ring-color: var(--primary); }
        .text-primary { color: var(--primary); }
        .from-primary { --tw-gradient-from: var(--primary); }
        .to-primary-dim { --tw-gradient-to: var(--primary-dim); }
        .border-outline-variant { border-color: var(--outline-variant); }
        .bg-error { background-color: var(--error); }
        .bg-tertiary { background-color: var(--tertiary); }
        .bg-secondary { background-color: var(--secondary); }
        .bg-inverse-surface { background-color: var(--inverse-surface); }

        .bg-primary-10 { background-color: rgba(40,90,185,0.1); }
        .bg-error-10 { background-color: rgba(159,64,61,0.1); }
        .bg-secondary-10 { background-color: rgba(79,96,124,0.1); }
        .bg-tertiary-10 { background-color: rgba(97,91,119,0.1); }
        .shadow-primary-20 { box-shadow: 0 4px 14px rgba(40,90,185,0.2); }
        .border-outline-variant-10 { border-color: rgba(170,179,185,0.1); }
        .border-outline-variant-20 { border-color: rgba(170,179,185,0.2); }
        .border-outline-variant-30 { border-color: rgba(170,179,185,0.3); }
        .from-primary-20 { --tw-gradient-from: rgba(40,90,185,0.2); }
        .to-tertiary-20 { --tw-gradient-to: rgba(97,91,119,0.2); }
        .bg-inverse-surface-10 { background-color: rgba(12,15,16,0.1); }
        .ring-primary-20 { --tw-ring-color: rgba(40,90,185,0.2); }
      `}</style>

      <div className="bg-surface text-on-surface min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* Tabs Navigation */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "16px", 
          padding: "24px 24px 0 24px",
          borderBottom: "1px solid var(--surface-container)"
        }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: activeTab === "profile" ? "var(--primary)" : "transparent",
              color: activeTab === "profile" ? "#fff" : "var(--on-surface-variant)",
              border: "none",
              borderRadius: "8px 8px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person</span>
            Profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: activeTab === "settings" ? "var(--primary)" : "transparent",
              color: activeTab === "settings" ? "#fff" : "var(--on-surface-variant)",
              border: "none",
              borderRadius: "8px 8px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>settings</span>
            Security Settings
          </button>
        </div>

        {activeTab === "profile" ? (
          // User Profile Component
          <div style={{ maxWidth: "100%", padding: 24, background: "#f8f9fb", fontFamily: "'Inter', sans-serif", color: "#2b3438" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
              {/* LEFT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Header Card */}
                <section style={{ background: "#f1f4f7", borderRadius: 12, padding: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img src={avatarUrl} alt="User Avatar" style={{ width: 88, height: 88, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }} />
                    </div>
                    <div>
                      <h1 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 26, fontWeight: 800, color: "#2b3438" }}>{user.name}</h1>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ background: "#d6e3ff", color: "#42526e", padding: "4px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>{user.role}</span>
                        <span style={{ background: "rgba(217,226,255,.4)", color: "#285ab9", padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>verified</span>
                          {user.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#586065", textTransform: "uppercase", letterSpacing: ".05em" }}>Last Login</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#2b3438", marginTop: 2 }}>{user.lastLogin}</div>
                  </div>
                </section>

                {/* Personal Information */}
                <section style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <span className="material-symbols-outlined" style={{ color: "#285ab9", fontSize: 20, fontWeight: "bold" }}>badge</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#586065", textTransform: "uppercase", background: "#eaeef2", padding: "3px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>lock</span>
                      Read-Only
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 48px" }}>
                    {[
                      { label: "First Name", value: user.firstName },
                      { label: "Last Name", value: user.lastName },
                      { label: "Email Address", value: user.email },
                      { label: "Company Entity", value: user.organization },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "#586065", textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 6 }}>{label}</label>
                        <div style={{ borderBottom: "2px solid #eaeef2", padding: "8px 0", fontSize: 14, fontWeight: 500, color: "#2b3438" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Activity Log */}
                <section style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#285ab9", fontSize: 20, fontWeight: "bold", marginBottom: 16 }}>history</span>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#586065" }}>Show</label>
                      <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} style={{ padding: "6px 28px 6px 12px", borderRadius: "8px", border: "1px solid #eaeef2", background: "#fff", fontSize: "12px", fontWeight: 500, color: "#2b3438", cursor: "pointer", outline: "none", transition: "all 0.2s ease", appearance: "none", backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23586065' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px" }}>
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Array.isArray(logs) && logs.slice((page - 1) * limit, page * limit).map((log, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 8, background: "#f8f9fb" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#2b3438" }}>{log.action}</div>
                            <div style={{ fontSize: 10, color: "#586065", marginTop: 2 }}>{log.target}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: log.level === "ERROR" ? 700 : 500, color: log.level === "ERROR" ? "#9f403d" : "#586065", textTransform: log.level === "ERROR" ? "uppercase" : "none", letterSpacing: log.level === "ERROR" ? ".05em" : 0, whiteSpace: "nowrap" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                      <button onClick={() => setPage((p) => Math.max(p - 1, 1))} style={{ padding: "6px 10px", background: "#eaeef2", borderRadius: 6, cursor: "pointer", border: "none" }}>Prev</button>
                      <span style={{ fontSize: 12, alignSelf: "center" }}>Page {page}</span>
                      <button onClick={() => setPage((p) => (p * limit < logs.length ? p + 1 : p))} style={{ padding: "6px 10px", background: "#eaeef2", borderRadius: 6, cursor: "pointer", border: "none" }}>Next</button>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <section style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ color: "#285ab9", fontSize: 20 }}>manage_accounts</span>
                    Role &amp; Privileges
                  </h2>
                  <p style={{ fontSize: 11, color: "#586065", marginBottom: 20 }}>Your current authorization level is restricted to high-tier operations.</p>
                  <div style={{ background: "#f1f4f7", borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#586065", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 }}>Access Tier Comparison</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {privileges.map(({ name, auditor }) => (
                        <div key={name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span className="material-symbols-outlined" style={{ color: "#285ab9", fontSize: 18, flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#2b3438" }}>{name}</div>
                            <div style={{ fontSize: 9, color: "#586065", fontStyle: "italic", marginTop: 2 }}>{auditor}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : (
          // Settings Component - AGRANDI
          <main style={{ paddingTop: "2rem", paddingLeft: "2rem", paddingRight: "2rem", paddingBottom: "2rem", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ maxWidth: "800px", width: "100%", margin: "0 auto" }}>
              <div style={{ background: "var(--surface-container-lowest)", borderRadius: "1rem", padding: "3rem", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", transition: "all 0.3s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", borderBottom: "2px solid var(--surface-container)", paddingBottom: "1rem" }}>
                  <div style={{ background: "rgba(40,90,185,0.1)", padding: "0.75rem", borderRadius: "0.75rem", color: "var(--primary)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>lock</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "Manrope", margin: 0, color: "var(--on-surface)" }}>Change Password</h2>
                    <p style={{ fontSize: "0.875rem", color: "var(--on-surface-variant)", margin: "0.25rem 0 0 0" }}>Choose a strong password to secure your account</p>
                  </div>
                </div>

                {error && (
                  <div style={{ marginBottom: "1.5rem", padding: "0.75rem", background: "rgba(159,64,61,0.1)", border: "1px solid var(--error)", borderRadius: "0.5rem", color: "var(--error)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      Current Password
                    </label>
                    <input type="password" value={password.currentPassword} onChange={(e) => handlePasswordChange("currentPassword", e.target.value)} style={{ background: "var(--surface-container-low)", border: `1px solid ${currentPasswordError ? "var(--error)" : "var(--outline-variant)"}`, borderRadius: "0.5rem", padding: "0.875rem 1rem", fontSize: "0.875rem", width: "100%", transition: "all 0.2s", outline: "none" }} placeholder="Enter current password" />
                    {currentPasswordError && (<div style={{ color: "var(--error)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>{currentPasswordError}</div>)}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      New Password
                    </label>
                    <input type="password" value={password.newPassword} onChange={(e) => handlePasswordChange("newPassword", e.target.value)} placeholder="Enter new password" style={{ background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)", borderRadius: "0.5rem", padding: "0.875rem 1rem", fontSize: "0.875rem", width: "100%", transition: "all 0.2s", outline: "none" }} />
                    {passwordStrengthError && (<div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>{passwordStrengthError}</div>)}
                    <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>Password must be at least 16 characters</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      Confirm New Password
                    </label>
                    <input type="password" value={password.confirmPassword} onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)} placeholder="Confirm new password" style={{ background: "var(--surface-container-low)", border: `1px solid ${password.newPassword && password.confirmPassword && password.newPassword !== password.confirmPassword ? "var(--error)" : "var(--outline-variant)"}`, borderRadius: "0.5rem", padding: "0.875rem 1rem", fontSize: "0.875rem", width: "100%", transition: "all 0.2s", outline: "none" }} />
                    {password.newPassword && password.confirmPassword && password.newPassword !== password.confirmPassword && (<div style={{ fontSize: "0.7rem", color: "var(--error)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}><span className="material-symbols-outlined" style={{ fontSize: "14px" }}>error</span>Passwords do not match!</div>)}
                  </div>

                  <button onClick={handleUpdatePassword} disabled={!!currentPasswordError || !!passwordStrengthError || !password.currentPassword || !password.newPassword || !password.confirmPassword} style={{ width: "100%", padding: "0.875rem", background: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword) ? "#ccc" : "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)", color: "#fff", fontWeight: 700, borderRadius: "0.5rem", border: "none", cursor: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword) ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(40,90,185,0.25)", fontSize: "0.875rem", transition: "all 0.2s", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword) ? 0.6 : 1 }}>
                    
                    Update Password
                  </button>

                  <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--surface-container-low)", borderRadius: "0.5rem", fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                    <div style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>info</span>
                      Password Requirements:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                      <li>At least 16 characters long</li>
                      <li>Contains uppercase and lowercase letters</li>
                      <li>Contains at least two numbers</li>
                      <li>Contains at least two special characters (!@#$%^&*)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </>
  );
}