const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const RiskPrediction = require("../models/RiskPrediction");
const SymptomAnalysis = require("../models/SymptomAnalysis");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const DoctorFeedback = require("../models/DoctorFeedback");

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// High-level system KPIs for Admin Dashboard
// ──────────────────────────────────────────────────────────────────────────────
const getAdminStats = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      pendingDoctors,
      verifiedDoctors,
      rejectedDoctors,
      totalHealthRecords,
      totalRiskPredictions,
      totalSymptomAnalyses,
      totalFeedbacks,
    ] = await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "doctor", verificationStatus: "pending" }),
      User.countDocuments({ role: "doctor", verificationStatus: "verified" }),
      User.countDocuments({ role: "doctor", verificationStatus: "rejected" }),
      HealthRecord.countDocuments(),
      RiskPrediction.countDocuments(),
      SymptomAnalysis.countDocuments(),
      DoctorFeedback.countDocuments(),
    ]);

    return res.json({
      totalPatients,
      totalDoctors,
      pendingDoctors,
      verifiedDoctors,
      rejectedDoctors,
      totalHealthRecords,
      totalRiskPredictions,
      totalSymptomAnalyses,
      totalFeedbacks,
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({ message: "Server error fetching admin metrics." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/doctors
// List and filter doctor applications
// ──────────────────────────────────────────────────────────────────────────────
const getDoctorApplications = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { role: "doctor" };
    if (status && status !== "all") {
      filter.verificationStatus = status;
    }

    const doctors = await User.find(filter)
      .select("-password")
      .populate("verifiedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(doctors);
  } catch (err) {
    console.error("getDoctorApplications error:", err);
    return res.status(500).json({ message: "Server error fetching doctor applications." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/doctors/:id/verify
// Approve a doctor's credentials
// ──────────────────────────────────────────────────────────────────────────────
const verifyDoctor = async (req, res) => {
  try {
    const doctorIdParam = req.params.id;

    const doctor = await User.findOne({
      $or: [{ _id: doctorIdParam.match(/^[0-9a-fA-F]{24}$/) ? doctorIdParam : null }, { doctorId: doctorIdParam }],
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor account not found." });
    }

    doctor.verificationStatus = "verified";
    doctor.verifiedBy = req.user._id;
    doctor.verifiedAt = new Date();
    doctor.rejectionReason = "";
    doctor.rejectedBy = undefined;
    doctor.rejectedAt = undefined;

    await doctor.save();

    return res.json({
      message: `Dr. ${doctor.name} has been verified and approved for full clinical access.`,
      doctor,
    });
  } catch (err) {
    console.error("verifyDoctor error:", err);
    return res.status(500).json({ message: "Server error during doctor verification." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/doctors/:id/reject
// Reject a doctor's credentials
// ──────────────────────────────────────────────────────────────────────────────
const rejectDoctor = async (req, res) => {
  try {
    const doctorIdParam = req.params.id;
    const { reason } = req.body;

    const doctor = await User.findOne({
      $or: [{ _id: doctorIdParam.match(/^[0-9a-fA-F]{24}$/) ? doctorIdParam : null }, { doctorId: doctorIdParam }],
      role: "doctor",
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor account not found." });
    }

    doctor.verificationStatus = "rejected";
    doctor.rejectionReason = reason || "Medical credentials or license could not be verified by the administrator.";
    doctor.rejectedBy = req.user._id;
    doctor.rejectedAt = new Date();

    await doctor.save();

    return res.json({
      message: `Doctor application for Dr. ${doctor.name} has been rejected.`,
      doctor,
    });
  } catch (err) {
    console.error("rejectDoctor error:", err);
    return res.status(500).json({ message: "Server error during doctor rejection." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/patients
// List all registered patients with activity metrics (view only)
// ──────────────────────────────────────────────────────────────────────────────
const getPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" })
      .select("-password")
      .sort({ createdAt: -1 });

    // Fetch counts of health records and predictions for each patient
    const patientIds = patients.map((p) => p.patientId).filter(Boolean);

    const recordCounts = await HealthRecord.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $group: { _id: "$patientId", count: { $sum: 1 } } },
    ]);

    const recordCountMap = Object.fromEntries(recordCounts.map((r) => [r._id, r.count]));

    const patientList = patients.map((p) => ({
      id: p._id,
      patientId: p.patientId,
      name: p.name,
      email: p.email,
      gender: p.gender || "Not specified",
      dateOfBirth: p.dateOfBirth,
      verificationStatus: p.verificationStatus,
      createdAt: p.createdAt,
      healthRecordsCount: recordCountMap[p.patientId] || 0,
    }));

    return res.json(patientList);
  } catch (err) {
    console.error("getPatients error:", err);
    return res.status(500).json({ message: "Server error fetching patients directory." });
  }
};

module.exports = {
  getAdminStats,
  getDoctorApplications,
  verifyDoctor,
  rejectDoctor,
  getPatients,
};
