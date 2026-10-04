const RiskPrediction = require("../models/RiskPrediction");
const SymptomAnalysis = require("../models/SymptomAnalysis");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const Activity = require("../models/Activity");
const DoctorFeedback = require("../models/DoctorFeedback");

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const { patientId } = req.user;

    const [latestRisk, latestDisease, latestTreatment, recentActivities, riskHistory, doctorFeedbacks] =
      await Promise.all([
        RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 }),
        SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 }),
        TreatmentRecommendation.findOne({ patientId }).sort({ createdAt: -1 }),
        Activity.find({ patientId }).sort({ createdAt: -1 }).limit(10),
        RiskPrediction.find({ patientId })
          .sort({ createdAt: 1 })
          .select("probability probabilityPercent riskCategory predictionHorizonDays dataConfidence historySummary createdAt"),
        DoctorFeedback.find({ patientId }).sort({ createdAt: -1 }).limit(5),
      ]);

    // Build a simple combined health intelligence signal
    let combinedInsight = null;
    if (latestRisk && latestDisease) {
      const riskHigh = ["HIGH", "VERY_HIGH"].includes(latestRisk.riskCategory);
      const topDisease = latestDisease.predictions?.[0];
      const diseaseHighConf = topDisease?.probability > 0.6;
      if (riskHigh && diseaseHighConf) {
        combinedInsight = {
          status: "ATTENTION_RECOMMENDED",
          signals: [
            `Future health risk is ${latestRisk.riskCategory.toLowerCase()}.`,
            topDisease
              ? `Symptom analysis suggests ${topDisease.disease} (${(topDisease.probability * 100).toFixed(0)}% confidence).`
              : null,
            latestTreatment
              ? "Personalised treatment guidance is available."
              : null,
          ].filter(Boolean),
        };
      }
    }

    return res.json({
      latestRisk,
      latestDisease,
      latestTreatment,
      recentActivities,
      riskHistory,
      combinedInsight,
      doctorFeedbacks: doctorFeedbacks || [],
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = { getDashboard };
