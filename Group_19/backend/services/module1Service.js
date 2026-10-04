/**
 * Module 1 Service — runs predict_risk.py directly via child_process.
 * No FastAPI server required.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs   = require("fs");
const os   = require("os");

const PYTHON      = process.env.PYTHON_EXEC || "py";
const MODULE1_DIR  = path.resolve(__dirname, "../../Module_1");
const SCRIPT       = path.join(MODULE1_DIR, "predict_risk.py");

const predictRisk = (healthRecordJson) => {
  return new Promise((resolve, reject) => {
    // 1. Write health record to a temp file
    const patientId = healthRecordJson.patient_id || healthRecordJson.patientId || `patient_${Date.now()}`;
    const tmp = path.join(os.tmpdir(), `mt_m1_${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(healthRecordJson), "utf-8");

    // 2. Run the Module 1 prediction script
    const result = spawnSync(
      PYTHON,
      [SCRIPT, tmp],
      {
        cwd:      MODULE1_DIR,
        encoding: "utf-8",
        timeout:  120_000,
        env:      { ...process.env, PYTHONIOENCODING: "utf-8" },
      }
    );

    // 3. Clean up temp file
    try { fs.unlinkSync(tmp); } catch {}

    if (result.status !== 0 && (!result.stdout || !result.stdout.includes("prediction_report.json"))) {
      const err = result.stderr?.slice(-2000) || result.stdout?.slice(-2000) || "Unknown error";
      return reject(new Error(`Module 1 failed (exit ${result.status}): ${err}`));
    }

    // 4. Find the generated report from stdout or standard output folder
    let reportPath = null;
    const match = result.stdout?.match(/Saved:\s*(.*?prediction_report\.json)/i);
    if (match && match[1]) {
      const foundPath = match[1].trim();
      reportPath = path.isAbsolute(foundPath) ? foundPath : path.join(MODULE1_DIR, foundPath);
    } else {
      // Fallback path checks
      const candidatePaths = [
        path.join(MODULE1_DIR, "outputs", String(patientId), "prediction_report.json"),
        path.join(MODULE1_DIR, "outputs", path.basename(tmp, ".json"), "prediction_report.json"),
      ];
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          reportPath = cp;
          break;
        }
      }
    }

    if (!reportPath || !fs.existsSync(reportPath)) {
      return reject(new Error(`Module 1 completed but prediction_report.json was not found. Output: ${result.stdout?.slice(-1000)}`));
    }

    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      resolve(report);
    } catch (e) {
      reject(new Error(`Failed to parse Module 1 report: ${e.message}`));
    }
  });
};

module.exports = { predictRisk };
