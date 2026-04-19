import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

function UserFormModal({ newUser, handleChange, handleAddUser, companies, role, setShowForm, inputStyle, buttonStyle,emailError, setEmailError}) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/;
  
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "36px",
          width: "400px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
            Add User
          </h2>

          <button
            onClick={() => setShowForm(false)}
            style={{
              background: "#F1F5F9",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "700",
            }}
          >
            ×
          </button>
        </div>

        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={newUser.first_name}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={newUser.last_name}
          onChange={handleChange}
          style={inputStyle}
        />

        <input
  type="email"
  name="email"
  value={newUser.email}
  onChange={(e) => {
    const value = e.target.value;

    handleChange(e);

    if (!value) {
      setEmailError("Email required");
    } 
    else if (!emailRegex.test(value)) {
      setEmailError("Invalid email format (ex: user@domain.com)");
    } 
    else {
      setEmailError("");
    }
  }}
  placeholder="Email"
  style={{
    ...inputStyle,
    borderColor: emailError ? "#EF4444" : "#E2E8F0"
  }}
/>
  {emailError && (
  <div style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>
    {emailError}
  </div>
)}
        <select
          name="role"
          value={newUser.role}
          onChange={(e) => {
            const value = e.target.value;
            handleChange({
              target: { name: "role", value },
            });

            
            if (value === "admin") {
              handleChange({
                target: { name: "company", value: "GRC Platform" },
              });
            } else if (newUser.company === "GRC Platform") {
              
              handleChange({
                target: { name: "company", value: "" },
              });
            }
          }}
          style={inputStyle}
        >
          <option value="">Select role</option>
          {role.map((r, i) => (
            <option key={i} value={r}>
              {r}
            </option>
          ))}
        </select>

        
        {newUser.role === "user" && (
          <select
            name="company"
            value={newUser.company}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="">Select Company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
          <button
            onClick={() => setShowForm(false)}
            style={{
              flex: 1,
              padding: "11px",
              border: "1.5px solid #E2E8F0",
              borderRadius: "10px",
              background: "#fff",
              color: "#64748B",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAddUser}
            disabled={emailError !== ""}
            style={{
              flex: 2,
              padding: "11px",
              border: "none",
              borderRadius: "10px",
              background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(59,111,255,0.3)",
            }}
          >
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccessPage() {

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [role, setRole] = useState(["admin",  "user"]);
  const [showForm, setShowForm] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    role: ""
  });
  const onDelete = async (userId) => {
  if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

  try {
    const res = await fetch(`http://localhost:3000/api/users/${userId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Erreur serveur");
    }

    // Supprimer l'utilisateur de la liste localement
    setUsers(prev => prev.filter(u => u.id !== userId));

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

  // ── Styles ─────────────────────────────
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid #E2E8F0",
    fontSize: "13px",
    outline: "none"
  };

  const buttonStyle = {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer"
  };

  // ── Charger données ───────────────────
  useEffect(() => {
    fetch("http://localhost:3000/api/companies", {
    credentials: "include"
  })
      .then(res => res.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      
      .catch(err => console.error(err));
    


    fetch("http://localhost:3000/api/users", {
    credentials: "include"
  })

      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  // ── Gestion form ──────────────────────
  

const handleChange = (e) => {
  const { name, value } = e.target;

  setNewUser(prev => ({
    ...prev,
    [name]: value
  }));
};

  const handleAddUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.role) {
      alert("Tous les champs sont requis");
      return;
    }

    try {
      const userToAdd = {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.role === "admin" ? "GRC Platform" : newUser.company
      };

      const res = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userToAdd),
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur serveur");
      }

      const addedUser = await res.json();
      setUsers(prev => [addedUser, ...prev]);

      setNewUser({ first_name: "", last_name: "", email: "", company: "" ,role:""});
      setShowForm(false);

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ── UI ─────────────────────────────────
  return (
    <div style={{ padding: "36px", display: "flex", flexDirection: "column", gap: "24px" }}>

      <div>
        <p style={{
          color: "#94A3B8",
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "5px",
          fontWeight: "600"
        }}>
          Administration
        </p>

        <h1 style={{
          color: "#0F172A",
          fontSize: "26px",
          fontWeight: "800"
        }}>
          Access & Controls
        </h1>
      </div>

      {tab === "users" && (
        <div style={{
          background: "#fff",
          border: "1.5px solid #F1F5F9",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
        }}>
          <div style={{
            padding: "18px 22px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span style={{
              color: "#0F172A",
              fontSize: "14px",
              fontWeight: "700"
            }}>
              Users ({users.length})
            </span>

            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "linear-gradient(135deg,#3B6FFF,#6D28D9)",
                border: "none",
                borderRadius: "8px",
                padding: "7px 14px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              + Add
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC" }}>
                {["First Name", "Last Name", "Email", "Company","Role"].map(h => (
                  <th key={h} style={{
                    padding: "11px 22px",
                    textAlign: "left",
                    color: "#94A3B8",
                    fontSize: "10px",
                    fontWeight: "700",
                    textTransform: "uppercase"
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: "13px 22px" }}>{u.first_name}</td>
                  <td style={{ padding: "13px 22px" }}>{u.last_name}</td>
                  <td style={{ padding: "13px 22px" }}>{u.email}</td>
                  
                  <td style={{ padding: "13px 22px" }}>{u.organization}</td>
                  <td style={{ padding: "13px 22px" }}>{u.role}</td>
                  <td style={{ padding: "13px 22px" }}>
                  <button onClick={() => onDelete(u.id)} style={{ background: "#FEF2F2", border: "none", borderRadius: "7px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#EF4444" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                            onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}
                    >
                            <Trash2 size={13} />
                    </button>
                      
                  </td>
  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserFormModal
          newUser={newUser}
          handleChange={handleChange}
          handleAddUser={handleAddUser}
          companies={companies}
          role={role}
          setShowForm={setShowForm}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
          emailError={emailError}
  setEmailError={setEmailError}

        />
      )}
    </div>
  );
}