import { useState, useEffect } from "react";
import zxcvbn from "zxcvbn";

const tailwindConfig = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
`;

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

if (result.score < 3 && getAdvancedScore(pw) < 6) {
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

export default function SentinelSettings() {
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

  const toggleNotif = (key) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  // Vérification du mot de passe actuel en temps réel
  useEffect(() => {
    // Ne pas vérifier si le champ est vide
    if (!password.currentPassword) {
      setCurrentPasswordError("");
      return;
    }

    // Debounce pour éviter trop de requêtes
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/api/reset/check-password",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
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
    }, 600); // Attendre 600ms après la dernière frappe

    return () => clearTimeout(timeout);
  }, [password.currentPassword]);
  useEffect(() => {
  if (!password.newPassword) {
    setPasswordStrengthError("");
    return;
  }

  const result = isPasswordStrong(password.newPassword);

  if (!result.valid) {
    setPasswordStrengthError(result.reason);
  } else {
    setPasswordStrengthError("");
  }
}, [password.newPassword]);

  const handlePasswordChange = (field, value) => {
    setPassword(prev => ({ ...prev, [field]: value }));
    // Clear general error when user starts typing
    if (error) setError("");
  };

  const handleUpdatePassword = async () => {
    setError("");

    // Validation côté client
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

    // Validation des exigences du mot de passe
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

      // Reset form
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

        /* Manual utility classes for color with opacity */
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

      <div
        className="bg-surface text-on-surface min-h-screen"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Main Content - Full width */}
        <main
          style={{
            paddingTop: "1rem",
            paddingLeft: "2rem",
            paddingRight: "2rem",
            paddingBottom: "2rem",
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {/* Security - Password Change Box (Full width, stacked fields) */}
            <div
              style={{
                background: "var(--surface-container-lowest)",
                borderRadius: "1rem",
                padding: "2.5rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "2rem",
                  borderBottom: "2px solid var(--surface-container)",
                  paddingBottom: "1rem",
                }}
              >
                <div
                  style={{
                    background: "rgba(40,90,185,0.1)",
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    color: "var(--primary)",
                  }}
                >
                    <MaterialIcon name="verified_user" style={{ fontSize: "14px" }} />
                  
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      fontFamily: "Manrope",
                      margin: 0,
                      color: "var(--on-surface)",
                    }}
                  >
                    
                    Change Password
                  </h2>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--on-surface-variant)",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    Choose a strong password to secure your account
                  </p>
                </div>
              </div>

              {/* Afficher l'erreur générale */}
              {error && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "0.75rem",
                    background: "rgba(159,64,61,0.1)",
                    border: "1px solid var(--error)",
                    borderRadius: "0.5rem",
                    color: "var(--error)",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                {/* Current Password Field */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--on-surface-variant)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={password.currentPassword}
                    onChange={(e) =>
                      handlePasswordChange("currentPassword", e.target.value)
                    }
                    style={{
                      background: "var(--surface-container-low)",
                      border: `1px solid ${currentPasswordError ? "var(--error)" : "var(--outline-variant)"}`,
                      borderRadius: "0.5rem",
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      width: "100%",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    placeholder="Enter current password"
                    onFocus={(e) => {
                      e.target.style.borderColor = currentPasswordError ? "var(--error)" : "var(--primary)";
                      e.target.style.boxShadow = currentPasswordError 
                        ? "0 0 0 3px rgba(159,64,61,0.1)"
                        : "0 0 0 3px rgba(40,90,185,0.1)";
                    }}
                    onBlur={(e) => {
                      if (!currentPasswordError) {
                        e.target.style.borderColor = "var(--outline-variant)";
                      }
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {currentPasswordError && (
                    <div 
                      style={{ 
                        color: "var(--error)", 
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        marginTop: "0.25rem"
                      }}
                    >
                      
                      {currentPasswordError}
                    </div>
                  )}
                  
                </div>

                {/* New Password Field */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--on-surface-variant)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                    placeholder="Enter new password"
                    style={{
                      background: "var(--surface-container-low)",
                      border: "1px solid var(--outline-variant)",
                      borderRadius: "0.5rem",
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      width: "100%",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--primary)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(40,90,185,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--outline-variant)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {password.currentPassword &&
 password.newPassword &&
 password.currentPassword === password.newPassword && (
  <div style={{ color: "var(--error)", fontSize: "0.75rem" }}>
    New password must be different from current password
  </div>
)}
{passwordStrengthError && (
  <div
    style={{
      color: "var(--error)",
      fontSize: "0.75rem",
      marginTop: "0.25rem",
      display: "flex",
      alignItems: "center",
      gap: "0.25rem"
    }}
  >
    
    {passwordStrengthError}
  </div>
)}
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--on-surface-variant)",
                      marginTop: "0.25rem",
                    }}
                  >
                    Password must be at least 16 characters
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--on-surface-variant)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={password.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                    placeholder="Confirm new password"
                    style={{
                      background: "var(--surface-container-low)",
                      border: `1px solid ${
                        password.newPassword && 
                        password.confirmPassword && 
                        password.newPassword !== password.confirmPassword 
                          ? "var(--error)" 
                          : "var(--outline-variant)"
                      }`,
                      borderRadius: "0.5rem",
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      width: "100%",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--primary)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(40,90,185,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--outline-variant)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {password.newPassword &&
                    password.confirmPassword &&
                    password.newPassword !== password.confirmPassword && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--error)",
                          marginTop: "0.25rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        
                        Passwords do not match!
                      </div>
                    )}
                </div>

                {/* Update Password Button */}
                <button
                  onClick={handleUpdatePassword}
                  disabled={
  !!currentPasswordError ||
  !!passwordStrengthError ||
  !password.currentPassword ||
  !password.newPassword ||
  !password.confirmPassword
}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    background: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword)
                      ? "#ccc"
                      : "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: "0.5rem",
                    border: "none",
                    cursor: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword)
                      ? "not-allowed"
                      : "pointer",
                    boxShadow: "0 4px 14px rgba(40,90,185,0.25)",
                    fontSize: "0.875rem",
                    transition: "all 0.2s",
                    marginTop: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: (!!currentPasswordError || !password.currentPassword || !password.newPassword || !password.confirmPassword) ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!currentPasswordError && password.currentPassword && password.newPassword && password.confirmPassword) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(40,90,185,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(40,90,185,0.25)";
                  }}
                  onMouseDown={(e) => {
                    if (!currentPasswordError && password.currentPassword && password.newPassword && password.confirmPassword) {
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!currentPasswordError && password.currentPassword && password.newPassword && password.confirmPassword) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                >
                  
                  Update Password
                </button>

                {/* Password Requirements */}
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "var(--surface-container-low)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--on-surface-variant)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    
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
      </div>
    </>
  );
}