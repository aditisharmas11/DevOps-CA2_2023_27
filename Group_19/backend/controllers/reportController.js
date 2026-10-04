const User = require("../models/User");
const RiskPrediction = require("../models/RiskPrediction");
const SymptomAnalysis = require("../models/SymptomAnalysis");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");

// GET /api/reports/full
const getFullReport = async (req, res) => {
  try {
    const { patientId } = req.user;
    const user = await User.findOne({ patientId }).select("-password");

    const [latestRisk, latestDisease, latestTreatment] = await Promise.all([
      RiskPrediction.findOne({ patientId }).sort({ createdAt: -1 }),
      SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 }),
      TreatmentRecommendation.findOne({ patientId }).sort({ createdAt: -1 }),
    ]);

    const generatedAt = new Date().toISOString();

    const report = {
      reportId: `REP-${patientId}-${Date.now().toString(36).toUpperCase()}`,
      generatedAt,
      patient: {
        id: patientId,
        name: user?.name || "Patient",
        email: user?.email || "",
        age: user?.age || latestDisease?.age || 30,
        sex: user?.sex || latestDisease?.sex || "unknown",
      },
      summary: {
        riskCategory: latestRisk?.riskCategory || "NOT_EVALUATED",
        acuteProbabilityPercent: latestRisk?.probabilityPercent || 0,
        predictionHorizonDays: latestRisk?.predictionHorizonDays || 90,
        dataConfidence: latestRisk?.dataConfidence?.category || "MODERATE",
        topPredictedDisease: latestDisease?.predictions?.[0]?.disease || latestDisease?.predictions?.[0]?.condition || null,
        topDiseaseProbability: latestDisease?.predictions?.[0]?.probability_percent || (latestDisease?.predictions?.[0]?.probability ? latestDisease.predictions[0].probability * 100 : null),
        urgencyLevel: latestTreatment?.urgencyLevel || "ROUTINE_FOLLOW_UP",
        activeRecommendationsCount: Array.isArray(latestTreatment?.recommendations) ? latestTreatment.recommendations.length : 0,
      },
      module1: latestRisk ? {
        id: latestRisk._id,
        probability: latestRisk.probability,
        probabilityPercent: latestRisk.probabilityPercent,
        riskCategory: latestRisk.riskCategory,
        predictionHorizonDays: latestRisk.predictionHorizonDays,
        dataConfidence: latestRisk.dataConfidence,
        historySummary: latestRisk.historySummary,
        trends: latestRisk.trends || [],
        importantFactors: latestRisk.importantFactors || [],
        createdAt: latestRisk.createdAt,
      } : null,
      module2: latestDisease ? {
        id: latestDisease._id,
        inputText: latestDisease.inputText,
        symptoms: latestDisease.symptoms || [],
        age: latestDisease.age,
        sex: latestDisease.sex,
        predictions: latestDisease.predictions || [],
        createdAt: latestDisease.createdAt,
      } : null,
      module3: latestTreatment ? {
        id: latestTreatment._id,
        source: latestTreatment.source,
        urgencyLevel: latestTreatment.urgencyLevel,
        recommendations: latestTreatment.recommendations || [],
        drugLookups: latestTreatment.drugLookups || {},
        createdAt: latestTreatment.createdAt,
      } : null,
    };

    return res.json(report);
  } catch (err) {
    console.error("getFullReport error:", err);
    return res.status(500).json({ message: "Failed to compile comprehensive clinical report." });
  }
};

// GET /api/reports/history
const getReportHistory = async (req, res) => {
  try {
    const { patientId } = req.user;

    const [risks, diseases, treatments] = await Promise.all([
      RiskPrediction.find({ patientId }).sort({ createdAt: -1 }).limit(10),
      SymptomAnalysis.find({ patientId }).sort({ createdAt: -1 }).limit(10),
      TreatmentRecommendation.find({ patientId }).sort({ createdAt: -1 }).limit(10),
    ]);

    const history = [];

    risks.forEach(r => {
      history.push({
        id: r._id,
        type: "FUTURE_RISK",
        title: "Future Health Risk Assessment (Module 1)",
        date: r.createdAt,
        riskCategory: r.riskCategory,
        probabilityPercent: r.probabilityPercent,
        summary: `90-day acute risk estimated at ${(r.probabilityPercent || 0).toFixed(1)}% (${r.riskCategory})`,
      });
    });

    diseases.forEach(d => {
      const top = d.predictions?.[0];
      history.push({
        id: d._id,
        type: "SYMPTOM_ANALYSIS",
        title: "Differential Disease Analysis (Module 2)",
        date: d.createdAt,
        symptomsCount: d.symptoms?.length || 0,
        topDisease: top?.disease || top?.condition || "Clinical condition",
        probabilityPercent: top?.probability_percent || (top?.probability ? top.probability * 100 : 0),
        summary: top ? `Top diagnosis: ${top.disease || top.condition} (${(top.probability_percent || top.probability * 100 || 0).toFixed(0)}%)` : "Symptom check completed",
      });
    });

    treatments.forEach(t => {
      const count = Array.isArray(t.recommendations) ? t.recommendations.length : 0;
      history.push({
        id: t._id,
        type: "TREATMENT_PLAN",
        title: "Personalized Treatment Recommendation (Module 3)",
        date: t.createdAt,
        urgencyLevel: t.urgencyLevel,
        recommendationsCount: count,
        summary: `${count} clinical protocols generated (${t.urgencyLevel || "ROUTINE_FOLLOW_UP"})`,
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json(history);
  } catch (err) {
    console.error("getReportHistory error:", err);
    return res.status(500).json({ message: "Failed to fetch report history." });
  }
};

module.exports = { getFullReport, getReportHistory };
