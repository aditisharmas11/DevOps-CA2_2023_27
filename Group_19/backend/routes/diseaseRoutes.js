const express = require("express");
const router = express.Router();
const { predictDisease, getDiseaseHistory, getLatestAnalysis } = require("../controllers/diseaseController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/predict", predictDisease);
router.get("/history", getDiseaseHistory);
router.get("/latest", getLatestAnalysis);

module.exports = router;
