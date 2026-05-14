// scraper.js
// Robust scraper that:
//  - Forces UTF-8 in the Python child process (fixes Windows cp1252 crashes & mojibake)
//  - Reads stderr/stdout as bytes and decodes UTF-8 in Node (no `â€"` artefacts in logs)
//  - Repairs Windows-1252-as-UTF-8 mojibake in JSON we read (cleanup for stale files)
//  - Tracks which file Python wrote *during this run* and renames it to <standardId>.json
//  - Applies a defensive URN filter so chapters from other libraries can't leak in
//  - Uses the CISO library URN as the unique standard_id (no cross-framework collisions)

import express from "express";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import db from "../db.js";
import { Agent, fetch as undiciFetch } from "undici";
import { authenticateToken, getUserContext } from "./authHelper.js";

const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
const router = express.Router();

// ============================================================
// PERF CACHES — keep them at module scope so they survive between requests
// ============================================================
// Cache the "CISO is reachable" verdict for 60s. Avoid re-probing on every
// scrape; subsequent scrapes within the window run instantly.
const CISO_HEALTH_TTL_MS = 60_000;
let _cisoHealthAt = 0;
let _cisoHealthy  = false;

// Cache loaded-libraries lookup per URN for 5 minutes. Loaded libs rarely
// change during a session — no point re-fetching the full list each scrape.
const LIB_CACHE_TTL_MS = 5 * 60_000;
const _libCache = new Map(); // urn -> { entry, at }


// ============================================================
// CONFIG
// ============================================================
// Override any of these with environment variables (no code edit needed).
const CISO_BASE   = process.env.CISO_BASE_URL  || "https://localhost:8443";
const CISO_TOKEN  = process.env.CISO_API_TOKEN || "f06342340028af25c84a7e0b3f874100042bc8b59bbe8dac203778c08341d22b";
const COMPOSE_DIR = process.env.CISO_COMPOSE_DIR || "/mnt/c/Users/stagiaire/Desktop/PFE/demi-final/ciso-assistant-community";
const PYTHON      = process.env.PYTHON_BIN || "python";
const OUTPUT_DIR  = process.env.SCRAPER_OUTPUT || "C:/Users/stagiaire/Desktop/Ollama/Ollama/data/standards";
const SCRIPT      = path.resolve(process.env.SCRAPER_SCRIPT || "C:/Users/stagiaire/Desktop/Ollama/Ollama/check.py");

// ============================================================
// CISO helpers
// ============================================================
// undici's "fetch failed" hides the real cause (ECONNREFUSED, EHOSTUNREACH, …).
// Surface the cause so the operator can diagnose without guessing.
function describeFetchError(err) {
  const c = err && err.cause;
  if (!c) return err.message;
  const code = c.code || c.errno || "";
  const addr = c.address ? ` (${c.address}:${c.port})` : "";
  return `${err.message}${code ? ` [${code}]` : ""}${addr} :: ${c.message || c}`;
}

