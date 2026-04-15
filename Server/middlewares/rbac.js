export function authMiddleware(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = req.session.user;

  next();
}
export function requirePermission(permission) {
  return (req, res, next) => {
    const groups = req.user.groups || [];

    const userPermissions = new Set(
      groups.flatMap(g => g.permissions || [])
    );

    if (!userPermissions.has(permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}