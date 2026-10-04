const express = require("express");
const router = express.Router();
const { getFullReport, getReportHistory } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/full", getFullReport);
router.get("/history", getReportHistory);

module.exports = router;
