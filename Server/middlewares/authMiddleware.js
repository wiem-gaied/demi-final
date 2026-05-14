// middleware/authMiddleware.js

const PUBLIC_ROUTES = [
  { path: '/api/login',           method: 'POST' },
  { path: '/api/logout',          method: 'POST' },
  { path: '/api/auth/login',      method: 'POST' },
  { path: '/api/auth/logout',     method: 'POST' },
  { path: '/api/activate',        method: 'GET'  },
  { path: '/api/activate',        method: 'POST' },
  { path: '/api/reset',           method: 'POST' },
  { path: '/api/reset',           method: 'GET'  },
];

const authMiddleware = (req, res, next) => {
  // Laisse passer les OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') return next();

  const isPublic = PUBLIC_ROUTES.some(
    (route) => req.path.startsWith(route.path) && route.method === req.method
  );

  if (isPublic) return next();

  if (req.session && req.session.user) return next();

  return res.status(401).json({ message: "Non authentifié" });
};

export default authMiddleware;  