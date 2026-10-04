const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  googleAuth,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const uploadDoctorId = require("../middleware/doctorUpload");

// Doctor ID document upload uses field name "idDocument"
router.post("/signup", uploadDoctorId.single("idDocument"), signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, getMe);

module.exports = router;
