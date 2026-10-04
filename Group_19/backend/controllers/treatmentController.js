const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const RiskPrediction = require("../models/RiskPrediction");
const SymptomAnalysis = require("../models/SymptomAnalysis");
const DoctorFeedback = require("../models/DoctorFeedback");
const HealthRecord = require("../models/HealthRecord");
const module3Service = require("../services/module3Service");

// GET /api/treatment/latest
const getLatestTreatment = async (req, res) => {
  try {
    const { patientId } = req.user;
    const latest = await TreatmentRecommendation.findOne({ patientId })
      .sort({ createdAt: -1 });

    const [latestRisk, latestSymptom, riskHistory, doctorFeedback, latestRecord] = await Promise.all([
      RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 }),
      SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 }),
      RiskPrediction.find({ patientId }).sort({ createdAt: 1 }).select("probabilityPercent probability riskCategory predictionHorizonDays createdAt"),
      DoctorFeedback.findOne({ patientId }).sort({ createdAt: -1 }),
      HealthRecord.findOne({ patientId }).sort({ reportDate: -1 }),
    ]);

    const patientContext = {
      latestRisk,
      latestSymptom,
      riskHistory,
      doctorFeedback,
      latestRecord,
    };

    if (!latest) {
      return res.json({
        notFound: true,
        patientContext,
      });
    }

    const docObj = latest.toObject();
    docObj.patientContext = patientContext;
    return res.json(docObj);
  } catch (err) {
    console.error("getLatestTreatment error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/treatment/history
const getTreatmentHistory = async (req, res) => {
  try {
    const history = await TreatmentRecommendation.find({ patientId: req.user.patientId })
      .select("source urgencyLevel createdAt")
      .sort({ createdAt: -1 });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// POST /api/treatment/generate
const generateTreatment = async (req, res) => {
  try {
    const { patientId } = req.user;
    const latestRisk = await RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 });
    const latestM2 = await SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 });

    if (!latestRisk && !latestM2) {
      return res.status(400).json({ message: "No health records or symptom analysis available yet. Please upload records or check symptoms first." });
    }

    const treatment = await module3Service.getRecommendations(
      latestRisk?.fullReport || (latestRisk ? latestRisk.toObject() : null),
      latestM2?.fullOutput || (latestM2 ? latestM2.toObject() : null)
    );

    const doc = await TreatmentRecommendation.create({
      patientId,
      source: { module1: !!latestRisk, module2: !!latestM2 },
      riskPredictionId: latestRisk?._id,
      symptomAnalysisId: latestM2?._id,
      urgencyLevel: treatment.urgency?.level || "ROUTINE_FOLLOW_UP",
      recommendations: treatment.recommendations || [],
      drugLookups: treatment.drug_lookups || {},
      fullReport: treatment,
    });

    const [riskHistory, doctorFeedback, latestRecord] = await Promise.all([
      RiskPrediction.find({ patientId }).sort({ createdAt: 1 }).select("probabilityPercent probability riskCategory predictionHorizonDays createdAt"),
      DoctorFeedback.findOne({ patientId }).sort({ createdAt: -1 }),
      HealthRecord.findOne({ patientId }).sort({ reportDate: -1 }),
    ]);

    const docObj = doc.toObject();
    docObj.patientContext = {
      latestRisk,
      latestSymptom: latestM2,
      riskHistory,
      doctorFeedback,
      latestRecord,
    };

    return res.status(201).json(docObj);
  } catch (err) {
    console.error("generateTreatment error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate recommendations." });
  }
};

module.exports = { getLatestTreatment, getTreatmentHistory, generateTreatment };