async function cisoCall(endpoint, options = {}) {
  let res;
  try {
    res = await undiciFetch(`${CISO_BASE}${endpoint}`, {
      ...options,
      dispatcher: insecureDispatcher,
      headers: {
        Authorization: `Token ${CISO_TOKEN}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (e) {
    const detailed = describeFetchError(e);
    throw new Error(`CISO unreachable at ${CISO_BASE}${endpoint} — ${detailed}`);
  }
  if (!res.ok) throw new Error(`CISO ${res.status}: ${await res.text()}`);
  return res.json();
}

// Run a WSL/host command and return { ok, stdout, stderr } without throwing.
function runShell(cmd, timeoutMs = 30000) {
  try {
    const out = execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs });
    return { ok: true, stdout: out.toString("utf-8"), stderr: "" };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout || Buffer.alloc(0)).toString("utf-8"),
      stderr: (e.stderr || Buffer.alloc(0)).toString("utf-8") || e.message
    };
  }
}

// Try to launch Docker Desktop on Windows. Returns true if found and spawned.
function tryStartDockerDesktop() {
  if (process.platform !== "win32") return false;
  const candidates = [
    process.env.DOCKER_DESKTOP_EXE,
    "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
    "C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe",
    `${process.env.LOCALAPPDATA || ""}\\Docker\\Docker Desktop.exe`,
    `${process.env.PROGRAMFILES || ""}\\Docker\\Docker\\Docker Desktop.exe`
  ].filter(Boolean);
  for (const exe of candidates) {
    if (fs.existsSync(exe)) {
      try {
        const child = spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: false });
        child.unref();
        console.log(`[docker] launched Docker Desktop from ${exe}`);
        return true;
      } catch (e) {
        console.warn(`[docker] failed to launch ${exe}: ${e.message}`);
      }
    }
  }
  return false;
}

// Try to start the Docker daemon INSIDE WSL (native install).
// IMPORTANT: WSL must be warmed up FIRST. When the VM is cold (post-reboot or
// post-`wsl --shutdown`), the first `wsl -- ...` command boots the VM AND
// runs the payload in parallel — which often makes the payload fail before
// the VM is ready. So we explicitly wake WSL up first.
function tryStartDockerInWSL() {
  // Step 1 — wake up WSL with a no-op so the VM has a chance to fully boot
  // (and run its /etc/wsl.conf [boot] command, if any).
  console.log("[docker] warming up WSL...");
  const wake = runShell("wsl -- true", 30000);
  if (!wake.ok) {
    console.warn(`[docker] WSL is unreachable: ${(wake.stderr || wake.stdout).slice(0, 160)}`);
    return false;
  }

  // Step 2 — give WSL a moment to finish its boot command (e.g. `service docker start`)
  runShell("wsl -- sleep 2", 10000);

  // Step 3 — maybe the boot command already started Docker. Cheap check.
  const earlyCheck = runShell("wsl -- docker info --format \"{{.ServerVersion}}\"", 5000);
  if (earlyCheck.ok && earlyCheck.stdout.trim()) {
    console.log(`[docker] engine running after WSL warm-up (v${earlyCheck.stdout.trim()})`);
    return true;
  }

  // Step 4 — explicit start attempts. service first (ubuntu sysvinit), then systemctl.
  const attempts = [
    "wsl -- sudo -n service docker start",
    "wsl -- sudo -n systemctl start docker",
  ];
  for (const cmd of attempts) {
    const r = runShell(cmd, 60000);
    if (r.ok) {
      console.log(`[docker] started via: ${cmd.slice(0, 80)}`);
    } else {
      const tail = (r.stderr || r.stdout || "").trim().slice(-160).replace(/\s+/g, " ");
      console.log(`[docker] attempt non-zero (${cmd.split(" ").slice(-3).join(" ")}): ${tail}`);
    }
    // After every attempt — whether reported success or failure — poll for the engine
    for (let i = 0; i < 4; i++) {
      runShell("wsl -- sleep 2", 5000);
      const c = runShell("wsl -- docker info --format \"{{.ServerVersion}}\"", 4000);
      if (c.ok && c.stdout.trim()) {
        console.log(`[docker] engine ready (v${c.stdout.trim()})`);
        return true;
      }
    }
  }

  // Step 5 — final last-chance check
  const finalCheck = runShell("wsl -- docker info --format \"{{.ServerVersion}}\"", 8000);
  if (finalCheck.ok && finalCheck.stdout.trim()) {
    console.log(`[docker] engine running on final check (v${finalCheck.stdout.trim()})`);
    return true;
  }

  console.warn(
    "[docker] could not start the daemon in WSL.\n" +
    "         Verify in WSL: sudo -n service docker start  (must run without password prompt)\n" +
    "         If it asks for a password, fix /etc/sudoers.d/dockerd-autostart"
  );
  return false;
}

// Wait until `wsl -- docker info` answers (i.e. the Docker engine is alive).
async function waitForDockerEngine(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = runShell("wsl -- docker info --format \"{{.ServerVersion}}\"", 6000);
    if (r.ok && r.stdout.trim()) {
      console.log(`[docker] engine ready after ${Math.round((Date.now() - start) / 1000)}s (v${r.stdout.trim()})`);
      return true;
    }
    await new Promise(res => setTimeout(res, 3000));
  }
  return false;
}

// Check Docker / compose / port-listener — purely informational, never throws.
function diagnoseDockerStack() {
  const r = { docker_running: false, compose_running: false, port_listening: false, notes: [] };

  const wsl = runShell("wsl -- docker info --format '{{.ServerVersion}}'", 8000);
  if (wsl.ok && wsl.stdout.trim()) {
    r.docker_running = true;
  } else {
    r.notes.push(`docker not reachable in WSL: ${wsl.stderr.trim().slice(0, 200)}`);
  }

  if (r.docker_running) {
    const ps = runShell(`wsl -- bash -c "cd ${COMPOSE_DIR} && docker compose ps --status running --quiet | wc -l"`, 10000);
    if (ps.ok) {
      const n = parseInt(ps.stdout.trim(), 10);
      r.compose_running = n > 0;
      if (!r.compose_running) r.notes.push(`docker compose has 0 running containers in ${COMPOSE_DIR}`);
    } else {
      r.notes.push(`docker compose ps failed: ${ps.stderr.trim().slice(0, 200)}`);
    }
  }

  // Quick listener check on the host (Windows)
  const port = (() => {
    try { return new URL(CISO_BASE).port || (CISO_BASE.startsWith("https") ? "443" : "80"); }
    catch { return "8443"; }
  })();
  const ns = runShell(`netstat -an | findstr LISTENING | findstr :${port}`, 5000);
  r.port_listening = ns.ok && ns.stdout.trim().length > 0;
  if (!r.port_listening) r.notes.push(`no LISTENING socket on port ${port} on the host`);

  return r;
}

// Internal helper: actually run `docker compose up -d [--no-wait]`.
// Returns { ok, unknownNoWaitFlag, errorText }.
function _composeUpAttempt(useNoWait, timeoutMs) {
  return new Promise((resolve) => {
    const cmd = useNoWait
      ? `cd ${COMPOSE_DIR} && docker compose up -d --no-wait`
      : `cd ${COMPOSE_DIR} && docker compose up -d`;

    const child = spawn(
      "wsl",
      ["--", "bash", "-c", cmd],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );
    let stderr = "";
    let unknownNoWaitFlag = false;

    child.stdout.on("data", d => process.stdout.write(`[compose] ${d}`));
    child.stderr.on("data", d => {
      const txt = d.toString();
      stderr += txt;
      if (/unknown flag.*--no-wait/i.test(txt)) unknownNoWaitFlag = true;
      process.stderr.write(`[compose] ${txt}`);
    });

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch (_) {}
      resolve({ ok: false, errorText: `timed out after ${Math.round(timeoutMs / 1000)}s`, unknownNoWaitFlag });
    }, timeoutMs);

    child.on("error", e => {
      clearTimeout(timer);
      resolve({ ok: false, errorText: e.message, unknownNoWaitFlag });
    });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve({ ok: true, unknownNoWaitFlag });
      else resolve({ ok: false, errorText: `exit ${code}: ${stderr.slice(-500)}`, unknownNoWaitFlag });
    });
  });
}

// Public: starts the CISO compose stack via WSL.
// Tries with --no-wait first (Docker Compose v2.22+), falls back to plain
// `up -d` for older versions. Either way, the API-readiness loop afterwards
// is what actually detects when CISO is usable.
async function runComposeUp() {
  // First attempt — modern Docker Compose
  const fast = await _composeUpAttempt(true, 5 * 60 * 1000);
  if (fast.ok) return;

  if (fast.unknownNoWaitFlag) {
    console.log("[compose] --no-wait not supported by your docker compose, retrying with plain `up -d`");
    // Older compose: `up -d` may wait for healthchecks, so allow up to 8 min
    const slow = await _composeUpAttempt(false, 8 * 60 * 1000);
    if (slow.ok) return;
    throw new Error(`docker compose up failed: ${slow.errorText}`);
  }

  throw new Error(`docker compose up failed: ${fast.errorText}`);
}

// Poll the CISO API until it answers, up to `timeoutMs`.
// Auto-recovery: if ECONNREFUSED persists for >30s, containers probably died —
// we run `compose up -d` once to bring them back.
async function waitForCisoReady(timeoutMs = 5 * 60 * 1000) {
  const start = Date.now();
  let lastErr = null;
  let logged = 0;
  let connRefusedSince = null;
  let recoveryAttempts = 0;
  const MAX_RECOVERIES = 2;

  while (Date.now() - start < timeoutMs) {
    try {
      await cisoCall("/api/loaded-libraries/?limit=1");
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`[ciso] API ready after ${elapsed}s`);
      return;
    } catch (e) {
      lastErr = e.message;
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed >= logged) {
        console.log(`[ciso]   waiting... (${elapsed}s) - ${lastErr.slice(0, 120)}`);
        logged = elapsed + 10;
      }

      // Auto-recovery: persistent ECONNREFUSED means caddy itself is down ->
      // containers crashed. Kick `compose up -d` to recreate them.
      const isRefused = /ECONNREFUSED|EHOSTUNREACH/.test(lastErr);
      if (isRefused) {
        if (connRefusedSince === null) connRefusedSince = Date.now();
        const refusedFor = Date.now() - connRefusedSince;

        if (recoveryAttempts < MAX_RECOVERIES && refusedFor > 30_000) {
          recoveryAttempts++;
          console.warn(
            `[ciso] ECONNREFUSED for ${Math.round(refusedFor/1000)}s — containers likely crashed. ` +
            `Recovery attempt ${recoveryAttempts}/${MAX_RECOVERIES}: running compose up -d`
          );
          try {
            await runComposeUp();
            console.log(`[ciso] recovery compose up -d completed, resuming wait`);
          } catch (recErr) {
            console.warn(`[ciso] recovery compose up failed: ${(recErr.message || "").slice(0, 200)}`);
          }
          connRefusedSince = null; // reset so we don't immediately retry
        }
      } else {
        // 502/timeout/other — caddy still alive, just keep waiting
        connRefusedSince = null;
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(
    `CISO API not reachable at ${CISO_BASE} after ${Math.round(timeoutMs/1000)}s.\n` +
    `Last error: ${lastErr}\n` +
    `Recovery attempts used: ${recoveryAttempts}/${MAX_RECOVERIES}\n` +
    `Hints:\n` +
    `  - wsl -- docker compose -f ${COMPOSE_DIR}/docker-compose.yml ps\n` +
    `  - wsl -- docker compose -f ${COMPOSE_DIR}/docker-compose.yml logs --tail=50 backend\n`
  );
}

// Fast check: was CISO confirmed reachable within the last 60s? If yes, skip
// the full ensureDockerUp() chain and probe directly. Falls back to the slow
// path only when we actually need it.
async function ensureCisoReachableFast() {
  const now = Date.now();
  if (_cisoHealthy && now - _cisoHealthAt < CISO_HEALTH_TTL_MS) return; // cached OK
  try {
    await cisoCall("/api/loaded-libraries/?limit=1");
    _cisoHealthy = true;
    _cisoHealthAt = now;
    return;
  } catch (_) {
    _cisoHealthy = false;
  }
  // CISO not reachable -> full slow path (start docker / compose up / wait)
  await ensureDockerUp();
  _cisoHealthy  = true;
  _cisoHealthAt = Date.now();
}

// Cached lookup: returns the loaded-library entry that matches `urn`.
// Caches per-URN for 5 minutes. If not found in CISO, calls /import/ once
// and refreshes the cache.
async function getOrImportLibraryEntry(urn) {
  const cached = _libCache.get(urn);
  if (cached && Date.now() - cached.at < LIB_CACHE_TTL_MS) return cached.entry;

  // Filter server-side instead of fetching limit=1000
  const list = await cisoCall(`/api/loaded-libraries/?urn=${encodeURIComponent(urn)}&limit=1`);
  let entry = (list.results || []).find(l => l.urn === urn);

  if (!entry) {
    // Not loaded yet -> import it, then re-fetch
    await cisoCall(`/api/stored-libraries/${encodeURIComponent(urn)}/import/`, { method: "POST" });
    const reload = await cisoCall(`/api/loaded-libraries/?urn=${encodeURIComponent(urn)}&limit=1`);
    entry = (reload.results || []).find(l => l.urn === urn);
    if (!entry) throw new Error("Library import failed");
  }
  _libCache.set(urn, { entry, at: Date.now() });
  return entry;
}

// Returns true if every service in the compose stack is in state 'running'.
// We DON'T require backend to be 'healthy' here — that's what waitForCisoReady
// does afterwards by hitting the actual API. Skipping `compose up` just because
// healthcheck is in progress avoids the 30-60s wasted on a no-op `up -d`.
function areAllContainersRunning() {
  // Fast path: count running services and compare with total declared services
  const cd = `cd ${COMPOSE_DIR} && `;

  // Try `docker compose ps --format json` (Compose v2)
  const r = runShell(`wsl -- bash -c "${cd}docker compose ps --format json"`, 8000);
  if (r.ok && r.stdout.trim()) {
    try {
      // Compose v2 outputs JSONL (one JSON per line)
      const lines = r.stdout.trim().split("\n").filter(l => l.trim().startsWith("{"));
      const services = lines.map(l => JSON.parse(l));
      if (services.length > 0 && services.every(s => s.State === "running")) {
        return true;
      }
      if (services.length === 0) return false;
      return false; // at least one not running
    } catch (_) { /* fall through */ }
  }

  // Fallback: count running services manually
  const declared = runShell(`wsl -- bash -c "${cd}docker compose config --services 2>/dev/null | wc -l"`, 8000);
  const running  = runShell(`wsl -- bash -c "${cd}docker compose ps --status running --quiet | wc -l"`, 8000);
  if (!declared.ok || !running.ok) return false;
  const a = parseInt(declared.stdout.trim(), 10);
  const b = parseInt(running.stdout.trim(), 10);
  return a > 0 && a === b;
}

export async function ensureDockerUp() {
  // 1. Already up? Fast path — most common case after the first boot.
  let firstError = null;
  try {
    await cisoCall("/api/loaded-libraries/?limit=1");
    return { alreadyUp: true };
  } catch (e) {
    firstError = e.message || "";
    console.log(`[ciso] not reachable yet: ${firstError.slice(0, 140)}`);
  }

  // Distinguish between "containers down" and "containers up but backend not ready yet"
  const isConnRefused = /ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/.test(firstError);
  const isProxyTransient = /CISO 5(02|03|04)/.test(firstError); // 502/503/504 from caddy

  // 2. If the proxy answered but backend isn't ready, DON'T run compose up.
  //    Containers are alive — just wait for the healthcheck to pass.
  if (isProxyTransient) {
    console.log("[ciso] backend still warming up (healthcheck in progress) — just waiting, no compose up");
    await waitForCisoReady(3 * 60 * 1000);
    return { alreadyUp: false };
  }

  // 3. Otherwise (ECONNREFUSED or unknown), make sure Docker engine is alive
  let diag = diagnoseDockerStack();
  if (!diag.docker_running) {
    console.log("[docker] engine not running — attempting to start it");
    const launchedDesktop = tryStartDockerDesktop();
    const startedWsl = tryStartDockerInWSL();
    if (!launchedDesktop && !startedWsl) {
      throw new Error(
        "Could not start the Docker engine.\n" +
        "Options:\n" +
        "  (A) Install Docker Desktop on Windows, or\n" +
        "  (B) Configure passwordless sudo in WSL so this code can start dockerd.\n" +
        "      In WSL run:  sudo visudo -f /etc/sudoers.d/dockerd-autostart\n" +
        "      Add line:    YOUR_USER ALL=(ALL) NOPASSWD: /usr/sbin/service docker *, /bin/systemctl start docker, /usr/bin/dockerd\n"
      );
    }
    const ready = await waitForDockerEngine(120_000);
    if (!ready) {
      throw new Error(
        "Docker engine did not become reachable within 2 minutes.\n" +
        "Check: wsl -- docker info"
      );
    }
    diag = diagnoseDockerStack();
  }

  // 4. SMART: skip `compose up -d` if every container is already in state 'running'.
  //    healthcheck progress is irrelevant here — waitForCisoReady (step 5) is the
  //    real readiness gate.
  if (areAllContainersRunning()) {
    console.log("[ciso] all containers already running — skipping compose up, just waiting for API");
  } else {
    console.log(`[ciso] some services missing/stopped — running compose up -d ...`);
    try {
      await runComposeUp();
    } catch (e) {
      console.warn(
        `[ciso] compose up reported: ${(e.message || "").slice(0, 200)}\n` +
        `[ciso] will still try to wait for the API in case it's already coming up.`
      );
    }
  }

  // 5. Wait for the API
  await waitForCisoReady(5 * 60 * 1000);
  return { alreadyUp: false };
}

// ============================================================
// ID helpers
// ============================================================
function urnToStandardId(urn) {
  if (!urn) return null;
  const cleaned = String(urn).toLowerCase()
    .replace(/^urn:/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (cleaned.length <= 90) return cleaned;
  let h = 0;
  for (let i = 0; i < cleaned.length; i++) h = ((h << 5) - h + cleaned.charCodeAt(i)) | 0;
  return cleaned.slice(0, 80) + "_" + Math.abs(h).toString(36);
}

function safeFragment(s, fallback) {
  const v = String(s || fallback || "x").replace(/[^a-zA-Z0-9.]/g, "_").replace(/_+/g, "_");
  return v.replace(/^_+|_+$/g, "") || fallback || "x";
}

// Derive a "framework slug" from the library URN to filter cross-framework leaks.
// urn:intuitem:risk:library:iso22301-2019 -> "iso22301-2019"
function urnToSlug(urn) {
  if (!urn) return null;
  const m = String(urn).match(/[a-zA-Z0-9_\-]+$/);
  return m ? m[0].toLowerCase() : null;
}

// ============================================================
// Mojibake repair (Windows-1252 bytes mistakenly decoded as UTF-8 produce
// strings like "ISO 22301:2019 â€" Business..."). We reverse the process.
// ============================================================
const WIN1252_REVERSE = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
  "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8A,
  "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E, "‘": 0x91, "’": 0x92,
  "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C,
  "ž": 0x9E, "Ÿ": 0x9F
};

function repairMojibake(s) {
  if (typeof s !== "string") return s;
  // Heuristic: only attempt repair when classic mojibake markers are present.
  if (!/[Ã][-¿]|â€|Â[ -¿]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xFF) bytes.push(cp);
    else if (WIN1252_REVERSE[ch] !== undefined) bytes.push(WIN1252_REVERSE[ch]);
    else return s; // give up, return original
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(bytes));
    // Sanity check: only accept if the decoded version no longer matches mojibake markers.
    if (/â€|Ã[©¨ªàâîôûç]/.test(decoded)) return s;
    return decoded;
  } catch {
    return s;
  }
}

