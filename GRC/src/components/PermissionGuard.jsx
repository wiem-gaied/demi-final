// components/PermissionGuard.jsx
import { useAuth } from "../context/AuthContext";

const PermissionGuard = ({
  permission,        // string  → une seule permission
  permissions,       // array   → plusieurs permissions
  mode = "any",      // "any" | "all"
  children,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let allowed = false;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (permissions) {
    allowed = mode === "all"
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  return allowed ? children : fallback;
};

export default PermissionGuard;