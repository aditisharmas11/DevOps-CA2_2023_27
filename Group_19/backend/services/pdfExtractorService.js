/**
 * PDF Extractor Service — orchestrates Module 1 extract_pdf_report.py
 * Extracts raw text, OCR fallback, medical observations, and plausibility checks.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PYTHON = process.env.PYTHON_EXEC || "py";
const MODULE1_DIR = path.resolve(__dirname, "../../Module_1");
const EXTRACT_SCRIPT = path.join(MODULE1_DIR, "extract_pdf_report.py");

const extractPdfReport = (pdfFilePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pdfFilePath)) {
      return reject(new Error(`PDF file not found at: ${pdfFilePath}`));
    }

    const result = spawnSync(
      PYTHON,
      [EXTRACT_SCRIPT, pdfFilePath],
      {
        cwd: MODULE1_DIR,
        encoding: "utf-8",
        timeout: 60_000,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      }
    );

    if (result.status !== 0) {
      const err = result.stderr?.slice(-1500) || result.stdout?.slice(-1500) || "Unknown error";
      return reject(new Error(`PDF Extraction failed (exit ${result.status}): ${err}`));
    }

    try {
      // Find JSON block in stdout
      const stdout = result.stdout.trim();
      const firstBrace = stdout.indexOf("{");
      const lastBrace = stdout.lastIndexOf("}");
      
      if (firstBrace === -1 || lastBrace === -1) {
        return reject(new Error(`No valid JSON output received from PDF extractor. Output: ${stdout.slice(0, 500)}`));
      }

      const jsonStr = stdout.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonStr);

      if (!data.success && data.error) {
        return reject(new Error(data.error));
      }

      resolve(data);
    } catch (e) {
      reject(new Error(`Failed to parse PDF extractor output: ${e.message}`));
    }
  });
};

module.exports = { extractPdfReport };