function deepRepairMojibake(value) {
  if (typeof value === "string") return repairMojibake(value);
  if (Array.isArray(value)) return value.map(deepRepairMojibake);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepRepairMojibake(v);
    return out;
  }
  return value;
}

// ============================================================
// JSON reading + URN filtering
// ============================================================
function loadFrameworkFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  let data = JSON.parse(raw);
  data = deepRepairMojibake(data);

  // Accept several common shapes
  if (data.frameworks && Array.isArray(data.frameworks) && data.frameworks.length === 1) {
    return data.frameworks[0];
  }
  return data.framework || data.standard || data;
}

// Defensive: drop chapters/items whose URN clearly belongs to ANOTHER framework.
// We only filter when nodes carry a `urn` field that identifies their parent framework.
// If nodes have no URN, we leave the data untouched (filter is a no-op).
function filterByFrameworkSlug(fw, slug) {
  if (!slug) return { fw, dropped: 0 };
  const matchesSlug = (node) => {
    const urn = node?.urn || node?.framework_urn || node?.parent_urn;
    if (!urn) return null;            // unknown -> don't filter
    return String(urn).toLowerCase().includes(slug);
  };

  let dropped = 0;
  const filterTree = (nodes) => {
    if (!Array.isArray(nodes)) return [];
    const kept = [];
    for (const n of nodes) {
      const verdict = matchesSlug(n);
      if (verdict === false) { dropped++; continue; }
      const copy = { ...n };
      copy.items = filterTree(n.items || n.controls || []);
      copy.children = filterTree(n.children || []);
      kept.push(copy);
    }
    return kept;
  };

  const fixed = {
    ...fw,
    core_chapters: filterTree(fw.core_chapters || fw.coreChapters || []),
    families: (fw.families || []).map(f => {
      const v = matchesSlug(f);
      if (v === false) { dropped++; return null; }
      return {
        ...f,
        items: filterTree(f.items || f.controls || [])
      };
    }).filter(Boolean)
  };
  return { fw: fixed, dropped };
}

