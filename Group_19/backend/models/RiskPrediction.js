const mongoose = require("mongoose");

const riskPredictionSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    healthRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthRecord" },
    probability: { type: Number },
    probabilityPercent: { type: Number },
    riskCategory: { type: String }, // LOW / MODERATE / HIGH / VERY_HIGH
    predictionHorizonDays: { type: Number, default: 90 },
    dataConfidence: { type: mongoose.Schema.Types.Mixed },
    historySummary: { type: mongoose.Schema.Types.Mixed },
    trends: { type: mongoose.Schema.Types.Mixed },        // observation_progression array
    importantFactors: { type: mongoose.Schema.Types.Mixed }, // top SHAP features
    fullReport: { type: mongoose.Schema.Types.Mixed },    // complete Module 1 output
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiskPrediction", riskPredictionSchema);
