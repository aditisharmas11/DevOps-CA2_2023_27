const SymptomAnalysis = require("../models/SymptomAnalysis");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const RiskPrediction = require("../models/RiskPrediction");
const Activity = require("../models/Activity");
const module2Service = require("../services/module2Service");
const module3Service = require("../services/module3Service");

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/disease/predict
// Body: { inputText, symptoms, age, sex }
// ──────────────────────────────────────────────────────────────────────────────
const predictDisease = async (req, res) => {
  try {
    const { patientId } = req.user;
    const { inputText = "", symptoms = [], age, sex } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ message: "At least one symptom is required." });
    }

    // 1. Call Module 2
    const m2Result = await module2Service.predictDisease(symptoms, age, sex, inputText);

    // 2. Save to DB — including both the free-text input AND the structured list
    const doc = await SymptomAnalysis.create({
      patientId,
      inputText,
      symptoms,
      age,
      sex,
      predictions: m2Result.predictions || [],
      fullOutput: m2Result,
    });

    // 3. Auto-run Module 3 combining with latest Module 1 result
    let treatment = null;
    try {
      const latestRisk = await RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 });
      treatment = await module3Service.getRecommendations(
        latestRisk?.fullReport || (latestRisk ? latestRisk.toObject() : null),
        m2Result
      );
      await TreatmentRecommendation.create({
        patientId,
        source: { module1: !!latestRisk, module2: true },
        symptomAnalysisId: doc._id,
        riskPredictionId: latestRisk?._id,
        urgencyLevel: treatment.urgency?.level || "ROUTINE_FOLLOW_UP",
        recommendations: treatment.recommendations || [],
        drugLookups: treatment.drug_lookups || {},
        fullReport: treatment,
      });
    } catch (m3err) {
      console.warn("Module 3 auto-run skipped:", m3err.message);
    }

    // 4. Log activity
    const topDisease = m2Result.predictions?.[0];
    await Activity.create({
      patientId,
      type: "SYMPTOM_ANALYSIS",
      title: "Symptom analysis completed",
      description: topDisease
        ? `Top result: ${topDisease.disease} (${(topDisease.probability * 100).toFixed(1)}%)`
        : `${symptoms.length} symptom(s) analysed.`,
      refId: doc._id,
    });

    return res.status(201).json({
      message: "Disease prediction complete.",
      analysisId: doc._id,
      predictions: m2Result.predictions,
      treatment: treatment,
      fullOutput: m2Result,
    });
  } catch (err) {
    console.error("predictDisease error:", err);
    return res.status(500).json({ message: "Server error during disease prediction." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/disease/history
// ──────────────────────────────────────────────────────────────────────────────
const getDiseaseHistory = async (req, res) => {
  try {
    const history = await SymptomAnalysis.find({ patientId: req.user.patientId })
      .select("inputText symptoms predictions createdAt")
      .sort({ createdAt: -1 });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/disease/latest
// ──────────────────────────────────────────────────────────────────────────────
const getLatestAnalysis = async (req, res) => {
  try {
    const latest = await SymptomAnalysis.findOne({ patientId: req.user.patientId })
      .sort({ createdAt: -1 });
    return res.json(latest);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = { predictDisease, getDiseaseHistory, getLatestAnalysis };
