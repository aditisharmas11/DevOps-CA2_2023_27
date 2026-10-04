const express = require("express");
const router = express.Router();
const {
  getPatientDetails,
  submitFeedback,
  getRecentPatients,
} = require("../controllers/doctorController");
const { protect, requireDoctor } = require("../middleware/authMiddleware");

// All doctor endpoints require valid JWT and verified doctor status
router.use(protect);
router.use(requireDoctor);

router.get("/patient/:patientId", getPatientDetails);
router.post("/feedback", submitFeedback);
router.get("/recent-patients", getRecentPatients);

module.exports = router;
