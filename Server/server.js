import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from "./db.js";
import session from "express-session";
import cookieParser from "cookie-parser";

// Import des routes
import { importStandardsToDB } from "./routes/cisoRoutes.js";
import cisoRoutes from "./routes/cisoRoutes.js";
import risksRoutes from './routes/risks.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import aiRoutes from "./routes/aiRoutes.js";
import LoginRouter from './routes/Login.js'
import adminRoutes from "./routes/admin.js";
import companiesRouter from "./routes/companies.js"
import usersRouter from "./routes/users.js"
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
import framauditorRoutes from './routes/frameworksauditor.js';
import reportingRouter from "./routes/reporting.js";
import analysisRoutes from "./routes/analysisRoutes.js"
import dashboardRouter from "./routes/dashboard.js"

const app = express();

// ============================================================
// 1. MIDDLEWARES (dans l'ordre correct - UNE SEULE FOIS)
// ============================================================

// Body parser middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// CORS - UNE SEULE FOIS
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Session middleware - UNE SEULE FOIS
app.use(session({
    name: "grc_sid",
    secret: process.env.SESSION_SECRET || "maCleSecrete",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// ============================================================
// 2. ROUTES
// ============================================================

app.get('/', (req, res) => res.send('Server is live!'));

// Routes API
app.use("/api/ciso", cisoRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use('/api/risks', risksRoutes);
app.use("/api", chatbotRoutes);
app.use("/api/ai", aiRoutes);  
app.use("/api", LoginRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/companies", companiesRouter);
app.use("/api/role", roleRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRoutes);
app.use("/api/activate", activateRouter);
app.use("/api/frameworks", frameworksRouter);
app.use("/api/logs", logsRouter);
app.use("/api/reset", resetRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/businessrisks", businessRisksRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/security", securitysessionRouter);
app.use("/api/framauditor", framauditorRoutes);
app.use("/api/reporting", reportingRouter);
app.use("/api/analyses", analysisRoutes);

// ============================================================
// 3. Gestion des erreurs 404
// ============================================================

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ============================================================
// 4. Gestion des erreurs globales
// ============================================================

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: "Something went wrong!",
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================================
// 5. DÉMARRAGE DU SERVEUR
// ============================================================
const PORT = process.env.PORT || 3000;

// Appel unique de importStandardsToDB
importStandardsToDB().catch(err => console.error("Import error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});