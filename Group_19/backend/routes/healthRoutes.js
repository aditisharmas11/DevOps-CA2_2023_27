const express = require("express");
const router = express.Router();
const multer = require("multer");
const os = require("os");
const path = require("path");

const {
  uploadPdf,
  manualEntry,
  confirmExtracted,
  uploadRecord,
  getRecords,
  getRiskHistory,
  getLatestRisk,
} = require("../controllers/healthController");
const { protect } = require("../middleware/authMiddleware");

// Configure Multer for PDF file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), "meditwin_uploads"),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF documents (.pdf) are supported."), false);
    }
  },
});

router.use(protect); // All health routes require authentication

// ── New Patient-Facing Health Input Endpoints ─────────────────────────────────
router.post("/upload-pdf", upload.single("pdf"), uploadPdf);
router.post("/manual-entry", manualEntry);
router.post("/confirm-extracted", confirmExtracted);

// ── Legacy / Query Endpoints ──────────────────────────────────────────────────
router.post("/upload", uploadRecord);
router.get("/records", getRecords);
router.get("/risk-history", getRiskHistory);
router.get("/risk-latest", getLatestRisk);

module.exports = router;
