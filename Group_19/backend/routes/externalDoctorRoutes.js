const express = require("express");
const router = express.Router();
const {
  getPublicDoctors,
  getAvailableFilters,
  getPublicDoctorById,
} = require("../controllers/externalDoctorController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected by MediTwin auth
router.use(protect);

router.get("/filters", getAvailableFilters);
router.get("/:id", getPublicDoctorById);
router.get("/", getPublicDoctors);

module.exports = router;
