// backend/services/pythonClient.js
// =====================================================================
//  v3 — FULL TEXT MODE
//   • 1 policy per LLM call (always)
//   • Full policy text (MAX_POLICY_CHARS=8000) sent to LLM
//   • Per-item time budget (MAX_TIME_PER_ITEM=1800s)
//   • Stall detection (OLLAMA_STALL_TIMEOUT=180s)
//   • Adapts to ANY number of policies per item
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
  process.env.NODE_SIDE_TIMEOUT_MS || "604800000",  // 7 days = effectively no kill
  10
);

export function analyzeDocumentWithPython({
  documents,
  documentPath,
  documentName,
  standards,
}) {
  return new Promise((resolve, reject) => {
    const payloadPath    = path.join(os.tmpdir(), `compliance_payload_${Date.now()}.json`);
    const checkpointPath = payloadPath + ".checkpoint.json";

    const payload = {
      document_name: documentName || "document",
      standards,
    };

    const multiFileMode = Array.isArray(documents) && documents.length > 0;
    if (multiFileMode) {
      payload.documents = documents.map(d => ({
        path: d.path,
        name: d.name,
      }));
    }

    fs.writeFileSync(payloadPath, JSON.stringify(payload), "utf-8");

    const firstDocPath = documentPath
                      || (multiFileMode ? documents[0].path : "");

    const env = {
      ...process.env,
      PYTHONIOENCODING: "utf-8",

      // ─── model ────────────────────────────────────────────────────
      OLLAMA_MODEL:       process.env.OLLAMA_MODEL       || "mistral:7b",

      // ─── coverage ─────────────────────────────────────────────────
      MAX_POLICIES:       process.env.MAX_POLICIES       || "20",

      // ─── BATCH = 1 (mandatory for full-text mode) ─────────────────
      POLICY_BATCH_SIZE:  process.env.POLICY_BATCH_SIZE  || "1",
      OLLAMA_BATCH_SIZE:  process.env.OLLAMA_BATCH_SIZE  || "1",
      RETRY_BATCH_SIZES:  process.env.RETRY_BATCH_SIZES  || "1",

      // ─── prediction & context ─────────────────────────────────────
      OLLAMA_NUM_PREDICT: process.env.OLLAMA_NUM_PREDICT || "350",
      OLLAMA_NUM_CTX:     process.env.OLLAMA_NUM_CTX     || "8192",

      // ─── timeouts (large for full-text mode) ──────────────────────
      OLLAMA_TIMEOUT:        process.env.OLLAMA_TIMEOUT        || "1800",  // 30 min/call
      OLLAMA_WARMUP_TIMEOUT: process.env.OLLAMA_WARMUP_TIMEOUT || "1800",
      OLLAMA_STALL_TIMEOUT:  process.env.OLLAMA_STALL_TIMEOUT  || "180",   // 3 min stall = abort
      MAX_TIME_PER_ITEM:     process.env.MAX_TIME_PER_ITEM     || "1800",  // 30 min/item

      OLLAMA_PARALLEL:    process.env.OLLAMA_PARALLEL    || "1",
      OLLAMA_NUM_THREAD:  process.env.OLLAMA_NUM_THREAD  || "8",

      // ─── document & policy sizing (FULL TEXT) ─────────────────────
      MAX_DOC_CHARS:      process.env.MAX_DOC_CHARS      || "4000",
      MAX_POLICY_CHARS:   process.env.MAX_POLICY_CHARS   || "8000",

      // ─── embedding ────────────────────────────────────────────────
      EMBED_CHUNK_SIZE:       process.env.EMBED_CHUNK_SIZE    || "1000",
      EMBED_CHUNK_OVERLAP:    process.env.EMBED_CHUNK_OVERLAP || "200",
      MAX_CHUNKS_PER_POLICY:  process.env.MAX_CHUNKS_PER_POLICY || "20",

      // ─── relevance ────────────────────────────────────────────────
      USE_SEMANTIC:           process.env.USE_SEMANTIC        || "1",
      SEMANTIC_THRESHOLD:     process.env.SEMANTIC_THRESHOLD  || "0.35",
      SEMANTIC_MODEL:         process.env.SEMANTIC_MODEL      || "sentence-transformers/all-MiniLM-L6-v2",
      FILTER_MIN_OVERLAP:     process.env.FILTER_MIN_OVERLAP  || "2",

      // ─── quality ──────────────────────────────────────────────────
      FAST_MODE:          process.env.FAST_MODE          || "0",
      USE_RAG:            process.env.USE_RAG            || "1",
      MODE:               process.env.MODE               || "per_item",
    };

    console.log(
      `[pythonClient] mode=${multiFileMode ? `MULTI-FILE (${documents.length} docs)` : "single-file"}, ` +
      `timeout=${NODE_SIDE_TIMEOUT_MS / 60000} min, ` +
      `llm=${env.OLLAMA_MODEL}, policy_batch=${env.POLICY_BATCH_SIZE} (FULL TEXT), ` +
      `ollama_timeout=${env.OLLAMA_TIMEOUT}s, stall=${env.OLLAMA_STALL_TIMEOUT}s, ` +
      `item_budget=${env.MAX_TIME_PER_ITEM}s, max_policy_chars=${env.MAX_POLICY_CHARS}, ` +
      `semantic=${env.USE_SEMANTIC} (threshold=${env.SEMANTIC_THRESHOLD}), ` +
      `RAG=${env.USE_RAG}, threads=${env.OLLAMA_NUM_THREAD}`
    );

    if (multiFileMode) {
      console.log(`[pythonClient] documents:`);
      documents.forEach((d, i) =>
        console.log(`   ${i + 1}. ${d.name}  ←  ${d.path}`)
      );
    }

    const proc = spawn(PYTHON_BIN, [PYTHON_SCRIPT, firstDocPath, payloadPath], {
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
            `${ck?.policies_detected?.length || ck?.policies?.length || 0} policies, ` +
            `${ck?.items?.length || Object.keys(ck?.results || {}).length} items`
          );
          if (killedByTimeout) {
            ck.error = `Analysis cut at ${NODE_SIDE_TIMEOUT_MS / 60000} min (Node timeout). Recovered partial result.`;
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