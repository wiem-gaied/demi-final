// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
const ADMIN_ROLE = "admin";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // ← MANQUAIT
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/permissions/me/permissions", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("not auth");
        return res.json();
      })
      .then((data) => {
        setUser(data.user ?? true);
        setPermissions(data.permissions || []);
        setRole(data.role || null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData) => setUser(userData ?? true); // ← MANQUAIT dans value

  const logout = () => {
    setUser(null);
    setPermissions([]);
    setRole(null);
  };

  const isAdmin = role === ADMIN_ROLE;
  const hasPermission = (p) => isAdmin || permissions.includes(p);
  const hasAnyPermission = (ps) => isAdmin || ps.some((p) => permissions.includes(p));
  const hasAllPermissions = (ps) => isAdmin || ps.every((p) => permissions.includes(p));

  return (
    <AuthContext.Provider value={{
      user,          // ← MANQUAIT
      login,         // ← MANQUAIT
      logout,
      permissions,
      role,
      isAdmin,
      loading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);