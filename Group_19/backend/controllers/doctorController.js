const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const RiskPrediction = require("../models/RiskPrediction");
const SymptomAnalysis = require("../models/SymptomAnalysis");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const DoctorFeedback = require("../models/DoctorFeedback");
const Activity = require("../models/Activity");

// GET /api/doctor/patient/:patientId
const getPatientDetails = async (req, res) => {
  try {
    const rawPatientId = req.params.patientId?.trim();
    if (!rawPatientId) {
      return res.status(400).json({ message: "Patient ID is required." });
    }

    // Find patient user (case-insensitive)
    const patient = await User.findOne({
      patientId: { $regex: new RegExp(`^${rawPatientId}$`, "i") },
    }).select("-password");

    if (!patient) {
      return res.status(404).json({
        message: `No patient found with ID: ${rawPatientId}. Please check the ID and try again.`,
      });
    }

    const patientId = patient.patientId;

    const [
      records,
      latestRisk,
      riskHistory,
      latestDisease,
      latestTreatment,
      feedbacks,
    ] = await Promise.all([
      HealthRecord.find({ patientId }).sort({ createdAt: -1 }).limit(10),
      RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 }),
      RiskPrediction.find({ patientId }).sort({ createdAt: 1 }),
      SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 }),
      TreatmentRecommendation.findOne({ patientId }).sort({ createdAt: -1 }),
      DoctorFeedback.find({ patientId }).sort({ createdAt: -1 }),
    ]);

    return res.json({
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        gender: patient.gender || "Not specified",
        dateOfBirth: patient.dateOfBirth,
        age: patient.dateOfBirth
          ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
          : 30,
        createdAt: patient.createdAt,
      },
      recordsCount: records.length,
      records,
      latestRisk,
      riskHistory,
      latestDisease,
      latestTreatment,
      feedbacks,
    });
  } catch (err) {
    console.error("getPatientDetails error:", err);
    return res.status(500).json({ message: "Server error fetching patient details." });
  }
};

// POST /api/doctor/feedback
const submitFeedback = async (req, res) => {
  try {
    const { patientId, feedback } = req.body;

    if (!patientId || !feedback || !feedback.trim()) {
      return res.status(400).json({ message: "Patient ID and feedback message are required." });
    }

    const patient = await User.findOne({
      patientId: { $regex: new RegExp(`^${patientId.trim()}$`, "i") },
    });

    if (!patient) {
      return res.status(404).json({ message: "Target patient not found." });
    }

    const doctorUser = req.user;

    const newFeedback = await DoctorFeedback.create({
      patientId: patient.patientId,
      doctorId: doctorUser.doctorId || `DOC-${doctorUser._id}`,
      doctorName: doctorUser.name.startsWith("Dr.") ? doctorUser.name : `Dr. ${doctorUser.name}`,
      specialization: doctorUser.specialization || "Consulting Physician",
      feedback: feedback.trim(),
    });

    // Log Activity for Patient's Dashboard / Timeline
    try {
      await Activity.create({
        patientId: patient.patientId,
        type: "DOCTOR_FEEDBACK",
        title: "Clinical Feedback Received",
        description: `${newFeedback.doctorName} (${newFeedback.specialization}) added clinical advice.`,
        meta: {
          doctorId: newFeedback.doctorId,
          feedbackId: newFeedback._id,
        },
      });
    } catch (actErr) {
      console.warn("Could not log activity for feedback:", actErr.message);
    }

    return res.status(201).json({
      message: "Feedback submitted successfully.",
      feedback: newFeedback,
    });
  } catch (err) {
    console.error("submitFeedback error:", err);
    return res.status(500).json({ message: "Server error submitting feedback." });
  }
};

// GET /api/doctor/recent-patients
const getRecentPatients = async (req, res) => {
  try {
    // Get distinct patient IDs from recent doctor feedbacks or registered patients
    const [recentFeedbacks, patients] = await Promise.all([
      DoctorFeedback.find({ doctorId: req.user.doctorId }).sort({ createdAt: -1 }).limit(10),
      User.find({ role: "patient", patientId: { $exists: true, $ne: null } })
        .select("name email patientId gender dateOfBirth createdAt")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    return res.json({
      recentFeedbacks,
      patientSuggestions: patients,
    });
  } catch (err) {
    console.error("getRecentPatients error:", err);
    return res.status(500).json({ message: "Server error fetching recent patients." });
  }
};

module.exports = {
  getPatientDetails,
  submitFeedback,
  getRecentPatients,
};
