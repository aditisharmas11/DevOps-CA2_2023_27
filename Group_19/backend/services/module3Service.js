/**
 * Module 3 Service — runs run_recommend.py directly via child_process.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs   = require("fs");
const os   = require("os");

const PYTHON      = process.env.PYTHON_EXEC || "py";
const MODULE3_DIR  = path.resolve(__dirname, "../../Module_3");
const SCRIPT       = path.join(MODULE3_DIR, "run_recommend.py");

function extractJson(stdout) {
  if (!stdout) throw new Error("No stdout output from Module 3");
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
  throw new Error(`No JSON found in Module 3 output: ${stdout.slice(-1000)}`);
}

const getRecommendations = (module1Output, module2Output) => {
  return new Promise((resolve, reject) => {
    const args = [SCRIPT];
    const tmpFiles = [];

    if (module1Output) {
      const p = path.join(os.tmpdir(), `mt_m1_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
      fs.writeFileSync(p, JSON.stringify(module1Output), "utf-8");
      tmpFiles.push(p);
      args.push("--m1", p);
    }
    if (module2Output) {
      const p = path.join(os.tmpdir(), `mt_m2_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
      fs.writeFileSync(p, JSON.stringify(module2Output), "utf-8");
      tmpFiles.push(p);
      args.push("--m2", p);
    }

    if (!module1Output && !module2Output) {
      return reject(new Error("At least one of module1Output or module2Output must be provided"));
    }

    const result = spawnSync(
      PYTHON,
      args,
      {
        cwd:      MODULE3_DIR,
        encoding: "utf-8",
        timeout:  60_000,
        env:      { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      }
    );

    // Cleanup temp files
    tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    try {
      const parsed = extractJson(stdout);
      if (parsed.status === "error" || parsed.error) {
        return reject(new Error(parsed.error || "Module 3 recommendation error"));
      }
      return resolve(parsed);
    } catch (e) {
      if (result.status !== 0) {
        return reject(new Error(`Module 3 failed with code ${result.status}: ${stderr.slice(-1000) || stdout.slice(-1000)}`));
      }
      return reject(new Error(`Failed to parse Module 3 output: ${e.message}\nOutput: ${stdout.slice(-1000)}`));
    }
  });
};

module.exports = { getRecommendations };
