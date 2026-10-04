const mongoose = require("mongoose");

const observationItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  canonicalName: { type: String },
  label: { type: String },
  value: { type: Number, required: true },
  unit: { type: String },
  date: { type: Date, default: Date.now },
  confidence: { type: Number, default: 1.0 },
  plausible: { type: Boolean, default: true },
  plausibilityNote: { type: String },
  source: { type: String, default: "MANUAL" }
}, { _id: false });

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    fileName: { type: String, default: "clinical_record" },
    source: { 
      type: String, 
      enum: ["MANUAL_ENTRY", "PDF_EXTRACTION", "LEGACY_IMPORT"], 
      default: "MANUAL_ENTRY" 
    },
    reportDate: { type: Date, default: Date.now },
    observations: [observationItemSchema],
    rawData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HealthRecord", healthRecordSchema);
