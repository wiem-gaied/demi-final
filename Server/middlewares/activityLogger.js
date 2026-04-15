import db from "../db.js";

// 🔹 Niveau
function getLevelFromAction(action) {
  const normalized = action.toUpperCase();
  const baseAction = normalized.split("_")[0];

  const levels = {
    DELETE: "ERROR",
    LOGIN_FAILED: "ERROR",
    ACCESS_DENIED: "ERROR",
    UPDATE: "WARNING",
    CREATE: "INFO",
    LOGIN: "INFO",
    LOGOUT: "INFO",
    VIEW: "INFO",
    EXPORT: "INFO",
  };

  return levels[baseAction] || "INFO";
}

// 🔹 IP
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
      const action = (req.logAction || actionType).toUpperCase();

      const user = req.session?.user;
      if (!user) return next();

      const userEmail = user.email;
      const userRole = user.role;
      const userName = user.name || userEmail;

      let target = "N/A";

      // 🔹 Actions sur des objets (DELETE, UPDATE, CREATE)
      if (req.params?.id && options.table && options.nameColumn) {
        try {
          const [rows] = await db.query(
            `SELECT ${options.nameColumn} AS name FROM ${options.table} WHERE id = ?`,
            [req.params.id],
          );
          if (rows.length > 0) target = rows[0].name;
          else target = `ID:${req.params.id}`;
        } catch (err) {
          console.error("Logger fetch error:", err);
          target = `ID:${req.params.id}`;
        }
      }
      // 🔹 Actions LOGIN/LOGOUT → target = soi-même
      else if (["LOGIN", "LOGOUT", "LOGIN_FAILED"].includes(action)) {
        target = userEmail;
      } else if (req.body) {
        if (req.body.email) {
          target = req.body.email;
        } else if (req.body.first_name && req.body.last_name) {
          target = `${req.body.first_name} ${req.body.last_name}`;
        } else if (req.body.name) {
          target = req.body.name;
        } else if (req.body.title) {
          target = req.body.title;
        }
      }
      // 🔹 Extra info
      // 🔹 Extra info descriptive
    let safeExtraInfo = {};

    // LOGIN_FAILED → raison du login
    if (action === "LOGIN_FAILED") {
      safeExtraInfo = {
        reason: req.loginFailReason || "Unknown", // tu peux définir req.loginFailReason dans ton middleware auth
        emailAttempted: req.body?.email || "unknown",
      };
    }
    // LOGIN / LOGOUT → simple message
    else if (action === "LOGIN" || action === "LOGOUT") {
      safeExtraInfo = {
        message: `User ${action} action`,
      };
    }
    // Actions sur objets (DELETE / UPDATE / CREATE)
    else if (["DELETE", "UPDATE", "CREATE"].includes(action.split("_")[0])) {
      safeExtraInfo = req.body || {};
    }
    // Autres actions → formulaire normal
    else {
      safeExtraInfo = req.body || {};
    }

    const extraInfo = JSON.stringify(safeExtraInfo);

      // 🔹 Métadonnées
      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "unknown";

      // 🔹 Level
      const level = getLevelFromAction(action);

      // 🔹 INSERT
      await db.query(
        `INSERT INTO logs 
        (user_email, role, action, target, extra_info, level, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userEmail,
          userRole,
          action,
          target,
          extraInfo,
          level,
          ip,
          userAgent,
        ]
      );

      console.log(
        `[LOG] ${userRole} ${userName} → ${action} → ${target} [${level}]`
      );
    } catch (err) {
      console.error("Logger error:", err);
    }

    next();
  };
}