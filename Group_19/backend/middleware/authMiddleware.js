const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect middleware: Verifies JWT token and attaches user to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised — no token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User account no longer exists." });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorised — token is invalid or expired." });
  }
};

/**
 * Role-based guard for Doctors:
 * Must have role="doctor" and verificationStatus="verified" (approved by Admin).
 */
const requireDoctor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.role !== "doctor") {
    return res.status(403).json({ message: "Access denied. Doctor privileges required." });
  }

  if (req.user.verificationStatus === "pending") {
    return res.status(403).json({
      message: "Your doctor account credentials are currently pending administrator review and approval.",
      code: "DOCTOR_PENDING_VERIFICATION",
      verificationStatus: "pending",
    });
  }

  if (req.user.verificationStatus === "rejected") {
    return res.status(403).json({
      message: `Your doctor application was rejected. Reason: ${req.user.rejectionReason || "Credentials could not be verified."}`,
      code: "DOCTOR_REJECTED",
      verificationStatus: "rejected",
      rejectionReason: req.user.rejectionReason,
    });
  }

  if (req.user.verificationStatus !== "verified") {
    return res.status(403).json({
      message: "Doctor verification required.",
      code: "DOCTOR_UNVERIFIED",
      verificationStatus: req.user.verificationStatus,
    });
  }

  next();
};

/**
 * Role-based guard for Administrators:
 * Must have role="admin".
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Administrator privileges required." });
  }

  next();
};

/**
 * Role-based guard for Patients:
 * Must have role="patient".
 */
const requirePatient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.role !== "patient") {
    return res.status(403).json({ message: "Access denied. Patient privileges required." });
  }

  next();
};

/**
 * Kept for backward compatibility if imported elsewhere, but allows all authenticated users
 */
const requireEmailVerified = (req, res, next) => {
  next();
};

module.exports = {
  protect,
  requireEmailVerified,
  requireDoctor,
  requireAdmin,
  requirePatient,
};
