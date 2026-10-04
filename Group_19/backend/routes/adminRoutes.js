const express = require("express");
const router = express.Router();
const {
  getAdminStats,
  getDoctorApplications,
  verifyDoctor,
  rejectDoctor,
  getPatients,
} = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middleware/authMiddleware");

// All admin routes strictly require valid JWT and role === "admin"
router.use(protect);
router.use(requireAdmin);

router.get("/stats", getAdminStats);
router.get("/doctors", getDoctorApplications);
router.post("/doctors/:id/verify", verifyDoctor);
router.post("/doctors/:id/reject", rejectDoctor);
router.get("/patients", getPatients);

module.exports = router;
