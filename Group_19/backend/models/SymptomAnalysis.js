const mongoose = require("mongoose");

const symptomAnalysisSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    // Raw free-text input from the user (e.g. "fever, headache for 3 days")
    inputText: { type: String, default: "" },
    // Structured symptom list passed to Module 2
    symptoms: [{ type: String }],
    // Patient demographic context sent to Module 2
    age: { type: Number },
    sex: { type: String },
    // Module 2 predictions
    predictions: [
      {
        disease: { type: String },
        probability: { type: Number },
        confidence: { type: String }, // HIGH / MEDIUM / LOW
      },
    ],
    // Full Module 2 raw output stored for Module 3
    fullOutput: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SymptomAnalysis", symptomAnalysisSchema);
