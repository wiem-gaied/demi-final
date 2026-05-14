// authHelper.js
// Strict authentication. NO fallback to user 1.
// Resolves the current user from (in this order):
//   1. req.user already set by upstream middleware (passport, express-jwt, ...)
//   2. req.session.user / req.session.userId (express-session)
//   3. JWT in `Authorization: Bearer <token>`
//   4. JWT in cookie  (token / jwt / auth_token / access_token)
//   5. X-Dev-User-Id header  (for local testing only)
//   6. X-User-Id header (frontend can send the logged-in user's id explicitly)
// If none of the above yields a user, returns 401 "Login required".
//
// Visibility rule reminder:
//   - created_by_user_id IS NULL  => public  (admin-created)
//   - created_by_user_id = X      => private to user X
//   - no login                    => 401 from authenticateToken => UI shows "login required"

import jwt from "jsonwebtoken";
import db from "../db.js";

// Minimal cookie parser — works without cookie-parser middleware.
function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = decodeURIComponent(part.slice(eq + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

function tryVerifyJwt(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Try every supported way of identifying the current user.
async function resolveUser(req) {
  // 1. Already populated by upstream middleware
  if (req.user?.id) return { source: "upstream", user: req.user };

  // 2. Express session
  if (req.session?.user?.id) return { source: "session.user", user: req.session.user };
  if (req.session?.userId)   return { source: "session.userId", user: { id: req.session.userId } };

  // 3. JWT in Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    const verified = tryVerifyJwt(m && m[1]);
    if (verified?.id) return { source: "bearer", user: verified };
  }

  // 4. JWT in a cookie
  const cookies = req.cookies || parseCookieHeader(req.headers.cookie);
  const cookieJwt =
    cookies?.token || cookies?.jwt || cookies?.auth_token ||
    cookies?.access_token || cookies?.session;
  const verifiedCookie = tryVerifyJwt(cookieJwt);
  if (verifiedCookie?.id) return { source: "cookie-jwt", user: verifiedCookie };

  // 5. Dev header — explicitly opt-in for testing
  const devUserId = parseInt(req.headers["x-dev-user-id"], 10);
  if (Number.isFinite(devUserId)) return { source: "x-dev-user-id", user: { id: devUserId } };

  // 6. Plain X-User-Id header (frontend forwards the logged-in user's id)
  //    NOT secure on its own — must be combined with a real auth backend in production.
  const xUserId = parseInt(req.headers["x-user-id"], 10);
  if (Number.isFinite(xUserId)) return { source: "x-user-id", user: { id: xUserId } };

  return null;
}

export const authenticateToken = async (req, res, next) => {
  const resolved = await resolveUser(req);
  if (!resolved) {
    return res.status(401).json({
      error: "Login required",
      hint: "Provide auth via Authorization: Bearer <jwt>, a JWT cookie, or X-User-Id header."
    });
  }
  req.user = resolved.user;
  req._authSource = resolved.source;
  next();
};

// Resolve user-context from DB so we always have the authoritative role.
export async function getUserContext(req) {
  if (req._userContextCache) return req._userContextCache;
  const userId = req.user?.id;
  if (!userId) {
    const ctx = { userId: null, role: null, isAdmin: false };
    req._userContextCache = ctx;
    return ctx;
  }
  try {
    const [rows] = await db.query(
      "SELECT id, role, email, first_name, last_name FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (!rows.length) {
      const ctx = { userId, role: null, isAdmin: false };
      req._userContextCache = ctx;
      return ctx;
    }
    const role = (rows[0].role || "").toLowerCase();
    const ctx = {
      userId,
      role,
      isAdmin: role === "admin",
      email: rows[0].email,
      name: `${rows[0].first_name || ""} ${rows[0].last_name || ""}`.trim()
    };
    req._userContextCache = ctx;
    return ctx;
  } catch (e) {
    const ctx = { userId, role: null, isAdmin: false };
    req._userContextCache = ctx;
    return ctx;
  }
}

export async function requireAdmin(req, res, next) {
  const ctx = await getUserContext(req);
  if (!ctx.isAdmin) return res.status(403).json({ error: "Admin only" });
  next();
}

export function visibilityClause(ctx, alias = "s") {
  const a = alias ? `${alias}.` : "";
  return {
    whereClause: `(${a}created_by_user_id IS NULL OR ${a}created_by_user_id = ?)`,
    params: [ctx.userId]
  };
}

export function assertCanSeeStandard(standard, ctx, res) {
  if (!standard) {
    res.status(404).json({ error: "Standard not found" });
    return false;
  }
  const owner = standard.created_by_user_id;
  if (owner != null && owner !== ctx.userId) {
    res.status(403).json({ error: "You don't have access to this framework" });
    return false;
  }
  return true;
}

export function isOwnedBy(standard, ctx) {
  return ctx.isAdmin || (standard?.created_by_user_id === ctx.userId);
}
