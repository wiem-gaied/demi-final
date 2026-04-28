// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const ADMIN_ROLE = "admin"; // ou "superuser", selon ta nomenclature

export const AuthProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/permissions/me/permissions", {
          credentials: "include",
        });
        const data = await res.json();
        setPermissions(data.permissions || []);
        setRole(data.role || null);
      } catch (err) {
        console.error("Auth error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  // ✅ Si admin → bypass total, sinon vérifie la permission
  const isAdmin = role === ADMIN_ROLE;

  const hasPermission = (permission) => {
    if (isAdmin) return true; // 👑 admin a tout
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms) => {
    if (isAdmin) return true;
    return perms.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (perms) => {
    if (isAdmin) return true;
    return perms.every((p) => permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        permissions,
        role,
        isAdmin,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);