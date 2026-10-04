const express = require("express");
const router = express.Router();
const { getLatestTreatment, getTreatmentHistory, generateTreatment } = require("../controllers/treatmentController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/latest", getLatestTreatment);
router.get("/history", getTreatmentHistory);
router.post("/generate", generateTreatment);

module.exports = router;
