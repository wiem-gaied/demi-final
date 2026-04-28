// hooks/usePermission.js
import { useAuth } from "../context/AuthContext";

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  return { hasPermission, hasAnyPermission, hasAllPermissions };
};