// Counts (used for sanity logging)
function countCoreItems(chapters) {
  if (!Array.isArray(chapters)) return 0;
  let c = 0;
  for (const ch of chapters) {
    c += (ch.items || ch.controls || []).length;
    c += countCoreItems(ch.children || []);
  }
  return c;
}
function countCoreNodes(chapters) {
  if (!Array.isArray(chapters)) return 0;
  let c = 0;
  for (const ch of chapters) {
    c += 1;
    c += countCoreNodes(ch.children || []);
  }
  return c;
}
function countFamilyItems(families) {
  if (!Array.isArray(families)) return 0;
  let total = 0;
  for (const f of families) {
    total += (f.items || f.controls || []).length;
    if (Array.isArray(f.children) && f.children.length) {
      total += countFamilyItems(f.children);
    }
  }
  return total;
}

// Flatten a family tree: if a family has sub-families (children), promote them
// to the same flat list. Each output entry carries items only.
// (The DB schema has no parent_family_id, so we flatten.)
function flattenFamilyTree(families) {
  const out = [];
  const walk = (f) => {
    out.push({
      ref_id: f.ref_id,
      name: f.title || f.name,
      description: f.description || "",
      items: f.items || f.controls || []
    });
    for (const sub of (f.children || [])) walk(sub);
  };
  for (const f of (families || [])) walk(f);
  return out;
}

