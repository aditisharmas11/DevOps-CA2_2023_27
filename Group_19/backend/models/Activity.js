const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    // e.g. RISK_ANALYSIS | SYMPTOM_ANALYSIS | TREATMENT_GENERATED | RECORD_UPLOAD
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    // Optional link to the source document
    refId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
