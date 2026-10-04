const fs = require("fs");
const path = require("path");
const HealthRecord = require("../models/HealthRecord");
const RiskPrediction = require("../models/RiskPrediction");
const TreatmentRecommendation = require("../models/TreatmentRecommendation");
const Activity = require("../models/Activity");
const module1Service = require("../services/module1Service");
const module3Service = require("../services/module3Service");
const pdfExtractorService = require("../services/pdfExtractorService");

// ──────────────────────────────────────────────────────────────────────────────
// Helper: Build Longitudinal Observation History for Module 1
// ──────────────────────────────────────────────────────────────────────────────
async function buildPatientModule1Payload(patientId, currentObservations = [], explicitRefDate = null) {
  // 1. Fetch all previous records for this patient
  const previousRecords = await HealthRecord.find({ patientId }).sort({ reportDate: 1, createdAt: 1 });

  const allObservations = [];

  // Add past observations
  for (const rec of previousRecords) {
    if (Array.isArray(rec.observations) && rec.observations.length > 0) {
      for (const obs of rec.observations) {
        if (obs.value !== undefined && obs.value !== null && !isNaN(Number(obs.value))) {
          allObservations.push({
            name: obs.canonicalName || obs.name,
            value: Number(obs.value),
            date: obs.date ? new Date(obs.date).toISOString() : (rec.reportDate ? new Date(rec.reportDate).toISOString() : new Date().toISOString()),
            unit: obs.unit || "",
          });
        }
      }
    } else if (rec.rawData && Array.isArray(rec.rawData.observations)) {
      for (const obs of rec.rawData.observations) {
        if (obs.value !== undefined && obs.value !== null && !isNaN(Number(obs.value))) {
          allObservations.push({
            name: obs.name,
            value: Number(obs.value),
            date: obs.date || (rec.reportDate ? new Date(rec.reportDate).toISOString() : new Date().toISOString()),
            unit: obs.unit || "",
          });
        }
      }
    }
  }

  // Add current newly submitted observations
  for (const obs of currentObservations) {
    if (obs.value !== undefined && obs.value !== null && !isNaN(Number(obs.value))) {
      allObservations.push({
        name: obs.canonicalName || obs.name,
        value: Number(obs.value),
        date: obs.date ? new Date(obs.date).toISOString() : (explicitRefDate || new Date().toISOString()),
        unit: obs.unit || "",
      });
    }
  }

  // Determine latest reference date
  let latestDate = explicitRefDate ? new Date(explicitRefDate).toISOString() : new Date().toISOString();
  if (allObservations.length > 0) {
    const dates = allObservations.map(o => new Date(o.date).getTime()).filter(t => !isNaN(t));
    if (dates.length > 0) {
      latestDate = new Date(Math.max(...dates)).toISOString();
    }
  }

  return {
    patient_id: String(patientId),
    reference_date: latestDate,
    observations: allObservations,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: Run Module 1 & Module 3 Cascades & Save Records
// ──────────────────────────────────────────────────────────────────────────────
async function executeRiskAndCdssPipeline(patientId, healthRecordDoc, payload) {
  let prediction = null;
  let riskDoc = null;

  try {
    prediction = await module1Service.predictRisk(payload);
    riskDoc = await RiskPrediction.create({
      patientId,
      healthRecordId: healthRecordDoc._id,
      probability: prediction.prediction?.acute_event_probability,
      probabilityPercent: prediction.prediction?.acute_event_probability_percent,
      riskCategory: prediction.prediction?.risk_category,
      predictionHorizonDays: prediction.prediction_horizon_days || 90,
      dataConfidence: prediction.data_confidence,
      historySummary: prediction.history_summary,
      trends: prediction.observation_progression,
      importantFactors: [
        ...(prediction.top_risk_increasing_factors || []),
        ...(prediction.top_risk_reducing_factors || [])
      ],
      fullReport: prediction,
    });

    // Auto-cascade Module 3 combining with latest Module 2 output if available
    try {
      const SymptomAnalysis = require("../models/SymptomAnalysis");
      const latestM2 = await SymptomAnalysis.findOne({ patientId }).sort({ createdAt: -1 });
      const treatment = await module3Service.getRecommendations(
        prediction,
        latestM2?.fullOutput || (latestM2 ? latestM2.toObject() : null)
      );

      await TreatmentRecommendation.create({
        patientId,
        source: { module1: true, module2: !!latestM2 },
        riskPredictionId: riskDoc._id,
        symptomAnalysisId: latestM2?._id,
        urgencyLevel: treatment.urgency?.level || "ROUTINE_FOLLOW_UP",
        recommendations: treatment.recommendations || [],
        drugLookups: treatment.drug_lookups || {},
        fullReport: treatment,
      });
    } catch (m3err) {
      console.warn("Module 3 CDSS cascade skipped:", m3err.message);
    }
  } catch (m1err) {
    console.warn("Module 1 execution failed:", m1err.message);
  }

  return { prediction, riskDoc };
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/health/upload-pdf
// Extracts observations from uploaded PDF and returns them for patient review
// ──────────────────────────────────────────────────────────────────────────────
const uploadPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No PDF file uploaded." });
  }

  const tempFilePath = req.file.path;
  try {
    const extractedResult = await pdfExtractorService.extractPdfReport(tempFilePath);

    // Clean up uploaded file from disk
    try { fs.unlinkSync(tempFilePath); } catch (_) {}

    return res.json({
      message: "PDF analyzed successfully.",
      ...extractedResult,
    });
  } catch (err) {
    try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (_) {}
    console.error("PDF upload error:", err);
    return res.status(500).json({
      message: err.message || "Failed to process and extract PDF lab report.",
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/health/manual-entry
// Direct entry of structured health / clinical / lab values
// ──────────────────────────────────────────────────────────────────────────────
const manualEntry = async (req, res) => {
  try {
    const { patientId } = req.user;
    const { observations, reportDate, title } = req.body;

    if (!Array.isArray(observations) || observations.length === 0) {
      return res.status(400).json({ message: "At least one clinical observation is required." });
    }

    const validObs = observations.map(o => ({
      name: o.name || o.canonicalName,
      canonicalName: o.canonicalName || o.name,
      label: o.label || o.name,
      value: Number(o.value),
      unit: o.unit || "",
      date: o.date ? new Date(o.date) : (reportDate ? new Date(reportDate) : new Date()),
      confidence: 1.0,
      plausible: o.plausible !== undefined ? o.plausible : true,
      plausibilityNote: o.plausibilityNote || "",
      source: "MANUAL"
    })).filter(o => !isNaN(o.value));

    if (validObs.length === 0) {
      return res.status(400).json({ message: "No valid numeric observations provided." });
    }

    const repDate = reportDate ? new Date(reportDate) : new Date();

    // 1. Save Health Record
    const saved = await HealthRecord.create({
      patientId,
      fileName: title || `Manual Entry (${validObs.length} biomarkers)`,
      source: "MANUAL_ENTRY",
      reportDate: repDate,
      observations: validObs,
      rawData: {
        patient_id: patientId,
        reference_date: repDate.toISOString(),
        observations: validObs
      }
    });

    // 2. Build complete longitudinal dataset & run Module 1
    const module1Payload = await buildPatientModule1Payload(patientId, validObs, repDate);
    const { riskDoc } = await executeRiskAndCdssPipeline(patientId, saved, module1Payload);

    // 3. Log activity
    await Activity.create({
      patientId,
      type: "RECORD_UPLOAD",
      title: "Clinical Data Logged",
      description: riskDoc
        ? `Manual health data analyzed — ${riskDoc.riskCategory} risk (${(riskDoc.probabilityPercent || 0).toFixed(1)}%)`
        : `Logged ${validObs.length} clinical observation(s).`,
      refId: saved._id,
    });

    return res.status(201).json({
      message: "Health data saved and analyzed successfully.",
      healthRecordId: saved._id,
      riskPrediction: riskDoc,
      record: saved,
    });
  } catch (err) {
    console.error("manualEntry error:", err);
    return res.status(500).json({ message: "Server error during manual health data submission." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/health/confirm-extracted
// Confirms verified & edited observations from PDF extraction
// ──────────────────────────────────────────────────────────────────────────────
const confirmExtracted = async (req, res) => {
  try {
    const { patientId } = req.user;
    const { observations, reportDate, fileName, rawTextLength, isScanned } = req.body;

    if (!Array.isArray(observations) || observations.length === 0) {
      return res.status(400).json({ message: "No verified observations to save." });
    }

    const validObs = observations.map(o => ({
      name: o.name || o.canonicalName,
      canonicalName: o.canonicalName || o.name,
      label: o.label || o.name,
      value: Number(o.value),
      unit: o.unit || "",
      date: o.date ? new Date(o.date) : (reportDate ? new Date(reportDate) : new Date()),
      confidence: Number(o.confidence) || 1.0,
      plausible: o.plausible !== undefined ? Boolean(o.plausible) : true,
      plausibilityNote: o.plausibilityNote || "",
      source: "PDF_EXTRACTION"
    })).filter(o => !isNaN(o.value));

    if (validObs.length === 0) {
      return res.status(400).json({ message: "No valid numeric observations to analyze." });
    }

    const repDate = reportDate ? new Date(reportDate) : new Date();

    // 1. Save Health Record
    const saved = await HealthRecord.create({
      patientId,
      fileName: fileName || "Lab_Report.pdf",
      source: "PDF_EXTRACTION",
      reportDate: repDate,
      observations: validObs,
      rawData: {
        patient_id: patientId,
        reference_date: repDate.toISOString(),
        is_scanned: isScanned,
        observations: validObs,
      }
    });

    // 2. Build complete longitudinal dataset & run Module 1
    const module1Payload = await buildPatientModule1Payload(patientId, validObs, repDate);
    const { riskDoc } = await executeRiskAndCdssPipeline(patientId, saved, module1Payload);

    // 3. Log activity
    await Activity.create({
      patientId,
      type: "RECORD_UPLOAD",
      title: "PDF Lab Report Verified",
      description: riskDoc
        ? `Report ${fileName || 'PDF'} processed — ${riskDoc.riskCategory} risk (${(riskDoc.probabilityPercent || 0).toFixed(1)}%)`
        : `Verified ${validObs.length} biomarker(s) from report.`,
      refId: saved._id,
    });

    return res.status(201).json({
      message: "Verified report data saved and analyzed successfully.",
      healthRecordId: saved._id,
      riskPrediction: riskDoc,
      record: saved,
    });
  } catch (err) {
    console.error("confirmExtracted error:", err);
    return res.status(500).json({ message: "Server error during PDF confirmation." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/health/upload (Backwards compatible endpoint)
// ──────────────────────────────────────────────────────────────────────────────
const uploadRecord = async (req, res) => {
  try {
    const { patientId } = req.user;
    const { fileName } = req.body;
    const healthRecord = req.body.healthRecord || req.body.recordData;

    if (!healthRecord) {
      return res.status(400).json({ message: "healthRecord data is required." });
    }

    const recordData = typeof healthRecord === "string"
      ? JSON.parse(healthRecord)
      : healthRecord;

    const rawObs = Array.isArray(recordData.observations) ? recordData.observations : [];
    const repDate = recordData.reference_date ? new Date(recordData.reference_date) : new Date();

    const formattedObs = rawObs.map(o => ({
      name: o.name,
      canonicalName: o.name,
      value: Number(o.value),
      unit: o.unit || "",
      date: o.date ? new Date(o.date) : repDate,
      confidence: 1.0,
      plausible: true,
      source: "IMPORT"
    })).filter(o => !isNaN(o.value));

    // 1. Save raw record
    const saved = await HealthRecord.create({
      patientId,
      fileName: fileName || "health_record.json",
      source: "LEGACY_IMPORT",
      reportDate: repDate,
      observations: formattedObs,
      rawData: recordData,
    });

    // 2. Build complete payload & run Module 1
    const module1Payload = await buildPatientModule1Payload(patientId, formattedObs, repDate);
    const { riskDoc } = await executeRiskAndCdssPipeline(patientId, saved, module1Payload);

    // 3. Log activity
    await Activity.create({
      patientId,
      type: "RECORD_UPLOAD",
      title: "Health record uploaded",
      description: riskDoc
        ? `Risk analysis complete — ${riskDoc.riskCategory} (${(riskDoc.probabilityPercent || 0).toFixed(1)}%)`
        : "Record saved; risk analysis unavailable.",
      refId: saved._id,
    });

    return res.status(201).json({
      message: "Record uploaded and analysed.",
      healthRecordId: saved._id,
      riskPrediction: riskDoc,
    });
  } catch (err) {
    console.error("uploadRecord error:", err);
    return res.status(500).json({ message: "Server error during upload." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/health/records
// ──────────────────────────────────────────────────────────────────────────────
const getRecords = async (req, res) => {
  try {
    const records = await HealthRecord.find({ patientId: req.user.patientId })
      .select("-rawData")
      .sort({ createdAt: -1 });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/health/risk-history
// ──────────────────────────────────────────────────────────────────────────────
const getRiskHistory = async (req, res) => {
  try {
    const history = await RiskPrediction.find({ patientId: req.user.patientId })
      .select("probability probabilityPercent riskCategory createdAt dataConfidence historySummary")
      .sort({ createdAt: 1 });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/health/risk-latest
// ──────────────────────────────────────────────────────────────────────────────
const getLatestRisk = async (req, res) => {
  try {
    const latest = await RiskPrediction.findOne({ patientId: req.user.patientId })
      .sort({ createdAt: -1 });
    return res.json(latest);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  uploadPdf,
  manualEntry,
  confirmExtracted,
  uploadRecord,
  getRecords,
  getRiskHistory,
  getLatestRisk,
};
