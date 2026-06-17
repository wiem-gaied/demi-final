import express from "express";
import db from "../db.js";
import { activityLogger } from "../middlewares/activityLogger.js";

const router = express.Router();
router.post("/", activityLogger("ADD_risk"), async (req, res) => {
  try {
    const {
      intitule, categorie, actif, source, owner, description,
      MitigationPlan, dueDate, impact, probabilite,
      assets, threats, vulnerabilities,
    } = req.body;

    // 1. Insert risk (set inherent = current at creation time)
    const [result] = await db.query(
      `INSERT INTO risks
      (intitule, categorie, actif, source, owner, description, dueDate, impact, probabilite, statut,
       inherent_impact, inherent_probabilite, treatment_strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [intitule, categorie, actif, source, owner, description, dueDate,
       impact, probabilite, "Open", impact, probabilite, "Mitigate"]
    );
    const riskId = result.insertId;

    // 2. Assets
    if (assets?.length) {
      for (const assetId of assets) {
        await db.query(
          `INSERT INTO risk_assets (risk_id, asset_id) VALUES (?, ?)`,
          [riskId, assetId]
        );
      }
    }

    // 3. Mitigation
    if (MitigationPlan?.length) {
      for (const action of MitigationPlan) {
        if (action.trim() !== "") {
          await db.query(
            `INSERT INTO mitigation_plans
            (risk_id, action, priority, status, progress, due_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [riskId, action, "Medium", "Open", 0, dueDate]
          );
        }
      }
    }

    // 4. THREATS
    if (threats?.length) {
      for (const t of threats) {
        if (!t.name) continue;
        const [existing] = await db.query(
          `SELECT id FROM threats WHERE name = ?`, [t.name]);
        let threatId;
        if (existing.length > 0) {
          threatId = existing[0].id;
        } else {
          const [thrResult] = await db.query(
            `INSERT INTO threats (name) VALUES (?)`, [t.name]);
          threatId = thrResult.insertId;
        }
        await db.query(
          `INSERT INTO risk_threats (risk_id, threat_id) VALUES (?, ?)`,
          [riskId, threatId]
        );
      }
    }

    // 5. VULNERABILITIES
    if (vulnerabilities?.length) {
      for (const v of vulnerabilities) {
        if (!v.name) continue;
        const [existing] = await db.query(
          `SELECT id FROM vulnerabilities WHERE name = ?`, [v.name]);
        let vulnId;
        if (existing.length > 0) {
          vulnId = existing[0].id;
        } else {
          const [vulnResult] = await db.query(
            `INSERT INTO vulnerabilities (name) VALUES (?)`, [v.name]);
          vulnId = vulnResult.insertId;
        }
        await db.query(
          `INSERT INTO risk_vulnerabilities (risk_id, vulnerability_id) VALUES (?, ?)`,
          [riskId, vulnId]
        );
      }
    }

    res.status(201).json({ message: "Risk created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/getrisks", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM risks");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:id", activityLogger("DELETE_risk", { table: "risks", nameColumn: "intitule" }), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("DELETE FROM risks where id= ?", [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  try {
    const [rows] = await db.query(
      "UPDATE risks SET statut = ? WHERE id = ?", [statut, id]);
    res.json({ id, statut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ============================================================
// IMPORT FROM AI (existant, inchangé)
// ============================================================
router.post("/import-from-ai", activityLogger("IMPORT_AI_RISK"), async (req, res) => {
  try {
    const { analysisResults, controlId, policyId, analysisId, sourceReport } = req.body;
    const importedRisks = [];

    for (const [controlKey, controlData] of Object.entries(analysisResults)) {
      if (controlData.status === "Covered") continue;

      const category    = determineCategory(controlKey);
      const { impact, probability } = assessRiskLevel(controlData);
      const intitule    = buildIntitule(controlKey, controlData);
      const description = buildDescription(controlData, controlKey, sourceReport);
      const owner       = "Security Team";
      const dueDate     = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // ── Insert risk WITH traceability columns ───────────────────────
      const [riskResult] = await db.query(
        `INSERT INTO risks
         (intitule, categorie, actif, source, description, impact, probabilite, statut, owner, dueDate,
          inherent_impact, inherent_probabilite, treatment_strategy,
          source_control_id, source_policy_id, source_control_key, source_analysis_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [intitule, category, null, "IA Audit", description, impact, probability, "Open", owner, dueDate,
         impact, probability, "Mitigate",
         controlId ? String(controlId) : null,
         policyId  || null,
         controlKey || null,
         analysisId || null]
      );
      const riskId = riskResult.insertId;

      // ── Threats ─────────────────────────────────────────────────────
      if (controlData.threats?.length) {
        for (const threatName of controlData.threats) {
          if (threatName && threatName.trim()) await addThreatToRisk(riskId, threatName);
        }
      } else if (controlData.gaps?.length) {
        await addThreatToRisk(riskId, `Non-conformité: ${controlData.gaps[0].substring(0, 200)}`);
      }

      // ── Auto-link control (only if ciso_controls.id is valid) ───────
      if (controlId) {
        try {
          const cid = String(controlId);
          const [[exists]] = await db.query(`SELECT id FROM ciso_controls WHERE id = ?`, [cid]);
          if (exists) {
            const effectiveness =
              controlData.status === "Partial" ? "Partial" :
              controlData.status === "Not covered" ? "Ineffective" : "Partial";
            await db.query(
              `INSERT IGNORE INTO risk_controls (risk_id, control_id, effectiveness, notes)
               VALUES (?, ?, ?, ?)`,
              [riskId, cid, effectiveness,
               `Auto-linked from AI analysis — ${controlData.status} (${controlData.compliance_percentage}%)`]
            );
          }
        } catch (e) { console.error("Auto-link control failed:", e.message); }
      }

      // ── Auto-link policy ────────────────────────────────────────────
      if (policyId) {
        try {
          await db.query(
            `INSERT IGNORE INTO risk_policies (risk_id, policy_id) VALUES (?, ?)`,
            [riskId, policyId]
          );
        } catch (e) { console.error("Auto-link policy failed:", e.message); }
      }

      // ── Metadata trace (toujours, même si auto-link échoue) ─────────
      try {
        await db.query(
          `INSERT INTO risk_ia_metadata
             (risk_id, control_id, policy_id, control_key, compliance_score)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             control_id       = VALUES(control_id),
             policy_id        = VALUES(policy_id),
             control_key      = VALUES(control_key),
             compliance_score = VALUES(compliance_score)`,
          [riskId, controlId ? String(controlId) : null, policyId || null,
           controlKey || null, controlData.compliance_percentage || null]
        );
      } catch (e) { console.error("Metadata insert failed:", e.message); }

      importedRisks.push({ id: riskId, control: controlKey, status: controlData.status, intitule });
    }

    res.status(201).json({
      message: `${importedRisks.length} risque(s) importé(s) depuis l'analyse IA`,
      risks: importedRisks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'import IA: " + err.message });
  }
});

async function addThreatToRisk(riskId, threatName) {
  threatName = threatName.trim().substring(0, 255);
  if (!threatName) return;
  const [existing] = await db.query(`SELECT id FROM threats WHERE name = ?`, [threatName]);
  let threatId;
  if (existing.length > 0) {
    threatId = existing[0].id;
  } else {
    const [result] = await db.query(`INSERT INTO threats (name) VALUES (?)`, [threatName]);
    threatId = result.insertId;
  }
  await db.query(`INSERT INTO risk_threats (risk_id, threat_id) VALUES (?, ?)`, [riskId, threatId]);
}

async function storeAIRiskMetadata(riskId, controlId, policyId, complianceScore) {
  try {
    await db.query(
      `INSERT INTO risk_ia_metadata (risk_id, control_id, policy_id, compliance_score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       control_id = VALUES(control_id),
       policy_id = VALUES(policy_id),
       compliance_score = VALUES(compliance_score)`,
      [riskId, controlId, policyId, complianceScore]
    );
  } catch (err) {
    console.log("Note: Table risk_ia_metadata non créée, métadonnées non stockées");
  }
}

function determineCategory(controlId) {
  const categoryMap = {
    "5.1": "Governance", "5.2": "Policy", "5.3": "Organization",
    "6.1": "Risk Management", "6.2": "Objectives",
    "7.1": "Resources", "7.2": "Competence", "7.3": "Awareness",
    "7.4": "Communication", "7.5": "Documentation",
    "8.1": "Operations", "9.1": "Monitoring", "9.2": "Internal Audit",
    "9.3": "Management Review", "10.1": "Improvement", "10.2": "Corrective Action"
  };
  for (const [prefix, category] of Object.entries(categoryMap)) {
    if (controlId.startsWith(prefix)) return category;
  }
  return "Information Security";
}

function assessRiskLevel(controlData) {
  const complianceScore = controlData.compliance_percentage || 50;
  let impact, probability;
  if (complianceScore < 30) { impact = 4; probability = 4; }
  else if (complianceScore < 60) { impact = 3; probability = 3; }
  else if (complianceScore < 80) { impact = 2; probability = 2; }
  else { impact = 1; probability = 1; }
  return { impact, probability };
}

function buildIntitule(controlKey, controlData) {
  const statusEmoji = { "Not covered": "🔴", "Partial": "🟡", "Covered": "🟢" };
  const emoji = statusEmoji[controlData.status] || "⚪";
  const titleMap = {
    "5.1": "Leadership et engagement", "5.2": "Politique de sécurité",
    "5.3": "Rôles et responsabilités", "6.1": "Actions face aux risques",
    "6.2": "Objectifs de sécurité"
  };
  const baseTitle = titleMap[controlKey] || `Contrôle ${controlKey}`;
  return `${emoji} ${baseTitle} - ${controlData.status} (${controlData.compliance_percentage}%)`;
}

function buildDescription(controlData, controlKey, sourceReport) {
  const parts = [
    `**Contrôle:** ${controlKey}`,
    `**Statut de conformité:** ${controlData.status}`,
    `**Score:** ${controlData.compliance_percentage}%`,
    ``, `**Écarts identifiés (gaps):**`,
    ...(controlData.gaps?.length ? controlData.gaps.map(g => `- ${g}`) : ["- Aucun écart spécifique"]),
    ``, `**Recommandation d'atténuation:**`,
    `${controlData.remediation || "À définir"}`,
    ``, `**Risques associés:**`,
    ...(controlData.threats?.length ? controlData.threats.map(t => `- ${t}`) : ["- Non spécifié"]),
    ``, `**Source:** Analyse IA du rapport "${sourceReport}"`,
    `**Date analyse:** ${new Date().toLocaleString()}`
  ];
  return parts.join("\n");
}

router.get("/getrisks-with-threats", async (req, res) => {
  try {
    const query = `
      SELECT r.*,
        GROUP_CONCAT(DISTINCT t.name) as threats,
        GROUP_CONCAT(DISTINCT a.intitule) as assets
      FROM risks r
      LEFT JOIN risk_threats rt ON r.id = rt.risk_id
      LEFT JOIN threats t ON rt.threat_id = t.id
      LEFT JOIN risk_assets ra ON r.id = ra.risk_id
      LEFT JOIN assets a ON ra.asset_id = a.id
      GROUP BY r.id
      ORDER BY r.created_at DESC`;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ============================================================
// RISK MONITORING — NOUVEAUX ENDPOINTS
// ============================================================

function currentUserName(req) {
  return req.session?.user?.name || req.session?.user?.email || "system";
}

async function logRiskChange(riskId, userName, action, field, oldVal, newVal, note) {
  try {
    await db.query(
      `INSERT INTO risk_history (risk_id, user_name, action, field_changed, old_value, new_value, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [riskId, userName, action, field,
       oldVal != null ? String(oldVal) : null,
       newVal != null ? String(newVal) : null,
       note || null]
    );
  } catch (e) {
    console.error("logRiskChange failed:", e.message);
  }
}

// ---- GET full details of a risk -----------------------------
// Helpers d'affichage propre
const cleanChapterRef = (s) => {
  if (!s) return null;
  const parts = String(s).split("_");
  return parts[parts.length - 1];  // "u48_..._c_16_9.2" → "9.2"
};

const cleanStandard = (s) => {
  if (!s) return null;
  const stripped = String(s).replace(/^u\d+_intuitem_risk_library_/, "");
  const parts = stripped.split("_");
  if (parts[0] && /^iso\d+$/i.test(parts[0])) {
    const num = parts[0].replace(/^iso/i, "");
    return parts[1] ? `ISO ${num}:${parts[1]}` : `ISO ${num}`;
  }
  return parts.join(" ").toUpperCase();
};

router.get("/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    const [[risk]] = await db.query(`SELECT * FROM risks WHERE id = ?`, [id]);
    if (!risk) return res.status(404).json({ error: "Risk not found" });

    const [assets] = await db.query(
      `SELECT a.id, a.intitule FROM risk_assets ra
       JOIN assets a ON a.id = ra.asset_id WHERE ra.risk_id = ?`, [id]);

    const [threats] = await db.query(
      `SELECT t.id, t.name FROM risk_threats rt
       JOIN threats t ON t.id = rt.threat_id WHERE rt.risk_id = ?`, [id]);

    const [vulnerabilities] = await db.query(
      `SELECT v.id, v.name FROM risk_vulnerabilities rv
       JOIN vulnerabilities v ON v.id = rv.vulnerability_id WHERE rv.risk_id = ?`, [id]);

    const [mitigations] = await db.query(
      `SELECT id, action, priority, status, progress, due_date, assigned_to
         FROM mitigation_plans WHERE risk_id = ? ORDER BY id`, [id]);

    // ─── CONTROLS (lookup propre avec extraction des refs) ───
    const [controlsRaw] = await db.query(
      `SELECT rc.id AS link_id, rc.control_id, rc.effectiveness, rc.notes, rc.linked_at,
              cc.description,
              cc.core_chapter_id,
              cc.standard_id,
              SUBSTRING_INDEX(cc.id, '_', -1)              AS control_ref
         FROM risk_controls rc
         JOIN ciso_controls cc ON cc.id = rc.control_id
        WHERE rc.risk_id = ?`, [id]);

    const controls = controlsRaw.map(c => ({
      link_id:       c.link_id,
      control_id:    c.control_id,
      effectiveness: c.effectiveness,
      notes:         c.notes,
      linked_at:     c.linked_at,
      title:         `${c.control_ref} — ${(c.description || "").slice(0, 120)}`.trim(),
      description:   c.description,
      chapter_title: cleanChapterRef(c.core_chapter_id),
      package_title: cleanStandard(c.standard_id),
    }));

    // ─── POLICIES ───
    const [policies] = await db.query(
      `SELECT rp.id AS link_id, rp.policy_id, rp.linked_at,
              i.title, i.description,
              c.title AS chapter_title, p.title AS package_title
         FROM risk_policies rp
         JOIN items i      ON i.id = rp.policy_id
    LEFT JOIN chapters c   ON c.id = i.chapter_id
    LEFT JOIN packages p   ON p.id = c.package_id
        WHERE rp.risk_id = ?`, [id]);

    const [history] = await db.query(
      `SELECT id, user_name, action, field_changed, old_value, new_value, note, changed_at
         FROM risk_history WHERE risk_id = ? ORDER BY changed_at DESC LIMIT 100`, [id]);

    // ─── FALLBACK auto-detect depuis source_control_id si risk_controls vide ───
    // Fallback : si pas de risk_controls, essaie ciso_controls, sinon parse l'item_id
if (controls.length === 0 && risk.source_control_id) {
  const [[srcCtrl]] = await db.query(
    `SELECT cc.id AS control_id, cc.description, cc.core_chapter_id, cc.standard_id,
            SUBSTRING_INDEX(cc.id, '_', -1) AS control_ref
       FROM ciso_controls cc WHERE cc.id = ?`, [risk.source_control_id]);
  if (srcCtrl) {
    controls.push({
      link_id: null,
      control_id: srcCtrl.control_id,
      effectiveness: "Partial",
      title: `${srcCtrl.control_ref} — ${(srcCtrl.description || "").slice(0, 120)}`.trim(),
      chapter_title: cleanChapterRef(srcCtrl.core_chapter_id),
      package_title: cleanStandard(srcCtrl.standard_id),
      auto_inferred: true,
    });
  }
}

// Si l'item est un chapitre (item_id avec `_c_` mais pas `_cc_`), affiche-le tel quel
if (controls.length === 0 && risk.item_id && /_c_\d+_[\d.]+$/.test(risk.item_id)) {
  const ref = risk.item_id.split("_").pop();   // "5.2"
  controls.push({
    link_id: null,
    control_id: risk.item_id,
    effectiveness: "—",
    title: `Chapter ${ref}`,
    chapter_title: ref,
    package_title: cleanStandard(risk.item_id.replace(/__c_.*/, "")),
    auto_inferred: true,
    is_chapter: true,
  });
}
    if (policies.length === 0 && risk.source_policy_name) {
  // Optionnel : trouve le summary depuis analysis_policies
  let summary = "";
  if (risk.source_analysis_id) {
    const [[ap]] = await db.query(
      `SELECT policy_summary FROM analysis_policies
        WHERE analysis_id = ? AND policy_name = ? LIMIT 1`,
      [risk.source_analysis_id, risk.source_policy_name]
    );
    summary = ap?.policy_summary || "";
  }
  policies.push({
    link_id: null,
    policy_id: null,
    title: risk.source_policy_name,
    description: summary,
    chapter_title: null,
    package_title: "From document analysis",
    auto_inferred: true,
  });
}

    if (policies.length === 0 && risk.source_policy_id) {
      const [[srcPol]] = await db.query(
        `SELECT i.id AS policy_id, i.title, i.description,
                c.title AS chapter_title, p.title AS package_title
           FROM items i
      LEFT JOIN chapters c ON c.id = i.chapter_id
      LEFT JOIN packages p ON p.id = c.package_id
          WHERE i.id = ?`, [risk.source_policy_id]);
      if (srcPol) {
        policies.push({ link_id: null, ...srcPol, auto_inferred: true });
      }
    }

    // ─── UN SEUL res.json ───
    res.json({ ...risk, assets, threats, vulnerabilities, mitigations, controls, policies, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ---- Lookup endpoints for picker dropdowns -------------------
router.get("/lookup/controls", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cc.id,
              cc.description,
              SUBSTRING_INDEX(cc.id, '_', -1)              AS control_ref,
              cc.core_chapter_id,
              cc.standard_id
         FROM ciso_controls cc
        ORDER BY cc.standard_id, cc.core_chapter_id, cc.id`);
    res.json(rows.map(r => ({
      id:            r.id,
      title:         `${r.control_ref} — ${(r.description || "").slice(0, 100)}`.trim(),
      chapter_title: cleanChapterRef(r.core_chapter_id),
      package_title: cleanStandard(r.standard_id),
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.get("/lookup/policies", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.id, i.title, i.description,
              c.title AS chapter_title, p.title AS package_title
         FROM items i
    LEFT JOIN chapters c ON c.id = i.chapter_id
    LEFT JOIN packages p ON p.id = c.package_id
        WHERE i.type = 'policy'
        ORDER BY p.title, c.title, i.id`);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

// ---- Link / update / unlink CONTROLS -------------------------
router.post("/:id/controls", async (req, res) => {
  try {
    const { id } = req.params;
    const { control_id, effectiveness = "Partial", notes = null } = req.body;
    if (!control_id) return res.status(400).json({ error: "control_id required" });
    const cid = String(control_id);
    const [r] = await db.query(
      `INSERT IGNORE INTO risk_controls (risk_id, control_id, effectiveness, notes)
       VALUES (?, ?, ?, ?)`, [id, cid, effectiveness, notes]);
    const [[ctrl]] = await db.query(
      `SELECT COALESCE(NULLIF(name, 'Untitled'), ref_id) AS title
         FROM ciso_controls WHERE id = ?`, [cid]);
    await logRiskChange(id, currentUserName(req), "LINK_CONTROL", "controls",
      null, ctrl?.title || `#${cid}`, `effectiveness=${effectiveness}`);
    res.status(201).json({ link_id: r.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.patch("/:id/controls/:linkId", async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { effectiveness, notes } = req.body;
    const [[before]] = await db.query(
      `SELECT effectiveness FROM risk_controls WHERE id = ? AND risk_id = ?`, [linkId, id]);
    if (!before) return res.status(404).json({ error: "Link not found" });
    await db.query(
      `UPDATE risk_controls SET effectiveness = COALESCE(?, effectiveness),
                                notes = COALESCE(?, notes)
        WHERE id = ? AND risk_id = ?`,
      [effectiveness ?? null, notes ?? null, linkId, id]);
    if (effectiveness && effectiveness !== before.effectiveness) {
      await logRiskChange(id, currentUserName(req), "UPDATE_CONTROL", "control_effectiveness",
        before.effectiveness, effectiveness, `link=${linkId}`);
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/:id/controls/:linkId", async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const [[link]] = await db.query(
      `SELECT rc.control_id,
              COALESCE(NULLIF(cc.name, 'Untitled'), cc.ref_id) AS title
         FROM risk_controls rc
         JOIN ciso_controls cc ON cc.id = rc.control_id
        WHERE rc.id = ? AND rc.risk_id = ?`, [linkId, id]);
    await db.query(`DELETE FROM risk_controls WHERE id = ? AND risk_id = ?`, [linkId, id]);
    if (link) {
      await logRiskChange(id, currentUserName(req), "UNLINK_CONTROL", "controls",
        link.title, null, null);
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

// ---- Link / unlink POLICIES ----------------------------------
router.post("/:id/policies", async (req, res) => {
  try {
    const { id } = req.params;
    const { policy_id } = req.body;
    if (!policy_id) return res.status(400).json({ error: "policy_id required" });
    const [r] = await db.query(
      `INSERT IGNORE INTO risk_policies (risk_id, policy_id) VALUES (?, ?)`,
      [id, policy_id]);
    const [[pol]] = await db.query(`SELECT title FROM items WHERE id = ?`, [policy_id]);
    await logRiskChange(id, currentUserName(req), "LINK_POLICY", "policies",
      null, pol?.title || `#${policy_id}`, null);
    res.status(201).json({ link_id: r.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/:id/policies/:linkId", async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const [[link]] = await db.query(
      `SELECT rp.policy_id, i.title FROM risk_policies rp
       JOIN items i ON i.id = rp.policy_id
       WHERE rp.id = ? AND rp.risk_id = ?`, [linkId, id]);
    await db.query(`DELETE FROM risk_policies WHERE id = ? AND risk_id = ?`, [linkId, id]);
    if (link) {
      await logRiskChange(id, currentUserName(req), "UNLINK_POLICY", "policies",
        link.title, null, null);
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

// ---- Generic PATCH on risk (residual, treatment, appetite…) --
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
        const allowed = ["impact", "probabilite", "inherent_impact", "inherent_probabilite",
                     "treatment_strategy", "risk_appetite", "last_review_date",
                     "next_review_date", "owner", "dueDate", "description",
                     "categorie", "source", "statut",
                     "transfer_provider", "transfer_contract_ref",
                     "transfer_type", "transfer_expiry_date"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No fields to update" });

    const [[before]] = await db.query(`SELECT * FROM risks WHERE id = ?`, [id]);
    if (!before) return res.status(404).json({ error: "Risk not found" });

    const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(", ");
    const values = Object.values(updates);
    await db.query(`UPDATE risks SET ${setClause} WHERE id = ?`, [...values, id]);

    const user = currentUserName(req);
    for (const [k, v] of Object.entries(updates)) {
      if (String(before[k] ?? "") !== String(v ?? "")) {
        await logRiskChange(id, user, "UPDATE", k, before[k], v, null);
      }
    }
    const [[after]] = await db.query(`SELECT * FROM risks WHERE id = ?`, [id]);
    res.json(after);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

// ---- Mitigation plans: add / update / delete -----------------
router.post("/:id/mitigations", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, priority = "Medium", status = "Open", progress = 0,
            due_date = null, assigned_to = null } = req.body;
    if (!action) return res.status(400).json({ error: "action required" });
    const [r] = await db.query(
      `INSERT INTO mitigation_plans (risk_id, action, priority, status, progress, due_date, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, action, priority, status, progress, due_date, assigned_to]);
    await logRiskChange(id, currentUserName(req), "ADD_MITIGATION", "mitigation",
      null, action, null);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.patch("/:id/mitigations/:mitId", async (req, res) => {
  try {
    const { id, mitId } = req.params;
    const allowed = ["action", "priority", "status", "progress", "due_date", "assigned_to"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No fields" });
    const [[before]] = await db.query(
      `SELECT * FROM mitigation_plans WHERE id = ? AND risk_id = ?`, [mitId, id]);
    if (!before) return res.status(404).json({ error: "Mitigation not found" });
    const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(", ");
    await db.query(
      `UPDATE mitigation_plans SET ${setClause} WHERE id = ? AND risk_id = ?`,
      [...Object.values(updates), mitId, id]);
    const user = currentUserName(req);
    for (const [k, v] of Object.entries(updates)) {
      if (String(before[k] ?? "") !== String(v ?? "")) {
        await logRiskChange(id, user, "UPDATE_MITIGATION", `mitigation.${k}`,
          before[k], v, `mitigation_id=${mitId}`);
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

router.delete("/:id/mitigations/:mitId", async (req, res) => {
  try {
    const { id, mitId } = req.params;
    const [[m]] = await db.query(
      `SELECT action FROM mitigation_plans WHERE id = ? AND risk_id = ?`, [mitId, id]);
    await db.query(`DELETE FROM mitigation_plans WHERE id = ? AND risk_id = ?`, [mitId, id]);
    if (m) await logRiskChange(id, currentUserName(req), "DELETE_MITIGATION", "mitigation",
      m.action, null, null);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur" }); }
});

export default router;