// backend/services/pythonClient.js
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_DIR =
  process.env.PYTHON_DIR ||
  "C:\\Users\\ASUS\\Desktop\\PFE";
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const PYTHON_SCRIPT = path.join(PYTHON_DIR, "main.py");

// 2 hours by default
const NODE_SIDE_TIMEOUT_MS = parseInt(
  process.env.NODE_SIDE_TIMEOUT_MS || "7200000",
  10
);

export function analyzeDocumentWithPython({
  documentPath,
  documentName,
  standards,
}) {
  return new Promise((resolve, reject) => {
    const payloadPath = path.join(
      os.tmpdir(),
      `compliance_payload_${Date.now()}.json`
    );
    const checkpointPath = payloadPath + ".checkpoint.json";

    fs.writeFileSync(
      payloadPath,
      JSON.stringify({ document_name: documentName, standards }),
      "utf-8"
    );

    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      OLLAMA_BATCH_SIZE: process.env.OLLAMA_BATCH_SIZE || "3",
      OLLAMA_TIMEOUT: process.env.OLLAMA_TIMEOUT || "300",
      MAX_DOC_CHARS: process.env.MAX_DOC_CHARS || "2500",
      MAX_POLICIES: process.env.MAX_POLICIES || "5",
      USE_RAG: process.env.USE_RAG || "1",
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || "mistral:7b",
      MODE: process.env.MODE || "per_policy",
    };

    console.log(
      `[pythonClient] timeout=${NODE_SIDE_TIMEOUT_MS / 60000} min, ` +
      `batch=${env.OLLAMA_BATCH_SIZE}, max_policies=${env.MAX_POLICIES}, RAG=${env.USE_RAG}`
    );

    const proc = spawn(PYTHON_BIN, [PYTHON_SCRIPT, documentPath, payloadPath], {
      cwd: PYTHON_DIR,
      env,
    });

    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;

    const killTimer = setTimeout(() => {
      killedByTimeout = true;
      console.log(
        `[pythonClient] ⏱️  Killing python after ${NODE_SIDE_TIMEOUT_MS / 60000} min — will look for checkpoint`
      );
      try { proc.kill("SIGKILL"); } catch {}
    }, NODE_SIDE_TIMEOUT_MS);

    proc.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    proc.stderr.on("data", (d) => {
      const s = d.toString("utf-8");
      stderr += s;
      process.stdout.write(s.startsWith("[PY]") ? s : `[PY] ${s}`);
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      cleanup(payloadPath, checkpointPath);
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(killTimer);

      // 1) Try regular stdout JSON (full success)
      const jsonText = extractLastJson(stdout);
      if (jsonText) {
        try {
          const parsed = JSON.parse(jsonText);
          cleanup(payloadPath, checkpointPath);
          return resolve(parsed);
        } catch (e) {
          console.log("[pythonClient] stdout JSON parse failed, trying checkpoint:", e.message);
        }
      }

      // 2) Try the checkpoint — works even if Python was killed mid-run
      if (fs.existsSync(checkpointPath)) {
        try {
          const ck = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
          console.log(
            `[pythonClient] 💾 Recovered from checkpoint: ` +
            `${ck?.policies?.length || 0} policies, ${Object.keys(ck?.results || {}).length} items`
          );
          if (killedByTimeout) {
            ck.error = `Analysis cut at ${NODE_SIDE_TIMEOUT_MS / 60000} min (Node timeout). ` +
                       `Recovered ${ck?.policies?.length || 0} policy/policies from checkpoint.`;
          } else if (!ck.error && !ck.info) {
            ck.info = "Recovered partial result from checkpoint.";
          }
          cleanup(payloadPath, checkpointPath);
          return resolve(ck);
        } catch (e) {
          console.log("[pythonClient] checkpoint parse failed:", e.message);
        }
      }

      // 3) Total failure
      cleanup(payloadPath, checkpointPath);
      if (killedByTimeout) {
        return reject(new Error(
          `Python killed after ${NODE_SIDE_TIMEOUT_MS} ms (node-side timeout) and no checkpoint found`
        ));
      }
      return reject(new Error(
        `Python (exit ${code}) did not emit JSON.\n` +
        `stdout tail:\n${stdout.slice(-1500)}\n` +
        `stderr tail:\n${stderr.slice(-1500)}`
      ));
    });
  });
}

function cleanup(payloadPath, checkpointPath) {
  try { fs.unlinkSync(payloadPath); } catch {}
  try { fs.unlinkSync(checkpointPath); } catch {}
}

function extractLastJson(text) {
  if (!text) return null;
  text = text.trim();
  try { JSON.parse(text); return text; } catch {}
  const closes = [];
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) closes.push(i); }
  }
  for (let k = closes.length - 1; k >= 0; k--) {
    const close = closes[k];
    let d = 0, s = false, e = false;
    for (let i = close; i >= 0; i--) {
      const ch = text[i];
      if (e) { e = false; continue; }
      if (ch === "\\") { e = true; continue; }
      if (ch === '"') { s = !s; continue; }
      if (s) continue;
      if (ch === "}") d++;
      else if (ch === "{") {
        d--;
        if (d === 0) {
          const cand = text.slice(i, close + 1);
          try { JSON.parse(cand); return cand; } catch { break; }
        }
      }
    }
  }
  return null;
}