const mongoose = require("mongoose");

const treatmentRecommendationSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    // Which modules contributed to this recommendation
    source: {
      module1: { type: Boolean, default: false },
      module2: { type: Boolean, default: false },
    },
    // References to source documents
    riskPredictionId: { type: mongoose.Schema.Types.ObjectId, ref: "RiskPrediction" },
    symptomAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: "SymptomAnalysis" },
    // Module 3 output
    urgencyLevel: { type: String },
    recommendations: { type: mongoose.Schema.Types.Mixed },
    drugLookups: { type: mongoose.Schema.Types.Mixed },
    fullReport: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TreatmentRecommendation", treatmentRecommendationSchema);
