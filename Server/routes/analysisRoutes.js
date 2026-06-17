// backend/routes/analysisRoutes.js — v3 (ITEM-CENTRIC + per-(item,policy) risks)
//
// Key changes vs v2:
//   ✅ POST payload is item-centric:
//        { items: [{ item_id, policy_assessments: [
//             { policy_name, risks, gaps, mitigation, ... }
//           ], ciso_status, ciso_comment }] }
//   ✅ `risks`, `analysis_gaps`, `analysis_remediations`, `business_risks`
//      now carry `item_id` (run the migration in `analysis_migration.sql`
//      first). Each (item, policy) pair stores its own row(s).
//   ✅ "Not applicable" items don't count in KPIs or in the global score.
//   ✅ GET /:id returns items grouped by item_id, with their per-policy
//      blocks reattached (risks, gaps, remediations).
//
import express from "express";
import db from "../db.js";
import { activityLogger } from "../middlewares/activityLogger.js";

const router = express.Router();

const STATUS_SCORE = { "Covered": 100, "Partial": 50, "Not covered": 0 };

const isApplicable = (it) => it && it.is_applicable !== false && (it.ai_status || it.ciso_status) !== "Not applicable";

function normalizeText(s) {
  if (!s) return "";
  return String(s).toLowerCase().normalize("NFKD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter(w => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

// =====================================================================
// POST /api/analyses — save a finalized item-centric analysis
// =====================================================================
router.post("/", activityLogger("COMPLIANCE_ANALYSIS", { onSuccess: true }), async (req, res) => {
  const conn = await db.getConnection();
  try {
    console.log("✅ ROUTE /api/analyses POST HIT (v3 item-centric)");
    await conn.beginTransaction();

    const sessionUser = req.session?.user || {};
    const bodyUser = {
      id:           req.body.created_by_id           || null,
      name:         req.body.created_by_name         || "",
      organisation: req.body.created_by_organisation || "",
      department:   req.body.created_by_department   || "",
    };
    const user = {
      id:           sessionUser.id                                       || bodyUser.id,
      name:         sessionUser.name                                     || bodyUser.name,
      organisation: sessionUser.organization || sessionUser.organisation || bodyUser.organisation,
      department:   sessionUser.department                               || bodyUser.department,
    };

    const {
      title, document_name, standard_id, standard_name,
      items = [],
      policies_detected = [],
    } = req.body;

    if (!title) {
      await conn.rollback();
      return res.status(400).json({ error: "Title is required" });
    }

    // ─── KPI roll-up over items (NOT policies) ──────────────────────
    let covered = 0, partial = 0, notCovered = 0, notApplicable = 0;
    let scoreSum = 0, scoredCount = 0;

    for (const it of items) {
      const finalStatus = it.ciso_status || it.ai_status || "Not covered";
      if (!isApplicable(it) || finalStatus === "Not applicable") {
        notApplicable++;
        continue;
      }
      scoredCount++;
      scoreSum += STATUS_SCORE[finalStatus] ?? 0;
      if      (finalStatus === "Covered") covered++;
      else if (finalStatus === "Partial") partial++;
      else                                notCovered++;
    }
    const globalScore = scoredCount ? Math.round(scoreSum / scoredCount) : 0;

    const [aRes] = await conn.query(
      `INSERT INTO compliance_analyses
        (title, document_name, standard_id, standard_name,
         global_score, covered_count, partial_count, not_covered_count,
         total_items,
         created_by_id, created_by_name,
         created_by_organisation, created_by_department,
         status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title, document_name || "", standard_id || null, standard_name || "",
        globalScore, covered, partial, notCovered, scoredCount,
        user.id, user.name, user.organisation, user.department,
        "finalized",
      ]
    );
    const analysisId = aRes.insertId;
    // === Résoudre les it.item_id vers ciso_controls / items en une seule passe ===
const allItemIds = [...new Set(
  items.map(it => String(it.item_id || "")).filter(Boolean)
)];

const cisoControlSet = new Set();
const policyItemsSet = new Set();

if (allItemIds.length) {
  const [cisoRows] = await conn.query(
    `SELECT id FROM ciso_controls WHERE id IN (?)`, [allItemIds]
  );
  for (const row of cisoRows) cisoControlSet.add(String(row.id));

  const numericIds = allItemIds.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
  if (numericIds.length) {
    const [polRows] = await conn.query(
      `SELECT id FROM items WHERE id IN (?) AND type = 'policy'`, [numericIds]
    );
    for (const row of polRows) policyItemsSet.add(row.id);
  }
}

const resolveSource = (itemIdRaw) => {
  const s = String(itemIdRaw || "");
  if (!s) return { sourceControlId: null, sourcePolicyId: null };
  if (cisoControlSet.has(s)) return { sourceControlId: s, sourcePolicyId: null };
  const n = parseInt(s, 10);
  if (!isNaN(n) && policyItemsSet.has(n)) return { sourceControlId: null, sourcePolicyId: n };
  return { sourceControlId: null, sourcePolicyId: null };
};

    // ─── Persist policies as analysis_policies rows ─────────────────
    // Union of (a) policies the frontend sent in `policies_detected`
    // and (b) any policy name referenced in items[].policy_assessments
    // — so we never end up with a FK on an undefined policy.
    const policySummaryByName = {};
    for (const pdet of policies_detected) {
      const n = pdet.policy_name || pdet.name;
      if (n) policySummaryByName[n] = pdet.policy_summary || pdet.summary || "";
    }
    for (const it of items) {
      for (const pa of (it.policy_assessments || [])) {
        if (pa.policy_name && !(pa.policy_name in policySummaryByName)) {
          policySummaryByName[pa.policy_name] = pa.policy_summary || "";
        }
      }
    }

    const policyIdByName = {};
    for (const pName of Object.keys(policySummaryByName)) {
      // average score from this policy's appearances across items
      let pSum = 0, pN = 0, pCov = 0, pPart = 0, pNot = 0;
      for (const it of items) {
        if (!isApplicable(it)) continue;
        for (const pa of (it.policy_assessments || [])) {
          if (pa.policy_name !== pName) continue;
          const s = pa.ciso_status || pa.status || "Not covered";
          pSum += STATUS_SCORE[s] ?? 0;
          pN++;
          if      (s === "Covered") pCov++;
          else if (s === "Partial") pPart++;
          else                      pNot++;
        }
      }
      const pScore  = pN ? Math.round(pSum / pN) : 0;
      const pStatus = pScore >= 80 ? "Covered" : pScore >= 30 ? "Partial" : "Not covered";

      const [pRes] = await conn.query(
        `INSERT INTO analysis_policies (analysis_id, policy_name, policy_summary, policy_score, status)
         VALUES (?,?,?,?,?)`,
        [analysisId, pName, policySummaryByName[pName] || "", pScore, pStatus]
      );
      policyIdByName[pName] = pRes.insertId;
    }

    // ─── Persist analysis_items ─────────────────────────────────────
    // Old schema had a `policy_id` column meaning "the (single) policy
    // this item belongs to". With multiple policies per item, that
    // doesn't fit anymore. We store one analysis_items row per item
    // (policy_id=NULL) — per-policy blocks live in the risk/gap/rem
    // tables tied by (analysis_id, item_id, policy_id).
    const itemIdMap = {}; // item.item_id -> DB id (for joining if needed)
    for (const it of items) {
      const finalStatus = it.ciso_status || it.ai_status || (isApplicable(it) ? "Not covered" : "Not applicable");
      const score = isApplicable(it) ? (STATUS_SCORE[finalStatus] ?? 0) : 0;

      const [iRes] = await conn.query(
        `INSERT INTO analysis_items
           (analysis_id, policy_id, item_id, ref_id, title, type,
            ai_status, ai_confidence, ciso_status, ciso_comment, score, evidence)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          analysisId, null,
          String(it.item_id || ""), it.ref_id || "", it.title || "",
          it.type || "annex_control",
          it.ai_status  || (isApplicable(it) ? "Not covered" : "Not applicable"),
          it.ai_confidence || it.conf || 0,
          it.ciso_status || null, it.ciso_comment || "",
          score, JSON.stringify(it.policy_assessments || []),
        ]
      );
      itemIdMap[it.item_id] = iRes.insertId;

      // Per-(item, policy) blocks: risks / gaps / remediations
      for (const pa of (it.policy_assessments || [])) {
        const policyId = policyIdByName[pa.policy_name];
        if (!policyId) continue;

        for (const g of (pa.gaps || [])) {
          const gtext = typeof g === "string" ? g : (g?.description || "");
          if (!gtext.trim()) continue;
          await conn.query(
            `INSERT INTO analysis_gaps (analysis_id, policy_id, item_id, description) VALUES (?,?,?,?)`,
            [analysisId, policyId, String(it.item_id), gtext]
          );
        }

        // remediation can come as a string (mitigation_text) or list of actions
        const remActions = [];
        if (typeof pa.remediation === "string" && pa.remediation.trim()) {
          for (const line of pa.remediation.split("\n").map(s => s.trim()).filter(Boolean)) {
            remActions.push({ action: line, priority: "Medium" });
          }
        }
        if (Array.isArray(pa.remediations)) {
          for (const r of pa.remediations) {
            if (!r?.action) continue;
            remActions.push(r);
          }
        }
        for (const r of remActions) {
          await conn.query(
            `INSERT INTO analysis_remediations
               (analysis_id, policy_id, item_id, action, priority, due_date, assigned_to)
             VALUES (?,?,?,?,?,?,?)`,
            [analysisId, policyId, String(it.item_id),
             r.action, r.priority || "Medium", r.due_date || null, r.assigned_to || ""]
          );
        }

        // risks (validated by CISO): persist into risks / business_risks
        for (const risk of (pa.risks || [])) {
          const desc = (typeof risk === "string" ? risk : (risk?.description || risk?.intitule || "")).trim();
          if (!desc) continue;
          const r = (typeof risk === "object" && risk) ? risk : {};
          const intitule = (r.intitule || desc).slice(0, 100);
          const cls = r.risk_class || "asset";

          if (cls === "asset" || cls === "both") {
  const { sourceControlId, sourcePolicyId } = resolveSource(it.item_id);

  const [rRes] = await conn.query(
  `INSERT INTO risks
    (intitule, categorie, source, owner, description,
     impact, probabilite, statut, dueDate,
     analysis_id, risk_class, item_id,
     inherent_impact, inherent_probabilite, treatment_strategy,
     source_control_id, source_control_key, source_policy_id,
     source_policy_name, source_analysis_id)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [
    intitule, r.categorie || "Information Security",
    `AI Analysis #${analysisId}`, r.owner || user.name, desc,
    r.impact ?? 2, r.probabilite ?? r.probability ?? 2,
    "Open", r.dueDate || null, analysisId, "asset", String(it.item_id),
    r.impact ?? 2, r.probabilite ?? r.probability ?? 2, "Mitigate",
    sourceControlId, it.ref_id || null, sourcePolicyId,
    pa.policy_name || null, analysisId,   // ← AJOUT
  ]
);
  const riskId = rRes.insertId;

  // ─── Auto-link risk_controls (si l'item est un ciso_control) ────
  if (sourceControlId) {
    try {
      const eff = (it.ciso_status || it.ai_status) === "Partial" ? "Partial"
                : (it.ciso_status || it.ai_status) === "Not covered" ? "Ineffective"
                : "Partial";
      await conn.query(
        `INSERT IGNORE INTO risk_controls (risk_id, control_id, effectiveness, notes)
         VALUES (?, ?, ?, ?)`,
        [riskId, sourceControlId, eff,
         `Auto-linked from analysis #${analysisId} — ${it.ciso_status || it.ai_status || "Not covered"}`]
      );
    } catch (e) { console.warn("risk_controls auto-link failed:", e.message); }
  }

  // ─── Auto-link risk_policies (si l'item est une policy de items) ──
  if (sourcePolicyId) {
    try {
      await conn.query(
        `INSERT IGNORE INTO risk_policies (risk_id, policy_id)
         VALUES (?, ?)`,
        [riskId, sourcePolicyId]
      );
    } catch (e) { console.warn("risk_policies auto-link failed:", e.message); }
  }

  // ─── Mitigation plans (existant, inchangé) ──────────────────────
  for (const m of (r.mitigationPlan || remActions.map(x => x.action))) {
    if (!m) continue;
    await conn.query(
      `INSERT INTO mitigation_plans (risk_id, action, priority, status, due_date) VALUES (?,?,?,?,?)`,
      [riskId, m, "Medium", "Open", r.dueDate || null]
    );
  }
  for (const aid of (Array.isArray(r.asset_ids) ? r.asset_ids : [])) {
    if (!aid) continue;
    await conn.query(
      `INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`,
      [riskId, aid]
    );
  }
}

          if (cls === "business" || cls === "both") {
  const { sourceControlId, sourcePolicyId } = resolveSource(it.item_id);

  await conn.query(
    `INSERT INTO business_risks
      (title, description, category, department, owner,
       dueDate, probability, impact, status, treatment,
       mitigationPlan, createdAt, analysis_id, item_id,
       source_control_id, source_policy_id, source_control_key, source_analysis_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?,?,?,?)`,
    [
      intitule, desc, r.categorie || "Operational",
      r.department || user.department, r.owner || user.name,
      r.dueDate || null,
      r.probabilite ?? r.probability ?? 2, r.impact ?? 2,
      "Open", "Mitigate",
      (r.mitigationPlan || remActions.map(x => x.action) || []).join("\n"),
      analysisId, String(it.item_id),
      sourceControlId, sourcePolicyId, it.ref_id || null, analysisId,
    ]
  );
}
        }
      }
    }

    await conn.commit();
    return res.json({
      success: true,
      analysis_id: analysisId,
      global_score: globalScore,
      total_items: scoredCount,
      covered, partial, notCovered, notApplicable,
    });

  } catch (e) {
    await conn.rollback();
    console.error("save analysis error:", e);
    return res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// =====================================================================
// GET /api/analyses — list
// =====================================================================
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.id, a.title, a.document_name, a.standard_id, a.standard_name,
        COALESCE(stats.computed_score,   a.global_score)      AS global_score,
        COALESCE(stats.covered_count,    a.covered_count)     AS covered_count,
        COALESCE(stats.partial_count,    a.partial_count)     AS partial_count,
        COALESCE(stats.not_covered_count,a.not_covered_count) AS not_covered_count,
        COALESCE(stats.total_items,      a.total_items)       AS total_items,
        a.created_by_name,
        a.created_by_organisation, a.created_by_department,
        a.created_at, a.status
      FROM compliance_analyses a
      LEFT JOIN (
        SELECT
          analysis_id,
          ROUND(AVG(
            CASE COALESCE(NULLIF(ciso_status, ''), ai_status)
              WHEN 'Covered'     THEN 100
              WHEN 'Partial'     THEN  50
              WHEN 'Not covered' THEN   0
            END
          )) AS computed_score,
          SUM(CASE WHEN COALESCE(NULLIF(ciso_status, ''), ai_status) = 'Covered'     THEN 1 ELSE 0 END) AS covered_count,
          SUM(CASE WHEN COALESCE(NULLIF(ciso_status, ''), ai_status) = 'Partial'     THEN 1 ELSE 0 END) AS partial_count,
          SUM(CASE WHEN COALESCE(NULLIF(ciso_status, ''), ai_status) = 'Not covered' THEN 1 ELSE 0 END) AS not_covered_count,
          SUM(CASE WHEN COALESCE(NULLIF(ciso_status, ''), ai_status) IN ('Covered','Partial','Not covered') THEN 1 ELSE 0 END) AS total_items
        FROM analysis_items
        WHERE COALESCE(NULLIF(ciso_status, ''), ai_status) <> 'Not applicable'
        GROUP BY analysis_id
      ) stats ON stats.analysis_id = a.id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error("list analyses error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get("/latest", async (_req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM compliance_analyses ORDER BY created_at DESC LIMIT 1`);
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/by-standard", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*
      FROM compliance_analyses a
      INNER JOIN (
        SELECT standard_id, MAX(created_at) AS max_at
        FROM compliance_analyses WHERE standard_id IS NOT NULL
        GROUP BY standard_id
      ) latest ON latest.standard_id = a.standard_id AND latest.max_at = a.created_at
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/assets", async (_req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, intitule, type, Location, owner FROM assets ORDER BY intitule`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================================================================
// GET /api/analyses/:id — full detail (item-centric)
// =====================================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [aRows] = await db.query(`SELECT * FROM compliance_analyses WHERE id = ?`, [id]);
    if (!aRows.length) return res.status(404).json({ error: "Analysis not found" });
    const analysis = aRows[0];

    const [policies]     = await db.query(`SELECT * FROM analysis_policies     WHERE analysis_id = ?`, [id]);
    const [items]        = await db.query(`SELECT * FROM analysis_items        WHERE analysis_id = ?`, [id]);
    const [gaps]         = await db.query(`SELECT * FROM analysis_gaps         WHERE analysis_id = ?`, [id]);
    const [remediations] = await db.query(`SELECT * FROM analysis_remediations WHERE analysis_id = ?`, [id]);
    const [aRisks]       = await db.query(`SELECT * FROM risks                 WHERE analysis_id = ?`, [id]);
    const [bRisks]       = await db.query(`SELECT * FROM business_risks        WHERE analysis_id = ?`, [id]);

    const policyNameById = Object.fromEntries(policies.map(p => [p.id, p.policy_name]));
    const policySummaryById = Object.fromEntries(policies.map(p => [p.id, p.policy_summary]));

    // Re-assemble items[] with per-policy blocks
    const itemsFull = items.map(it => {
      // Recover the policy_assessments JSON from evidence column
      let storedPA = [];
      try { storedPA = JSON.parse(it.evidence || "[]"); } catch {}
      if (!Array.isArray(storedPA)) storedPA = [];

      const blockByName = new Map();
      for (const pa of storedPA) {
        blockByName.set(pa.policy_name, {
          policy_name:    pa.policy_name,
          policy_summary: pa.policy_summary || "",
          status:         pa.status || "Not covered",
          conf:           pa.conf ?? 0,
          comment:        pa.comment || "",
          risks:          [],   // refilled below from DB
          gaps:           [],
          remediation:    "",
          _source:        pa._source || "llm",
        });
      }
      const ensureBlock = (policyId) => {
        const pname = policyNameById[policyId] || "Unknown policy";
        if (!blockByName.has(pname)) {
          blockByName.set(pname, {
            policy_name:    pname,
            policy_summary: policySummaryById[policyId] || "",
            status:         "Not covered",
            conf:           0,
            comment:        "",
            risks: [], gaps: [], remediation: "",
            _source: "llm",
          });
        }
        return blockByName.get(pname);
      };

      // Attach gaps
      for (const g of gaps) {
        if (String(g.item_id) !== String(it.item_id)) continue;
        const blk = ensureBlock(g.policy_id);
        if (g.description) blk.gaps.push(g.description);
      }
      // Attach remediations (concatenated as text)
      for (const r of remediations) {
        if (String(r.item_id) !== String(it.item_id)) continue;
        const blk = ensureBlock(r.policy_id);
        blk.remediation = (blk.remediation ? blk.remediation + "\n" : "") + (r.action || "");
      }
      // Risks attached only by item_id (they don't carry policy_id in
      // current schema; if you added one, switch the filter)
      const itemRisks = aRisks.filter(r => String(r.item_id || "") === String(it.item_id));

      return {
        ...it,
        is_applicable:      it.ai_status !== "Not applicable" && it.ciso_status !== "Not applicable",
        policy_assessments: Array.from(blockByName.values()),
        attached_risks:     itemRisks,
      };
    });

    res.json({
      analysis,
      policies,                 // for backward-compat consumers
      items: itemsFull,         // new item-centric shape
      asset_risks: aRisks,
      business_risks: bRisks,
    });
  } catch (e) {
    console.error("get analysis detail error:", e);
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM compliance_analyses WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;