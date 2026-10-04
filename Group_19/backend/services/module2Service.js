/**
 * Module 2 Service — runs run_inference.py directly via child_process.
 * Robustly parses the output JSON even if model loading logs precede it.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const PYTHON      = process.env.PYTHON_EXEC || "py";
const MODULE2_DIR  = path.resolve(__dirname, "../../Module_2");
const SCRIPT       = path.join(MODULE2_DIR, "run_inference.py");

function extractJson(stdout) {
  if (!stdout) throw new Error("No stdout output from Module 2");
  const lines = stdout.trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        return JSON.parse(line);
      } catch {}
    }
  }
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(stdout.slice(start, end + 1));
  }
  throw new Error(`No JSON found in Module 2 output: ${stdout.slice(-1000)}`);
}

const predictDisease = (symptoms = [], age = 30, sex = "unknown", text = "", topk = 5) => {
  return new Promise((resolve, reject) => {
    const args = [SCRIPT];

    if (text && text.trim()) {
      args.push("--text", text.trim());
    } else if (symptoms.length > 0) {
      args.push("--symptoms", ...symptoms);
    } else {
      return reject(new Error("No symptoms or text provided"));
    }

    args.push("--age",  String(age || 30));
    args.push("--sex",  sex || "unknown");
    args.push("--topk", String(topk || 5));

    const result = spawnSync(
      PYTHON,
      args,
      {
        cwd:      MODULE2_DIR,
        encoding: "utf-8",
        timeout:  120_000,
        env:      { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      }
    );

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    try {
      const parsed = extractJson(stdout);
      if (parsed.status === "error" || parsed.error) {
        return reject(new Error(parsed.error || "Module 2 prediction error"));
      }
      return resolve(parsed);
    } catch (e) {
      if (result.status !== 0) {
        return reject(new Error(`Module 2 exited with code ${result.status}: ${stderr.slice(-1000) || stdout.slice(-1000)}`));
      }
      return reject(new Error(`Failed to parse Module 2 output: ${e.message}\nOutput: ${stdout.slice(-1000)}`));
    }
  });
};

module.exports = { predictDisease };
