// backend/services/pythonClient.js
// =====================================================================
//  Profile: PARTIAL-OFFLOAD GPU (e.g. ollama ps shows "29%/71% CPU/GPU")
//  Goal: ~25-35 min for 10 policies × 30 controls, 0 items lost.
//
//  Key strategy:
//   • AGGRESSIVE filter — only ~8 controls assessed per policy
//     (the rest are auto-marked "Not relevant to this policy"
//      WITHOUT any LLM call, so they cost nothing in time)
//   • SMALL stable batch (3) — fits comfortably in partial-offload VRAM
//   • SINGLE retry pass at batch=1 (no intermediate batch=2 step)
// =====================================================================
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PYTHON_DIR    = process.env.PYTHON_DIR    || "C:\\Users\\stagiaire\\Desktop\\Ollama\\Ollama";
const PYTHON_BIN    = process.env.PYTHON_BIN    || "python";
const PYTHON_SCRIPT = path.join(PYTHON_DIR, "main.py");

const NODE_SIDE_TIMEOUT_MS = parseInt(
  process.env.NODE_SIDE_TIMEOUT_MS || "604800000",  // 7j
  10
);

export function analyzeDocumentWithPython({
  documentPath,
  documentName,
  standards,
}) {
  return new Promise((resolve, reject) => {
    const payloadPath    = path.join(os.tmpdir(), `compliance_payload_${Date.now()}.json`);
    const checkpointPath = payloadPath + ".checkpoint.json";

    fs.writeFileSync(
      payloadPath,
      JSON.stringify({ document_name: documentName, standards }),
      "utf-8"
    );

    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",

      // ─── model ────────────────────────────────────────────────────
      OLLAMA_MODEL:       process.env.OLLAMA_MODEL       || "mistral:7b",

      // ─── coverage ─────────────────────────────────────────────────
      MAX_POLICIES:       process.env.MAX_POLICIES       || "10",

      // ─── batch sizing ─────────────────────────────────────────────
      OLLAMA_BATCH_SIZE:  process.env.OLLAMA_BATCH_SIZE  || "3",   // stable on partial offload
      OLLAMA_NUM_PREDICT: process.env.OLLAMA_NUM_PREDICT || "280", // enough for 3 JSON objects
      OLLAMA_NUM_CTX:     process.env.OLLAMA_NUM_CTX     || "2048",
      OLLAMA_TIMEOUT:        process.env.OLLAMA_TIMEOUT        || "3600",
      OLLAMA_WARMUP_TIMEOUT: process.env.OLLAMA_WARMUP_TIMEOUT || "1800",
      OLLAMA_PARALLEL:    process.env.OLLAMA_PARALLEL    || "1",
      // ✅ 12 = a good default for a 16-core/16-thread CPU (leaves 4 cores
      //    for the OS, browser, Node and ollama's own scheduler — pushing
      //    higher tends to OVER-subscribe on Windows and actually slows
      //    inference down). Override OLLAMA_NUM_THREAD in your env to
      //    match your physical core count if it isn't 16.
      OLLAMA_NUM_THREAD:  process.env.OLLAMA_NUM_THREAD  || "8",

      // ─── single retry pass at batch=1 (no intermediate batch=2) ──
      RETRY_BATCH_SIZES:  process.env.RETRY_BATCH_SIZES  || "3",

      // ─── document & policy text sizing ────────────────────────────
      MAX_DOC_CHARS:      process.env.MAX_DOC_CHARS      || "4000",
      MAX_POLICY_CHARS:   process.env.MAX_POLICY_CHARS   || "1000",

      // ─── AGGRESSIVE filter — biggest speed win on partial offload ─
      // With these settings, each policy gets ~6-10 relevant controls
      // analysed (instead of 30). The other 20-24 controls per policy
      // are auto-marked "Not relevant to this policy" with NO LLM call.
      // → 3-4× fewer LLM calls overall, same number of policies covered.
      FILTER_ITEMS_PER_POLICY: process.env.FILTER_ITEMS_PER_POLICY || "1",
      FILTER_MIN_OVERLAP:      process.env.FILTER_MIN_OVERLAP      || "2",
      MAX_ITEMS_PER_POLICY:    process.env.MAX_ITEMS_PER_POLICY    || "12",

      // ─── quality knobs ────────────────────────────────────────────
      // FAST_MODE=0 keeps RAG and full-quality risks/gaps/mitigation
      FAST_MODE:          process.env.FAST_MODE          || "0",
      USE_RAG:            process.env.USE_RAG            || "1",

      MODE:               process.env.MODE               || "per_policy",
    };

    console.log(
      `[pythonClient] timeout=${NODE_SIDE_TIMEOUT_MS / 60000} min, ` +
      `model=${env.OLLAMA_MODEL}, batch=${env.OLLAMA_BATCH_SIZE} (retry ${env.RETRY_BATCH_SIZES}), ` +
      `max_policies=${env.MAX_POLICIES}, filter=${env.FILTER_ITEMS_PER_POLICY} (max=${env.MAX_ITEMS_PER_POLICY}, overlap=${env.FILTER_MIN_OVERLAP}), ` +
      `RAG=${env.USE_RAG}, threads=${env.OLLAMA_NUM_THREAD}`
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
      console.log(`[pythonClient] ⏱️ Killing python after ${NODE_SIDE_TIMEOUT_MS / 60000} min — will look for checkpoint`);
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

      if (fs.existsSync(checkpointPath)) {
        try {
          const ck = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
          console.log(
            `[pythonClient] 💾 Recovered from checkpoint: ` +
            `${ck?.policies?.length || 0} policies, ${Object.keys(ck?.results || {}).length} items`
          );
          if (killedByTimeout) {
            ck.error = `Analysis cut at ${NODE_SIDE_TIMEOUT_MS / 60000} min (Node timeout). Recovered ${ck?.policies?.length || 0} policy/policies.`;
          } else if (!ck.error && !ck.info) {
            ck.info = "Recovered partial result from checkpoint.";
          }
          cleanup(payloadPath, checkpointPath);
          return resolve(ck);
        } catch (e) {
          console.log("[pythonClient] checkpoint parse failed:", e.message);
        }
      }

      cleanup(payloadPath, checkpointPath);
      if (killedByTimeout) {
        return reject(new Error(`Python killed after ${NODE_SIDE_TIMEOUT_MS} ms (node-side timeout) and no checkpoint found`));
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
