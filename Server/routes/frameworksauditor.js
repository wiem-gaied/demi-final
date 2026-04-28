//frameworksauditor.js
import express from "express";
import db from "../db.js";
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware d'authentification intégré
const authenticateToken = (req, res, next) => {
    // Pour le développement - utiliser un utilisateur par défaut
    // À MODIFIER EN PRODUCTION
    if (process.env.NODE_ENV === 'development' || !process.env.JWT_SECRET) {
        req.user = { id: 1, email: 'dev@example.com' };
        return next();
    }
    
    // Version production avec token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to get user ID from token
const getUserId = async (req) => {
    try {
        // If authenticateToken middleware already added user to req
        if (req.user && req.user.id) {
            return req.user.id;
        }
        
        // For development - remove in production
        return 1; // Default user ID for testing
    } catch (error) {
        console.error("Error getting user ID:", error);
        return 1; // Default fallback for development
    }
};

// ============================================================
// GET ALL AVAILABLE FRAMEWORKS (SCRAPED + CUSTOM)
// ============================================================
router.get("/packages", async (req, res) => {
    try {
        const [standards] = await db.query(`
            SELECT 
                id,
                name,
                version,
                provider,
                description,
                (SELECT COUNT(*) FROM ciso_controls WHERE standard_id = standards.id) as controls_count
            FROM ciso_standards
            ORDER BY name
        `);
        
        res.json(standards);
        
    } catch (err) {
        console.error("Error fetching packages:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET FRAMEWORK HIERARCHY - Version corrigée (sans doublon)
// ============================================================
router.get("/packages/:id/hierarchy", async (req, res) => {
    const { id } = req.params;
    
    try {
        // Vérifier d'abord si le standard existe
        const [standardCheck] = await db.query(
            `SELECT id, name FROM ciso_standards WHERE id = ?`,
            [id]
        );
        
        if (standardCheck.length === 0) {
            return res.status(404).json({ error: "Standard not found" });
        }
        
        // Récupérer les Core Chapters (chapitres structurels sans contrôles)
        const [coreChapters] = await db.query(`
            SELECT 
                id,
                title,
                description,
                ref_id as ref,
                display_order,
                level,
                parent_id
            FROM ciso_core_chapters
            WHERE standard_id = ?
            ORDER BY display_order ASC, ref_id ASC
        `, [id]);
        
        // Récupérer les Families (ANNEX A - Organisational controls, etc.)
        const [families] = await db.query(`
            SELECT 
                id,
                ref_id,
                name,
                description,
                display_order
            FROM ciso_families
            WHERE standard_id = ?
            ORDER BY display_order ASC, ref_id ASC
        `, [id]);
        
        // Récupérer tous les contrôles
        const [controls] = await db.query(`
            SELECT 
                id,
                ref_id,
                name,
                description,
                family_id,
                implementation_guidance
            FROM ciso_controls
            WHERE standard_id = ?
            ORDER BY ref_id ASC, id ASC
        `, [id]);
        
        // Construire la hiérarchie
        const hierarchy = [];
        
        // === 1. Core Chapters (structure sans contrôles) ===
        if (coreChapters && coreChapters.length > 0) {
            // Fonction pour construire l'arbre des core chapters
            const buildChapterTree = (parentId = null) => {
                return coreChapters
                    .filter(c => {
                        if (parentId === null) return !c.parent_id || c.parent_id === '';
                        return c.parent_id === parentId;
                    })
                    .map(ch => ({
                        id: ch.id,
                        ref_id: ch.ref,
                        title: ch.title,
                        description: ch.description || "",
                        type: "core_chapter",
                        children: buildChapterTree(ch.id),
                        items: []
                    }));
            };
            
            const coreTree = buildChapterTree();
            
            if (coreTree.length > 0) {
                hierarchy.push({
                    id: "core_section",
                    title: "Core Chapters",
                    description: "Main framework structure chapters",
                    type: "core_section",
                    isAnnex: false,
                    children: coreTree,
                    items: []
                });
            }
        }
        
        // === 2. Annex Families (A.5, A.6, etc.) AVEC leurs contrôles ===
        if (families && families.length > 0) {
            for (const family of families) {
                // Debug: log ce qu'on reçoit
                console.log(`Processing family:`, { ref_id: family.ref_id, name: family.name });
                
                // Nettoyer le nom pour éviter les doublons
                let cleanName = family.name || "";
                
                // Si le name contient déjà le ref_id (ex: "A.5 Organisational controls" ou "A.5 - Organisational controls")
                if (family.ref_id && cleanName.includes(family.ref_id)) {
                    // Garder le nom tel quel mais enlever le tiret et espace si présent
                    cleanName = cleanName.replace(`${family.ref_id} - `, '').replace(`${family.ref_id} `, '');
                }
                
                // Créer le titre final
                let displayTitle;
                if (family.ref_id) {
                    displayTitle = `${family.ref_id} - ${cleanName}`;
                } else {
                    displayTitle = cleanName;
                }
                
                // Récupérer les contrôles de cette famille
                const familyControls = controls.filter(c => c.family_id === family.id);
                
                hierarchy.push({
                    id: family.id,
                    ref_id: family.ref_id,
                    title: displayTitle,
                    original_name: family.name, // Pour debug
                    description: family.description || "",
                    type: "annex_family",
                    isAnnex: true,
                    children: [],
                    items: familyControls.map(control => ({
                        id: control.id,
                        ref_id: control.ref_id,
                        name: control.name,
                        description: control.description || "",
                        guidance: control.implementation_guidance
                    }))
                });
            }
        }
        
        // === 3. Fallback: Si pas de familles ===
        if (hierarchy.length === 0 && controls.length > 0) {
            const controlsByPrefix = {};
            for (const control of controls) {
                const prefixMatch = control.ref_id?.match(/^([A-Z]\.[0-9]+)/);
                const prefix = prefixMatch ? prefixMatch[1] : 'other';
                
                if (!controlsByPrefix[prefix]) {
                    controlsByPrefix[prefix] = [];
                }
                controlsByPrefix[prefix].push({
                    id: control.id,
                    ref_id: control.ref_id,
                    name: control.name,
                    description: control.description || ""
                });
            }
            
            for (const [prefix, prefixControls] of Object.entries(controlsByPrefix)) {
                hierarchy.push({
                    id: `auto_${prefix}`,
                    ref_id: prefix,
                    title: prefix === 'other' ? 'Other Controls' : `${prefix} Controls`,
                    description: `Controls from ${prefix} family`,
                    type: "auto_family",
                    isAnnex: true,
                    children: [],
                    items: prefixControls
                });
            }
        }
        
        // Log final pour debug
        console.log(`Final hierarchy:`, hierarchy.map(h => ({ 
            title: h.title, 
            itemsCount: h.items.length,
            ref_id: h.ref_id
        })));
        
        res.json({ hierarchy: hierarchy });
        
    } catch (err) {
        console.error("Error fetching hierarchy:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});
// ============================================================
// DEBUG - Vérifier les données d'un standard
// ============================================================
router.get("/packages/:id/debug", async (req, res) => {
    const { id } = req.params;
    
    try {
        // Récupérer toutes les informations du standard
        const [standard] = await db.query(
            `SELECT * FROM ciso_standards WHERE id = ?`,
            [id]
        );
        
        const [coreChapters] = await db.query(
            `SELECT * FROM ciso_core_chapters WHERE standard_id = ?`,
            [id]
        );
        
        const [families] = await db.query(
            `SELECT * FROM ciso_families WHERE standard_id = ?`,
            [id]
        );
        
        const [controls] = await db.query(
            `SELECT * FROM ciso_controls WHERE standard_id = ?`,
            [id]
        );
        
        res.json({
            standard: standard[0],
            coreChapters: coreChapters,
            families: families,
            controls: controls,
            stats: {
                hasCoreChapters: coreChapters.length > 0,
                hasFamilies: families.length > 0,
                hasControls: controls.length > 0
            }
        });
        
    } catch (err) {
        console.error("Debug error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// IMPORT POLICY (WITH USER SUPPORT)
// ============================================================
router.post("/import-policy", async (req, res) => {
    try {
        const { standardId, title, version } = req.body;
        
        if (!standardId) {
            return res.status(400).json({ error: "standardId is required" });
        }
        
        // Vérifier si déjà importé
        const [existing] = await db.query(
            `SELECT id FROM imported_policies WHERE standard_id = ?`,
            [standardId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: "Framework already imported" });
        }
        
        // Insérer dans imported_policies
        await db.query(
            `INSERT INTO imported_policies (standard_id, title, version)
             VALUES (?, ?, ?)`,
            [standardId, title || "Security Framework", version || "1.0"]
        );
        
        res.json({ 
            success: true, 
            message: "Framework imported successfully" 
        });
        
    } catch (err) {
        console.error("import-policy error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET IMPORTED POLICIES (USER SPECIFIC)
// ============================================================
router.get("/imported-policies", async (req, res) => {
    try {
        const [imports] = await db.query(`
            SELECT 
                standard_id as id,
                title as name,
                version,
                imported_at
            FROM imported_policies
            ORDER BY imported_at DESC
        `);
        
        res.json(imports);
        
    } catch (err) {
        console.error("Error fetching imported policies:", err);
        // Si la table n'existe pas, retourner un tableau vide
        res.json([]);
    }
});

router.get("/imported", async (req, res) => {
  try {
    const [frameworks] = await db.query(`
      SELECT standard_id, title, version
      FROM imported_policies
    `);

    const result = [];

    for (const fw of frameworks) {

      // 🔹 CORE CHAPTERS (TOUJOURS INCLUS)
      const [chapters] = await db.query(`
        SELECT *
        FROM ciso_core_chapters
        WHERE standard_id = ?
      `, [fw.standard_id]);

      // 🔹 FAMILIES
      const [families] = await db.query(`
        SELECT *
        FROM ciso_families
        WHERE standard_id = ?
      `, [fw.standard_id]);

      // 🔹 CONTROLS
      const [controls] = await db.query(`
        SELECT *
        FROM ciso_controls
        WHERE standard_id = ?
      `, [fw.standard_id]);

      // 🔹 EXCEPTIONS
      const [exceptions] = await db.query(`
        SELECT entity_id, entity_type
        FROM policy_exceptions
        WHERE standard_id = ? AND is_active = TRUE
      `, [fw.standard_id]);

      const exceptionChapters = new Set(
        exceptions.filter(e => e.entity_type === 'chapter').map(e => e.entity_id)
      );

      const exceptionControls = new Set(
        exceptions.filter(e => e.entity_type === 'control').map(e => e.entity_id)
      );

      // 🔥 PROPAGATION FAMILY → CONTROLS
      const controlsFinal = controls.map(ctrl => {
        const isFamilyException = exceptionChapters.has(ctrl.family_id);
        const isDirectException = exceptionControls.has(ctrl.id);

        return {
          ...ctrl,
          is_exception: isFamilyException || isDirectException
        };
      });

      result.push({
        standard_id: fw.standard_id,
        title: fw.title,
        version: fw.version,
        core_chapters: chapters,
        families,
        controls: controlsFinal
      });
    }

    res.json(result);

  } catch (err) {
    console.error("imported error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// UNIMPORT POLICY (WITH USER CHECK)
// ============================================================
router.delete("/unimport-policy", async (req, res) => {
    try {
        const { policyId } = req.body;
        
        if (!policyId) {
            return res.status(400).json({ error: "policyId is required" });
        }
        
        // Supprimer les exceptions d'abord
        await db.query(
            `DELETE FROM policy_exceptions WHERE standard_id = ?`,
            [policyId]
        );
        
        // Supprimer l'import
        await db.query(
            `DELETE FROM imported_policies WHERE standard_id = ?`,
            [policyId]
        );
        
        res.json({ success: true, message: "Framework removed successfully" });
        
    } catch (err) {
        console.error("unimport-policy error:", err);
        res.status(500).json({ error: err.message });
    }
});


router.post("/add-exception", async (req, res) => {
  try {
    const { policyId, standardId, level, title, reason } = req.body;

    if (!policyId || !reason || !standardId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const entityType = level === "chapter" ? "chapter" : "control";

    const [existing] = await db.query(
      `SELECT id FROM policy_exceptions 
       WHERE standard_id = ? AND entity_id = ? AND entity_type = ?`,
      [standardId, policyId, entityType]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE policy_exceptions 
         SET reason = ?, is_active = TRUE
         WHERE standard_id = ? AND entity_id = ? AND entity_type = ?`,
        [reason, standardId, policyId, entityType]
      );
    } else {
      await db.query(
        `INSERT INTO policy_exceptions 
         (standard_id, entity_id, entity_type, title, reason, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [standardId, policyId, entityType, title || "", reason]
      );
    }
    // Si c’est une famille → marquer aussi les contrôles
    if (entityType === "chapter") {
      await db.query(`
        INSERT IGNORE INTO policy_exceptions 
        (standard_id, entity_id, entity_type, title, reason, is_active)
        SELECT ?, c.id, 'control', ?, ?, TRUE
        FROM ciso_controls c
        WHERE c.family_id = ?
      `, [standardId, title, reason, policyId]);
    }
    res.json({ success: true });

  } catch (err) {
    console.error("add-exception error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/all-exceptions", async (req, res) => {
  try {

    // =============================
    // CHAPTERS (core + families)
    // =============================
    const [chapters] = await db.query(`
      SELECT 
        pe.entity_id as id,
        pe.entity_type as level,
        pe.title,
        pe.reason,
        pe.created_at as excludedAt,
        pe.standard_id as standardId,

        COALESCE(cc.ref_id, cf.ref_id) as ref_id,
        COALESCE(cc.description, cf.description) as description

      FROM policy_exceptions pe

      LEFT JOIN ciso_core_chapters cc 
        ON cc.id = pe.entity_id

      LEFT JOIN ciso_families cf 
        ON cf.id = pe.entity_id

      WHERE pe.is_active = TRUE 
      AND pe.entity_type = 'chapter'
    `);

    // =============================
    // CONTROLS
    // =============================
    const [controls] = await db.query(`
      SELECT 
        pe.entity_id as id,
        pe.entity_type as level,
        pe.title,
        pe.reason,
        pe.created_at as excludedAt,
        pe.standard_id as standardId,

        c.ref_id,
        c.description

      FROM policy_exceptions pe
      INNER JOIN ciso_controls c ON c.id = pe.entity_id
      WHERE pe.is_active = TRUE 
      AND pe.entity_type = 'control'
    `);

    // =============================
    // CHILD CONTROLS POUR CHAPTER
    // =============================
    for (const ch of chapters) {
      const [childs] = await db.query(`
        SELECT id 
        FROM ciso_controls 
        WHERE family_id = ?
      `, [ch.id]);

      ch.childIds = childs.map(c => String(c.id));
    }

    // =============================
    // MERGE + SORT
    // =============================
    const all = [...chapters, ...controls];

    all.sort((a, b) => new Date(b.excludedAt) - new Date(a.excludedAt));

    res.json(all);

  } catch (err) {
    console.error("Error fetching exceptions:", err);
    res.status(500).json([]);
  }
});

router.get("/exceptions/:standardId", async (req, res) => {
  try {
    const { standardId } = req.params;

    const [exceptions] = await db.query(`
      SELECT 
        entity_id as id,
        entity_type as level,
        title,
        reason,
        created_at as excludedAt
      FROM policy_exceptions
      WHERE standard_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `, [standardId]);

    res.json(exceptions);

  } catch (err) {
    console.error("Error fetching exceptions:", err);
    res.status(500).json([]);
  }
});

router.delete("/remove-exception", async (req, res) => {
  try {
    const { entity_id, standardId, entity_type } = req.body;

    if (!entity_id || !standardId || !entity_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await db.query(
      `UPDATE policy_exceptions 
       SET is_active = FALSE
       WHERE standard_id = ? 
       AND entity_id = ? 
       AND entity_type = ?`,
      [standardId, entity_id, entity_type]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("remove-exception error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ADD CUSTOM FRAMEWORK
// ============================================================
router.post("/add-custom-framework", async (req, res) => {
    try {
        const { name, version, description, provider, hierarchy } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "Framework name is required" });
        }
        
        // Pour l'instant, retourner une erreur car non implémenté
        res.status(501).json({ 
            success: false, 
            message: "Custom frameworks not supported yet" 
        });
        
    } catch (err) {
        console.error("Error adding custom framework:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// GET USER'S CUSTOM FRAMEWORKS
// ============================================================
router.get("/user-frameworks", async (req, res) => {
    try {
        // Retourner un tableau vide pour l'instant
        res.json([]);
        
    } catch (err) {
        console.error("Error fetching user frameworks:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET CUSTOM FRAMEWORK HIERARCHY
// ============================================================
router.get("/custom-framework/:id/hierarchy", async (req, res) => {
    try {
        // Retourner une hiérarchie vide pour l'instant
        res.json({ hierarchy: [] });
        
    } catch (err) {
        console.error("Error fetching custom framework hierarchy:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;