// ============================================================
// Find the JSON file that THIS scrape produced (or fallback gracefully)
// ============================================================
function jsonFilesIn(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json") &&
                 !f.startsWith("frameworks_index_") &&
                 !f.startsWith("ciso_standards_") &&
                 !f.startsWith("all_frameworks_"))
    .map(f => {
      const p = path.join(dir, f);
      const stat = fs.statSync(p);
      return { f, path: p, mtime: stat.mtimeMs };
    });
}

// ============================================================
// GET /api/scraper/available
// ============================================================
// GET /api/scraper/health — diagnostic. Tells you exactly why CISO is unreachable.
router.get("/health", async (req, res) => {
  const report = {
    ciso_base: CISO_BASE,
    compose_dir: COMPOSE_DIR,
    python: PYTHON,
    script: SCRIPT,
    output_dir: OUTPUT_DIR,
    output_dir_exists: fs.existsSync(OUTPUT_DIR),
    script_exists: fs.existsSync(SCRIPT),
    ciso_reachable: false,
    ciso_error: null,
    docker: diagnoseDockerStack()
  };
  try {
    await cisoCall("/api/loaded-libraries/?limit=1");
    report.ciso_reachable = true;
  } catch (e) {
    report.ciso_error = e.message;
  }
  res.json(report);
});

