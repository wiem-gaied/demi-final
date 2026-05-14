// backend/routes/analysisRoutes.js
import express from "express";
import db from "../db.js";

const router = express.Router();

const STATUS_SCORE = { "Covered": 100, "Partial": 50, "Not covered": 0 };

function normalizeText(s) {
  if (!s) return "";
  return String(s).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter(w => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}
function deduplicateRisks(risks, threshold = 0.55) {
  const kept = [];
  for (const r of risks) {
    const desc = r.description || r.intitule || "";
    if (!desc.trim()) continue;
    const dup = kept.find(k => jaccard(k.description || k.intitule || "", desc) >= threshold);
    if (dup) {
      const merge = (a = [], b = []) => Array.from(new Set([...(a||[]), ...(b||[])].filter(Boolean)));
      dup.assets          = merge(dup.assets,          r.assets);
      dup.asset_ids       = merge(dup.asset_ids,       r.asset_ids);
      dup.threats         = merge(dup.threats,         r.threats);
      dup.vulnerabilities = merge(dup.vulnerabilities, r.vulnerabilities);
      dup.mitigationPlan  = merge(dup.mitigationPlan,  r.mitigationPlan);
      dup.impact          = Math.max(dup.impact      ?? 1, r.impact      ?? 1);
      dup.probabilite     = Math.max(dup.probabilite ?? 1, r.probabilite ?? 1);
      if (dup.risk_class !== r.risk_class) dup.risk_class = "both";
    } else {
      kept.push({ ...r });
    }
  }
  return kept;
}

// =====================================================================
// POST /api/analyses — save a finalized analysis
// =====================================================================
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    console.log("✅ ROUTE /api/analyses POST HIT");
    console.log("SESSION USER:", req.session?.user);

    await conn.beginTransaction();

    // ✅ Priority: session > body fallback
    const sessionUser = req.session?.user || {};
    const bodyUser = {
      id:           req.body.created_by_id           || null,
      name:         req.body.created_by_name         || "",
      organisation: req.body.created_by_organisation || "",
      department:   req.body.created_by_department   || "",
    };

    const user = {
      id:           sessionUser.id                                               || bodyUser.id,
      name:         sessionUser.name                                             || bodyUser.name,
      organisation: sessionUser.organization || sessionUser.organisation         || bodyUser.organisation,
      department:   sessionUser.department                                        || bodyUser.department,
    };

    console.log("RESOLVED USER:", user);

    const { title, document_name, standard_id, standard_name, policies = [] } = req.body;

    if (!title) {
      await conn.rollback();
      return res.status(400).json({ error: "Title is required" });
    }

    // KPI roll-up (deduplicate items by item_id across all policies)
    const seenItems = new Map();
    for (const p of policies) {
      for (const it of (p.items || [])) {
        if (it.item_id && !seenItems.has(String(it.item_id))) {
          seenItems.set(String(it.item_id), it);
        }
      }
    }
    const allUniqueItems = Array.from(seenItems.values());

    let covered = 0, partial = 0, notCovered = 0, scoreSum = 0;
    for (const it of allUniqueItems) {
      const finalStatus = it.ciso_status || it.ai_status || "Not covered";
      const sc = STATUS_SCORE[finalStatus] ?? 0;
      scoreSum += sc;
      if (finalStatus === "Covered")      covered++;
      else if (finalStatus === "Partial") partial++;
      else                                notCovered++;
    }
    const total       = allUniqueItems.length;
    const globalScore = total ? Math.round(scoreSum / total) : 0;

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
        globalScore, covered, partial, notCovered, total,
        user.id, user.name, user.organisation, user.department,
        "finalized",
      ]
    );
    const analysisId = aRes.insertId;

    // POLICIES LOOP
    for (const p of policies) {
      const pItems = p.items || [];
      let pSum = 0;
      for (const it of pItems) {
        const fs = it.ciso_status || it.ai_status || "Not covered";
        pSum += STATUS_SCORE[fs] ?? 0;
      }
      const pScore  = pItems.length ? Math.round(pSum / pItems.length) : 0;
      const pStatus = pScore >= 80 ? "Covered" : pScore >= 30 ? "Partial" : "Not covered";

      const [pRes] = await conn.query(
        `INSERT INTO analysis_policies (analysis_id, policy_name, policy_summary, policy_score, status)
         VALUES (?,?,?,?,?)`,
        [analysisId, p.policy_name || "Unnamed policy", p.policy_summary || "", pScore, pStatus]
      );
      const policyId = pRes.insertId;

      for (const it of pItems) {
        const fs = it.ciso_status || it.ai_status || "Not covered";
        await conn.query(
          `INSERT INTO analysis_items
            (analysis_id, policy_id, item_id, ref_id, title, type,
             ai_status, ai_confidence, ciso_status, ciso_comment, score, evidence)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            analysisId, policyId,
            String(it.item_id || ""), it.ref_id || "", it.title || "",
            it.type || "annex_control", it.ai_status || "Not covered",
            it.ai_confidence || 0, it.ciso_status || null, it.ciso_comment || "",
            STATUS_SCORE[fs] ?? 0, JSON.stringify(it.evidence || []),
          ]
        );
      }

      for (const g of (p.gaps || [])) {
        if (!g || !String(g).trim()) continue;
        await conn.query(
          `INSERT INTO analysis_gaps (analysis_id, policy_id, description) VALUES (?,?,?)`,
          [analysisId, policyId, String(g)]
        );
      }

      for (const r of (p.remediations || [])) {
        if (!r?.action) continue;
        await conn.query(
          `INSERT INTO analysis_remediations
            (analysis_id, policy_id, action, priority, due_date, assigned_to)
           VALUES (?,?,?,?,?,?)`,
          [analysisId, policyId, r.action, r.priority || "Medium", r.due_date || null, r.assigned_to || ""]
        );
      }

      const dedupedRisks = deduplicateRisks(p.risks || []);
      for (const risk of dedupedRisks) {
        if (!risk?.intitule && !risk?.description) continue;
        const intitule    = (risk.intitule || (risk.description || "").slice(0, 100)).trim();
        const description = risk.description || "";
        const cls         = risk.risk_class || "asset";

        if (cls === "asset" || cls === "both") {
          const [rRes] = await conn.query(
            `INSERT INTO risks
              (intitule, categorie, source, owner, description,
               impact, probabilite, statut, dueDate, analysis_id, risk_class)
             VALUES (?,?,?,?,?,?,?,?,?,?,'asset')`,
            [
              intitule, risk.categorie || "Information Security",
              `AI Analysis #${analysisId}`, risk.owner || user.name, description,
              risk.impact ?? 2, risk.probabilite ?? 2, "Open", risk.dueDate || null, analysisId,
            ]
          );
          const riskId = rRes.insertId;
          for (const m of (risk.mitigationPlan || [])) {
            if (!m) continue;
            await conn.query(
              `INSERT INTO mitigation_plans (risk_id, action, priority, status, due_date) VALUES (?,?,?,?,?)`,
              [riskId, m, "Medium", "Open", risk.dueDate || null]
            );
          }
          for (const aid of (Array.isArray(risk.asset_ids) ? risk.asset_ids : [])) {
            if (!aid) continue;
            await conn.query(`INSERT IGNORE INTO risk_assets (risk_id, asset_id) VALUES (?,?)`, [riskId, aid]);
          }
        }

        if (cls === "business" || cls === "both") {
          await conn.query(
            `INSERT INTO business_risks
              (title, description, category, department, owner,
               dueDate, probability, impact, status, treatment,
               mitigationPlan, createdAt, analysis_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),?)`,
            [
              intitule, description, risk.categorie || "Operational",
              risk.department || user.department, risk.owner || user.name,
              risk.dueDate || null, risk.probabilite ?? 2, risk.impact ?? 2,
              "Open", "Mitigate", (risk.mitigationPlan || []).join("\n"), analysisId,
            ]
          );
        }
      }
    }

    await conn.commit();
    return res.json({ success: true, analysis_id: analysisId, global_score: globalScore, total_items: total, covered, partial, notCovered });

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
// ✅ Now includes created_by_organisation and created_by_department
// =====================================================================
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, title, document_name, standard_id, standard_name,
             global_score, covered_count, partial_count, not_covered_count,
             total_items, created_by_name,
             created_by_organisation, created_by_department,
             created_at, status
      FROM compliance_analyses
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error("list analyses error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// GET /api/analyses/latest
// =====================================================================
router.get("/latest", async (_req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM compliance_analyses ORDER BY created_at DESC LIMIT 1`);
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================================================================
// GET /api/analyses/by-standard
// =====================================================================
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

// =====================================================================
// GET /api/analyses/assets
// =====================================================================
router.get("/assets", async (_req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, intitule, type, Location, owner FROM assets ORDER BY intitule`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =====================================================================
// GET /api/analyses/:id — full detail
// =====================================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ SELECT * includes created_by_organisation + created_by_department
    const [aRows] = await db.query(`SELECT * FROM compliance_analyses WHERE id = ?`, [id]);
    if (!aRows.length) return res.status(404).json({ error: "Analysis not found" });
    const analysis = aRows[0];

    const [policies]     = await db.query(`SELECT * FROM analysis_policies     WHERE analysis_id = ?`, [id]);
    const [items]        = await db.query(`SELECT * FROM analysis_items        WHERE analysis_id = ?`, [id]);
    const [gaps]         = await db.query(`SELECT id, analysis_id, policy_id, description FROM analysis_gaps WHERE analysis_id = ?`, [id]);
    const [remediations] = await db.query(`SELECT * FROM analysis_remediations WHERE analysis_id = ?`, [id]);
    const [aRisks]       = await db.query(`SELECT * FROM risks                 WHERE analysis_id = ?`, [id]);
    const [bRisks]       = await db.query(`SELECT * FROM business_risks        WHERE analysis_id = ?`, [id]);

    const gapsByPolicy = {};
    for (const g of gaps) {
      if (!gapsByPolicy[g.policy_id]) gapsByPolicy[g.policy_id] = [];
      gapsByPolicy[g.policy_id].push(g.description);
    }

    const policiesFull = policies.map(p => ({
      ...p,
      items:        items.filter(it => Number(it.policy_id) === Number(p.id)),
      gaps:         gapsByPolicy[p.id] || [],
      remediations: remediations.filter(r => Number(r.policy_id) === Number(p.id)),
    }));

    res.json({ analysis, policies: policiesFull, asset_risks: aRisks, business_risks: bRisks });
  } catch (e) {
    console.error("get analysis detail error:", e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================================
// DELETE /api/analyses/:id
// =====================================================================
router.delete("/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM compliance_analyses WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;