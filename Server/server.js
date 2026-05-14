// app.js / index.js / server.js  (replace your current entry file with this)
//
// Key fixes vs. previous version:
//   1. Removed duplicate app.listen() — port 3000 was being bound twice.
//   2. Removed `importStandardsToDB()` call at boot — that was re-inserting
//      every JSON file as a public row at every restart and is the source of
//      "doublement" + the rows that always end up with created_by_user_id=NULL.
//      Frameworks must be created via /api/scraper/scrape or
//      /api/framauditor/add-custom-framework so the actual user is recorded.
//   3. CISO auto-start runs once before app.listen.

import express from "express";
import cors from "cors";
import "dotenv/config";
import session from "express-session";
import cookieParser from "cookie-parser";

import db from "./db.js";

// Routes — keep your existing imports (paths must match YOUR filenames)
import cisoRouters from "./routes/cisoRoutes.js";
import risksRoutes from "./routes/risks.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import LoginRouter from "./routes/Login.js";
import adminRoutes from "./routes/admin.js";
import companiesRouter from "./routes/companies.js";
import usersRouter from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import activateRouter from "./routes/activate.js";
import roleRouter from "./routes/role.js";
import frameworksRouter from "./routes/frameworks.js";
import logsRouter from "./routes/Logs.js";
import resetRouter from "./routes/reset.js";
import assetsRouter from "./routes/assets.js";
import businessRisksRouter from "./routes/businessRisks.js";
import settingsRouter from "./routes/settings.js";
import permissionsRouter from "./routes/permissions.js";
import securitysessionRouter from "./routes/securitysession.js";
import framauditor from "./routes/frameworksauditor.js";
import reportingRouter from "./routes/reporting.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import dashboardRouter from "./routes/dashboard.js";
import scraperRouter, { ensureDockerUp } from "./routes/scraper.js";


const app = express();
const PORT = process.env.PORT || 3000;


// ============================================================
// 1. MIDDLEWARES (order matters)
// ============================================================
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-User-Id", "X-Dev-User-Id"],
}));

app.use(session({
  name: "grc_sid",
  secret: process.env.SESSION_SECRET || "maCleSecrete",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
}));






// ============================================================
// 2. ROUTES
// ============================================================
app.get("/", (req, res) => res.send("Server is live!"));


app.use("/api/ciso",        cisoRouters);
app.use("/api/dashboard",   dashboardRouter);
app.use("/api/risks",       risksRoutes);
app.use("/api",             chatbotRoutes);
app.use("/api/ai",          aiRoutes);
app.use("/api",             LoginRouter);
app.use("/api/admin",       adminRoutes);
app.use("/api/companies",   companiesRouter);
app.use("/api/role",        roleRouter);
app.use("/api/users",       usersRouter);
app.use("/api/auth",        authRoutes);
app.use("/api/activate",    activateRouter);
app.use("/api/frameworks",  frameworksRouter);
app.use("/api/logs",        logsRouter);
app.use("/api/reset",       resetRouter);
app.use("/api/assets",      assetsRouter);
app.use("/api/businessrisks", businessRisksRouter);
app.use("/api/settings",    settingsRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/security",    securitysessionRouter);
app.use("/api/framauditor", framauditor);
app.use("/api/reporting",   reportingRouter);
app.use("/api/analyses",    analysisRoutes);
app.use("/api/scraper",     scraperRouter);


// ============================================================
// 3. 404 + errors
// ============================================================
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================================================
// 4. SINGLE STARTUP — auto-start CISO, then listen
// ============================================================
(async () => {
  try {
    console.log("[boot] ensuring CISO Assistant is up...");
    await ensureDockerUp();
    console.log("[boot] CISO is ready.");
  } catch (e) {
    console.warn("[boot] CISO could not be auto-started:", e.message);
    console.warn("[boot] /api/scraper/start can be called later from the UI.");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
  });
})();