// GET /api/scraper/status — same as health but cheap (no API call)
router.get("/status", (req, res) => {
  res.json({
    ciso_base: CISO_BASE,
    docker: diagnoseDockerStack()
  });
});

// POST /api/scraper/start — start CISO and wait for it to be ready
router.post("/start", async (req, res) => {
  try {
    await ensureDockerUp();
    res.json({ success: true, message: "CISO is ready", ciso_base: CISO_BASE });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/scraper/stop — stop CISO
router.post("/stop", (req, res) => {
  const r = runShell(`wsl -- bash -c "cd ${COMPOSE_DIR} && docker compose down"`, 60000);
  // Invalidate caches: CISO is no longer reachable
  _cisoHealthy = false;
  _libCache.clear();
  if (r.ok) res.json({ success: true, message: "CISO stopped" });
  else res.status(500).json({ success: false, error: r.stderr.trim() || "compose down failed" });
});

// POST /api/scraper/refresh — manually invalidate caches (force re-probe)
router.post("/refresh", (req, res) => {
  _cisoHealthy = false;
  _libCache.clear();
  res.json({ success: true, message: "Caches invalidated" });
});

router.get("/available", async (req, res) => {
  try {
    await ensureCisoReachableFast(); // cached probe instead of full ensureDockerUp
    const stored = await cisoCall("/api/stored-libraries/?limit=1000");
    const loaded = await cisoCall("/api/loaded-libraries/?limit=1000");

    const map = new Map();
    for (const l of stored.results || []) {
      map.set(l.urn, {
        id: l.urn, name: l.name, version: l.version,
        provider: l.provider || l.publisher || "Unknown",
        description: l.description || "", loaded: false
      });
    }
    for (const l of loaded.results || []) {
      map.set(l.urn, {
        id: l.urn, loaded_id: l.id, name: l.name, version: l.version,
        provider: l.provider || l.publisher || "Unknown",
        description: l.description || "", loaded: true
      });
    }

    const frameworks = [...map.values()].filter(f => {
      const name = (f.name || "").toLowerCase();
      return !name.includes("<->") &&
             !name.includes("->") &&
             !name.includes("mapping") &&
             !name.includes(" vers ") &&
             !name.includes(" to ") &&
             !name.includes("usual reference");
    });

    res.json({ frameworks });
  } catch (err) {
    console.error("available error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/scraper/scrape
// ============================================================
router.post("/scrape", authenticateToken, async (req, res) => {
  const { frameworkId } = req.body;
  if (!frameworkId) return res.status(400).json({ error: "frameworkId required" });

  // Visibility:
  //   admin scrapes are public (created_by_user_id = NULL)
  //   user scrapes are private to the user (created_by_user_id = userId)
  const ctx = await getUserContext(req);
  if (!ctx.userId) return res.status(401).json({ error: "Login required" });
  const ownerId = ctx.isAdmin ? null : ctx.userId;
  console.log(
    `[scrape] requested by userId=${ctx.userId} role=${ctx.role} ` +
    `isAdmin=${ctx.isAdmin} authSource=${req._authSource} -> ` +
    `ownerId=${ownerId === null ? "NULL (public)" : ownerId}`
  );

  try {
    // FAST path: if CISO was reachable in the last 60s, skip the full
    // ensureDockerUp() chain. Only fall back to the heavy version when
    // a fresh probe fails.
    await ensureCisoReachableFast();

    // 1. Get (or import once) the loaded-library entry, cached for 5 min
    const entry = await getOrImportLibraryEntry(frameworkId);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Per-user namespacing: admins write to the canonical (public) id; users
    // get their own copy prefixed with `u<id>_` so two users can each have
    // their own private version of the same framework without collision.
    const baseStandardId = urnToStandardId(frameworkId);
    const standardId = ctx.isAdmin
      ? baseStandardId
      : `u${ctx.userId}_${baseStandardId}`.slice(0, 100);
    const slug = urnToSlug(frameworkId);
    const deterministicFile = path.join(OUTPUT_DIR, `${standardId}.json`);

    // Snapshot of files BEFORE the scrape so we can identify what's new/changed
    const beforeMap = new Map(jsonFilesIn(OUTPUT_DIR).map(x => [x.f, x.mtime]));
    const startedAt = Date.now() - 1000;

    // 2. Run the Python scraper with UTF-8 forced (fixes cp1252 crashes & mojibake)
    let stderrBuf = Buffer.alloc(0);
    let stdoutBuf = Buffer.alloc(0);
    await new Promise((resolve, reject) => {
      const py = spawn(PYTHON, [SCRIPT, entry.id], {
        env: {
          ...process.env,
          // Force UTF-8 everywhere inside the Python process (incl. its own subprocess calls)
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
          LC_ALL: "C.UTF-8",
          LANG: "C.UTF-8",
          // Hints for check.py
          CISO_API_TOKEN: CISO_TOKEN,
          CISO_BASE_URL: CISO_BASE,
          SCRAPER_OUTPUT: OUTPUT_DIR,
          SCRAPER_OUTFILE: deterministicFile,
          SCRAPER_STANDARD_ID: standardId,
          SCRAPER_FRAMEWORK_URN: frameworkId
        }
      });
      py.stdout.on("data", d => { stdoutBuf = Buffer.concat([stdoutBuf, d]); });
      py.stderr.on("data", d => { stderrBuf = Buffer.concat([stderrBuf, d]); });
      py.on("error", reject);
      py.on("close", code => {
        const err = stderrBuf.toString("utf-8");
        const out = stdoutBuf.toString("utf-8");
        if (out.trim()) console.log("[python stdout]\n" + out.trim());
        if (code === 0) return resolve();
        reject(new Error(`Python exited ${code}\n${err}`));
      });
    });

    // 3. Resolve the JSON file produced by THIS run
    let jsonPath = null;
    if (fs.existsSync(deterministicFile)) {
      jsonPath = deterministicFile;
    } else {
      // Find files modified after startedAt — that's what Python just wrote
      const after = jsonFilesIn(OUTPUT_DIR);
      const fresh = after
        .filter(x => x.mtime >= startedAt &&
                     (!beforeMap.has(x.f) || beforeMap.get(x.f) !== x.mtime))
        .sort((a, b) => b.mtime - a.mtime);

      if (fresh.length === 0) {
        throw new Error(
          `Python finished but produced no new JSON file in ${OUTPUT_DIR}. ` +
          `If you changed scrapes, the previous file may be stale. Check check.py output.`
        );
      }
      jsonPath = fresh[0].path;
      // Rename it to the deterministic name so subsequent runs don't get confused
      try {
        fs.renameSync(jsonPath, deterministicFile);
        jsonPath = deterministicFile;
      } catch (e) {
        console.warn(`Could not rename ${jsonPath} -> ${deterministicFile}: ${e.message}`);
      }
    }

    // 4. Load + repair mojibake + filter cross-framework leaks
    let fw = loadFrameworkFromFile(jsonPath);
    if (!fw || !fw.name) throw new Error("Invalid framework JSON: missing `name`");

    const before = {
      coreNodes: countCoreNodes(fw.core_chapters || fw.coreChapters || []),
      coreItems: countCoreItems(fw.core_chapters || fw.coreChapters || []),
      annexFams: (fw.families || []).length,
      annexItems: countFamilyItems(fw.families || [])
    };

    const { fw: filtered, dropped } = filterByFrameworkSlug(fw, slug);
    fw = filtered;

    const after = {
      coreNodes: countCoreNodes(fw.core_chapters || fw.coreChapters || []),
      coreItems: countCoreItems(fw.core_chapters || fw.coreChapters || []),
      annexFams: (fw.families || []).length,
      annexItems: countFamilyItems(fw.families || [])
    };

    console.log(`Framework: ${fw.name}`);
    console.log(`  standard_id: ${standardId}`);
    console.log(`  slug:        ${slug}`);
    console.log(`  before urn-filter: coreNodes=${before.coreNodes} coreItems=${before.coreItems} annexFams=${before.annexFams} annexItems=${before.annexItems}`);
    console.log(`  after  urn-filter: coreNodes=${after.coreNodes}  coreItems=${after.coreItems}  annexFams=${after.annexFams}  annexItems=${after.annexItems}`);
    if (dropped > 0) console.warn(`  dropped ${dropped} foreign-URN nodes`);

    // Sanity sample — top-level chapters
    const topRefs = (fw.core_chapters || []).slice(0, 8).map(c => `${c.ref_id || "?"} ${c.title || c.name || ""}`.trim());
    if (topRefs.length) console.log(`  sample core chapters: ${JSON.stringify(topRefs)}`);
    if ((fw.families || []).length === 0) console.log(`  no annex families (expected for management standards like ISO 22301)`);

    // 5. Insert into DB — strict per-framework isolation
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query("DELETE FROM ciso_controls WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_families WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_core_chapters WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_standards WHERE id = ?", [standardId]);

      const totalControls = after.coreItems + after.annexItems;

      await conn.query(
        `INSERT INTO ciso_standards
         (id, name, description, version, provider, ref_id, controls_count, is_custom, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          standardId,
          fw.name,
          fw.description || "",
          fw.version || "1.0",
          fw.provider || fw.publisher || "Unknown",
          fw.ref_id || frameworkId,
          totalControls,
          ownerId
        ]
      );

      let coreSeq = 0, ctrlSeq = 0;
      const insertCore = async (node, parentId, level) => {
        coreSeq++;
        const localId = `${standardId}__c_${coreSeq}_${safeFragment(node.ref_id, "ch")}`.slice(0, 100);
        await conn.query(
          `INSERT INTO ciso_core_chapters
           (id, standard_id, ref_id, title, description, parent_id, level, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            localId, standardId,
            node.ref_id || `ch_${coreSeq}`,
            node.title || node.name || "Untitled",
            node.description || node.purpose || node.summary || "",
            parentId, level, coreSeq
          ]
        );
        for (const item of (node.items || node.controls || [])) {
          ctrlSeq++;
          const cid = `${standardId}__cc_${ctrlSeq}_${safeFragment(item.ref_id, "ctl")}`.slice(0, 100);
          await conn.query(
            `INSERT INTO ciso_controls
             (id, family_id, core_chapter_id, standard_id, ref_id, name, description, implementation_guidance)
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
            [cid, localId, standardId,
             item.ref_id || `ctl_${ctrlSeq}`,
             item.name || item.title || "Untitled",
             item.description || "",
             item.implementation_guidance || null]
          );
        }
        for (const child of (node.children || [])) await insertCore(child, localId, level + 1);
      };
      for (const node of (fw.core_chapters || fw.coreChapters || [])) {
        await insertCore(node, null, 0);
      }

      let famSeq = 0;
      // Flatten potential sub-family nesting (e.g. ISO 27001 A.5 -> A.5.x sub-sections)
      const flatFamilies = flattenFamilyTree(fw.families || []);
      for (const fam of flatFamilies) {
        famSeq++;
        const items = fam.items || [];
        const famId = `${standardId}__f_${famSeq}_${safeFragment(fam.ref_id, "fam")}`.slice(0, 100);
        await conn.query(
          `INSERT INTO ciso_families
           (id, standard_id, ref_id, name, description, display_order, controls_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [famId, standardId, fam.ref_id || `f_${famSeq}`,
           fam.name || "Untitled", fam.description || "", famSeq, items.length]
        );
        for (const item of items) {
          ctrlSeq++;
          const cid = `${standardId}__fc_${ctrlSeq}_${safeFragment(item.ref_id, "ctl")}`.slice(0, 100);
          await conn.query(
            `INSERT INTO ciso_controls
             (id, family_id, core_chapter_id, standard_id, ref_id, name, description, implementation_guidance)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
            [cid, famId, standardId,
             item.ref_id || `ctl_${ctrlSeq}`,
             item.name || item.title || "Untitled",
             item.description || "",
             item.implementation_guidance || null]
          );
        }
      }

      await conn.commit();
      console.log(`Scrape OK: ${fw.name}  core=${after.coreItems}  annex=${after.annexItems}  total=${totalControls}`);
      res.json({
        success: true,
        id: standardId,
        name: fw.name,
        coreChaptersInserted: coreSeq,
        annexFamiliesInserted: famSeq,
        controlsInserted: ctrlSeq,
        droppedForeignNodes: dropped,
        file: path.basename(jsonPath),
        // Diagnostic: who scraped, and how the row is stored
        scrapedBy: {
          userId: ctx.userId,
          role: ctx.role,
          isAdmin: ctx.isAdmin,
          authSource: req._authSource
        },
        visibility: ownerId === null ? "public" : "private",
        created_by_user_id: ownerId
      });
    } catch (e) {
      await conn.rollback();
      console.error("Transaction error:", e);
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("scrape error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;