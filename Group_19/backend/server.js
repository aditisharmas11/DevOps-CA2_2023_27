const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const {
  metricsMiddleware,
  metricsHandler,
} = require("./metrics");
const connectDB = require("./config/db");

// ── Pre-import ALL models so Mongoose registers them and
//    MongoDB creates the collections on first connection ────────────────────
require("./models/User");
require("./models/HealthRecord");
require("./models/RiskPrediction");
require("./models/SymptomAnalysis");
require("./models/TreatmentRecommendation");
require("./models/Activity");
require("./models/DoctorFeedback");

// ── Database ─────────────────────────────────────────────────────────────────
connectDB().then(() => {
  const seedAdmin = require("./config/seedAdmin");
  seedAdmin();
});

const app = express();

const fs = require("fs");

// Ensure doctor-ids upload directory exists
const uploadDir = path.join(__dirname, "uploads", "doctor-ids");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(metricsMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/health",    require("./routes/healthRoutes"));
app.use("/api/disease",   require("./routes/diseaseRoutes"));
app.use("/api/treatment", require("./routes/treatmentRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/reports",        require("./routes/reportRoutes"));
app.use("/api/doctor",         require("./routes/doctorRoutes"));
app.use("/api/admin",          require("./routes/adminRoutes"));
app.use("/api/public-doctors", require("./routes/externalDoctorRoutes"));

app.get("/metrics", metricsHandler);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/ping", (_, res) => res.json({ status: "ok", service: "MediTwin Backend" }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found.` }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 MediTwin backend running on http://localhost:${PORT}`);
});

// Graceful EADDRINUSE — tell the user clearly instead of crashing
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run this to free it:\n`);
    console.error(`   PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
