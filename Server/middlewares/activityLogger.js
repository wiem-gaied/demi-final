import db from "../db.js";

function getCategory(action) {
  if (!action) return "ACTIVITY";

  const normalized = String(action).trim().toUpperCase();

  const SECURITY = new Set([
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "ACCESS_DENIED",
    "MFA_FAILED",
    "TOKEN_EXPIRED",
  ]);

  return SECURITY.has(normalized) ? "SECURITY" : "ACTIVITY";
}

function getLevelFromAction(action) {
  if (!action) return "INFO";

  const normalized = action.toUpperCase();

  const levels = {
    DELETE: "INFO",
    LOGIN_FAILED: "WARNING",
    ACCESS_DENIED: "ERROR",
    MFA_FAILED: "WARNING",
    UPDATE: "INFO",
    CREATE: "INFO",
    LOGIN: "INFO",
    LOGOUT: "INFO",
    VIEW: "INFO",
    EXPORT: "INFO",
    GENERATE_REPORT: "INFO",
    COMPLIANCE_ANALYSIS: "INFO",
    ADD_RISK: "INFO",
  };

  return levels[normalized] || levels[normalized.split("_")[0]] || "INFO";
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export function activityLogger(actionType, options = {}) {
  return async (req, res, next) => {
    try {
      console.log("🟡 activityLogger called with action =", actionType);
      console.log("🟡 req.session?.user =", req.session?.user);
      console.log("🟡 req.body?.email =", req.body?.email);
      const action = (req.logAction || actionType || "UNKNOWN").toUpperCase();
      const category = getCategory(action);

      const user = req.session?.user;

      // ✅ FIXED: fallback sur req.body quand pas de session (LOGIN_FAILED, MFA_FAILED)
      const userEmail = user?.email || req.body?.email || "unknown";
      const userRole  = user?.role  || "anonymous";
      const userName  = user?.name  || userEmail;

      let target = req.logTarget || "N/A";

      if (req.params?.id && options.table && options.nameColumn) {
        try {
          const [rows] = await db.query(
            `SELECT ${options.nameColumn} AS name FROM ${options.table} WHERE id = ?`,
            [req.params.id]
          );
          target = rows.length ? rows[0].name : `ID:${req.params.id}`;
        } catch (err) {
          console.error("Logger fetch error:", err);
          target = `ID:${req.params.id}`;
        }
      } else if (["LOGIN", "LOGOUT", "LOGIN_FAILED", "MFA_FAILED"].includes(action)) {
        target = userEmail;
      } else if (req.body) {
        target =
          req.body.name ||
          req.body.title ||
          req.body.email ||
          `${req.body.first_name || ""} ${req.body.last_name || ""}`.trim() ||
          target;
      }

      let safeExtraInfo = {};

      if (action === "LOGIN_FAILED") {
        safeExtraInfo = {
          reason: req.loginFailReason || "Unknown",
          emailAttempted: req.body?.email || "unknown",
        };
      } else if (["LOGIN", "LOGOUT"].includes(action)) {
        safeExtraInfo = {
          message: `User ${action} action`,
        };
      } else {
        safeExtraInfo = req.body || {};
      }

      const extraInfo = JSON.stringify(safeExtraInfo);
      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "unknown";
      const level = getLevelFromAction(action);

      console.log("👉 ACTION =", action);
      console.log("👉 CATEGORY =", category);
      console.log("👉 TARGET =", target);

      await db.query(
        `INSERT INTO logs 
        (user_email, role, action, target, extra_info, level, ip_address, user_agent, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userEmail, userRole, action, target, extraInfo, level, ip, userAgent, category]
      );

      console.log(`[LOG] ${userRole} ${userName} → ${action} → ${target} [${level}]`);
    } catch (err) {
      console.error("Logger error:", err);
    }

    next();
  };
}