import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.resolve("C:/Users/ASUS/Desktop/PFE/data/standards");

// Éviter les imports multiples
let isImporting = false;

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function getAllFrameworkFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  
  const files = fs.readdirSync(DATA_DIR).filter(f => {
    return f.endsWith(".json") && 
           !f.startsWith("frameworks_index_") &&
           !f.startsWith("ciso_standards_") &&
           !f.startsWith("all_frameworks_");
  });
  
  const uniqueFiles = [];
  const seenNames = new Set();
  
  for (const file of files) {
    let frameworkName = file.replace(/_\d{8}_\d{6}\.json$/, '');
    if (!seenNames.has(frameworkName)) {
      seenNames.add(frameworkName);
      uniqueFiles.push(file);
    }
  }
  
  uniqueFiles.sort();
  return uniqueFiles.map(f => path.join(DATA_DIR, f));
}

function readFrameworkFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    
    if (data.framework) {
      return data.framework;
    } else if (data.standard) {
      return data.standard;
    } else {
      return data;
    }
  } catch (error) {
    console.error(`❌ Erreur lecture ${filePath}:`, error.message);
    return null;
  }
}

// ============================================================
// ADAPTATEUR POUR STRUCTURE UNIVERSELLE
// ============================================================

function adaptFrameworkUniversel(framework) {
  if (!framework) return framework;
  
  console.log(`🔄 Adaptation universelle: ${framework.name}`);
  
  const formatTitle = (node) => {
    const ref = node.ref_id || node.id || '';
    const title = node.title || node.name || node.label || 'Untitled';
    if (ref && title && ref !== title) {
      return `${ref} - ${title}`;
    }
    return title || ref;
  };
  
  const extractDescription = (node) => {
    return node.description || node.desc || node.definition || 
           node.summary || node.purpose || node.overview || '';
  };
  
  const extractItems = (node) => {
    const itemsSource = node.items || node.controls || node.requirements || 
                        node.measures || node.safeguards || [];
    
    return itemsSource.map(item => ({
      ref_id: item.ref_id || item.id || item.code || `item_${Date.now()}`,
      name: item.name || item.title || item.label || item.control || 'Untitled',
      description: extractDescription(item)
    }));
  };
  
  const detectFamilyOrCore = (node, frameworkName) => {
    const ref = (node.ref_id || '').toLowerCase();
    const title = (node.title || '').toLowerCase();
    
    // Détection des familles de contrôles (A.5, A.6, etc.)
    const isFamily = ref.match(/^a\.\d+$/i) || 
                     title.includes('organisational controls') ||
                     title.includes('people controls') ||
                     title.includes('physical controls') ||
                     title.includes('technological controls');
    
    // Détection des chapitres Core (4,5,6,7,8,9,10)
    const isCoreChapter = ref.match(/^\d+$/) || 
                          ref.match(/^\d+\.\d+$/) ||
                          title.includes('context') ||
                          title.includes('leadership') ||
                          title.includes('planning') ||
                          title.includes('support') ||
                          title.includes('operations') ||
                          title.includes('performance') ||
                          title.includes('improvement');
    
    return { isFamily, isCoreChapter };
  };
  
  // Construire la hiérarchie avec séparation claire
  const families = [];
  const coreChapters = [];
  
  const processHierarchy = (nodes, level = 0) => {
    if (!nodes || !Array.isArray(nodes)) return;
    
    for (const node of nodes) {
      const nodeRef = node.ref_id || '';
      const { isFamily, isCoreChapter } = detectFamilyOrCore(node, framework.name);
      
      if (isFamily) {
        // C'est une famille de contrôles (A.5, A.6, A.7, A.8)
        families.push({
          ref_id: nodeRef,
          name: node.title,
          description: node.description || '',
          children: node.children || [],
          items: extractItems(node),
          level: level
        });
      } else if (isCoreChapter || level === 0) {
        // C'est un chapitre Core (4,5,6,7,8,9,10) ou racine
        coreChapters.push({
          ref_id: nodeRef,
          name: node.title,
          description: node.description || '',
          children: node.children || [],
          level: level
        });
      } else if (node.children && node.children.length > 0) {
        // Parcourir les enfants
        processHierarchy(node.children, level + 1);
      }
    }
  };
  
  // Traiter la hiérarchie existante
  const existingHierarchy = framework.hierarchy || [];
  processHierarchy(existingHierarchy);
  
  // Si on n'a rien trouvé, prendre toute la hiérarchie comme Core
  const finalCoreChapters = coreChapters.length > 0 ? coreChapters : existingHierarchy;
  
  return {
    ...framework,
    families: families,
    core_chapters: finalCoreChapters,
    hierarchy: [
      {
        ref_id: "core",
        title: "Core Requirements",
        description: `Exigences principales du framework ${framework.name}`,
        children: finalCoreChapters,
        items: []
      },
      {
        ref_id: "annexes",
        title: "Annexes - Controls",
        description: "Annexes et contrôles associés",
        children: families,
        items: []
      }
    ],
    metadata: {
      ...framework.metadata,
      families_count: families.length,
      core_chapters_count: finalCoreChapters.length,
      adapted: true,
      adapter_version: 'v2_with_families',
      adaptation_date: new Date().toISOString()
    }
  };
}

// ============================================================
// INSERTION DANS LES NOUVELLES TABLES
// ============================================================

async function insertStandard(conn, framework, standardId) {
  // Insérer le standard
  await conn.query(
    `INSERT INTO ciso_standards (id, name, description, version, provider, ref_id, controls_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      standardId,
      framework.name,
      framework.description || "",
      framework.version || "1.0",
      framework.provider || "Unknown",
      framework.ref_id || framework.name,
      framework.families?.reduce((sum, f) => sum + (f.items?.length || 0), 0) || 0
    ]
  );
  console.log(`✅ Standard inséré: ${framework.name}`);
}

async function insertFamilies(conn, families, standardId) {
  for (let i = 0; i < families.length; i++) {
    const family = families[i];
    if (!family) continue;
    
    const familyId = `${standardId}__${family.ref_id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const itemsCount = family.items?.length || 0;
    
    await conn.query(
      `INSERT INTO ciso_families (id, standard_id, ref_id, name, description, display_order, controls_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         controls_count = VALUES(controls_count)`,
      [
        familyId,
        standardId,
        family.ref_id,
        family.name,
        family.description || "",
        i,
        itemsCount
      ]
    );
    console.log(`   📁 Famille: ${family.ref_id} - ${family.name} (${itemsCount} contrôles)`);
    
    // Insérer les contrôles de cette famille
    if (family.items && family.items.length > 0) {
      for (let j = 0; j < family.items.length; j++) {
        const ctrl = family.items[j];
        const controlId = `${standardId}__${ctrl.ref_id.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        await conn.query(
          `INSERT INTO ciso_controls (id, family_id, standard_id, ref_id, name, description, implementation_guidance)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             description = VALUES(description)`,
          [
            controlId,
            familyId,
            standardId,
            ctrl.ref_id,
            ctrl.name,
            ctrl.description || "",
            ctrl.implementation_guidance || null
          ]
        );
      }
      console.log(`      ✅ ${itemsCount} contrôles insérés`);
    }
  }
}

async function insertCoreChapters(conn, coreChapters, standardId, parentId = null, level = 0) {
  for (let i = 0; i < coreChapters.length; i++) {
    const chapter = coreChapters[i];
    if (!chapter) continue;
    
    const chapterId = `${standardId}__${chapter.ref_id?.replace(/[^a-zA-Z0-9]/g, '_') || `chapter_${i}`}`;
    
    await conn.query(
      `INSERT INTO ciso_core_chapters (id, standard_id, ref_id, title, description, parent_id, level, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         parent_id = VALUES(parent_id),
         level = VALUES(level)`,
      [
        chapterId,
        standardId,
        chapter.ref_id || `ch_${i}`,
        chapter.name || chapter.title || "Untitled",
        chapter.description || "",
        parentId,
        level,
        i
      ]
    );
    
    // Parcourir les enfants
    if (chapter.children && chapter.children.length > 0) {
      await insertCoreChapters(conn, chapter.children, standardId, chapterId, level + 1);
    }
  }
}

// ============================================================
// IMPORT STANDARDS (VERSION CORRIGÉE)
// ============================================================

export async function importStandardsToDB() {
  if (isImporting) {
    console.log("⏳ Import déjà en cours, ignoré...");
    return;
  }
  
  isImporting = true;
  
  console.log("🔄 Import des standards depuis les fichiers séparés...");
  console.log(`📁 Dossier source: ${DATA_DIR}`);

  const frameworkFiles = getAllFrameworkFiles();
  
  if (frameworkFiles.length === 0) {
    console.error("❌ Aucun fichier JSON trouvé!");
    isImporting = false;
    return;
  }
  
  console.log(`✅ ${frameworkFiles.length} fichiers trouvés`);

  const conn = await db.getConnection();
  let totalImported = 0;
  
  try {
    for (const filePath of frameworkFiles) {
      console.log(`\n📖 Lecture: ${path.basename(filePath)}`);
      let framework = readFrameworkFromFile(filePath);
      
      if (!framework) {
        console.error(`❌ Impossible de lire ${filePath}`);
        continue;
      }
      
      // Adapter le framework
      framework = adaptFrameworkUniversel(framework);
      console.log(`✅ Framework adapté: ${framework.name}`);
      console.log(`   - Familles: ${framework.families?.length || 0}`);
      console.log(`   - Chapitres Core: ${framework.core_chapters?.length || 0}`);
      
      const standardId = framework.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/, '');
      
      // Supprimer les anciennes données
      await conn.query("DELETE FROM ciso_controls WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_families WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_core_chapters WHERE standard_id = ?", [standardId]);
      await conn.query("DELETE FROM ciso_standards WHERE id = ?", [standardId]);
      
      // Insérer les nouvelles données
      await insertStandard(conn, framework, standardId);
      
      if (framework.families && framework.families.length > 0) {
        await insertFamilies(conn, framework.families, standardId);
      }
      
      if (framework.core_chapters && framework.core_chapters.length > 0) {
        await insertCoreChapters(conn, framework.core_chapters, standardId);
      }
      
      totalImported++;
      console.log(`✅ Framework importé: ${framework.name}`);
    }
    
    console.log(`\n✅ Import terminé: ${totalImported} standards importés`);
  } catch (error) {
    console.error("❌ Erreur lors de l'import:", error);
    throw error;
  } finally {
    conn.release();
    isImporting = false;
  }
}

// ============================================================
// ROUTES API (CORRIGÉES)
// ============================================================

// GET /packages/:id/controls - Récupérer UNIQUEMENT les contrôles pour l'analyse
router.get("/packages/:id/controls", async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 GET /api/ciso/packages/${id}/controls`);
  
  try {
    const [stdRows] = await db.query("SELECT * FROM ciso_standards WHERE id = ?", [id]);
    if (!stdRows.length) {
      return res.status(404).json({ error: "Standard not found" });
    }
    
    const [controls] = await db.query(`
      SELECT 
        c.id,
        c.ref_id,
        c.name as title,
        c.description,
        f.id as family_id,
        f.ref_id as family_ref,
        f.name as family_name,
        s.name as standard_name
      FROM ciso_controls c
      JOIN ciso_families f ON c.family_id = f.id
      JOIN ciso_standards s ON c.standard_id = s.id
      WHERE c.standard_id = ?
      ORDER BY f.display_order, c.ref_id
    `, [id]);
    
    console.log(`✅ ${controls.length} contrôles récupérés pour ${stdRows[0].name}`);
    
    res.json({
      standard_id: id,
      standard_name: stdRows[0].name,
      controls: controls,
      total: controls.length
    });
  } catch (err) {
    console.error("❌ DB error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/families - Récupérer les familles (pour exceptions)
router.get("/packages/:id/families", async (req, res) => {
  const { id } = req.params;

  try {
    const [families] = await db.query(`
      SELECT 
        f.id,
        f.ref_id,
        f.name,
        f.description,
        f.display_order,
        f.controls_count
      FROM ciso_families f
      WHERE f.standard_id = ?
      ORDER BY f.display_order
    `, [id]);

    res.json({
      standard_id: id,
      families: families.map(f => ({
        id: f.id,
        ref_id: f.ref_id,
        name: f.name,
        title: f.name,
        description: f.description || "",
        controls_count: f.controls_count || 0
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/core-chapters - Récupérer les chapitres Core
router.get("/packages/:id/core-chapters", async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 GET /api/ciso/packages/${id}/core-chapters`);
  
  try {
    const [chapters] = await db.query(`
      SELECT id, ref_id, title, description, parent_id, level, display_order
      FROM ciso_core_chapters
      WHERE standard_id = ?
      ORDER BY display_order
    `, [id]);
    
    // Construire l'arbre hiérarchique
    const chaptersMap = new Map();
    const rootChapters = [];
    
    for (const ch of chapters) {
      chaptersMap.set(ch.id, {
        id: ch.id,
        ref_id: ch.ref_id,
        title: ch.title,
        description: ch.description,
        parent_id: ch.parent_id,
        level: ch.level,
        children: []
      });
    }
    
    for (const ch of chapters) {
      const chapter = chaptersMap.get(ch.id);
      if (!ch.parent_id || !chaptersMap.has(ch.parent_id)) {
        rootChapters.push(chapter);
      } else {
        const parent = chaptersMap.get(ch.parent_id);
        parent.children.push(chapter);
      }
    }
    
    console.log(`✅ ${rootChapters.length} chapitres Core racines`);
    
    res.json({
      standard_id: id,
      core_chapters: rootChapters,
      total: rootChapters.length
    });
  } catch (err) {
    console.error("❌ DB error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /packages/:id/hierarchy - Compatibilité avec ancien code
router.get("/packages/:id/hierarchy", async (req, res) => {
  const { id } = req.params;
  console.log(`🔄 GET /api/ciso/packages/${id}/hierarchy (compatibilité)`);
  
  try {
    const [stdRows] = await db.query("SELECT * FROM ciso_standards WHERE id = ?", [id]);
    if (!stdRows.length) {
      return res.status(404).json({ error: "Standard not found" });
    }
    
    // Récupérer les familles avec leurs contrôles
    const [families] = await db.query(`
      SELECT id, ref_id, name, description, display_order
      FROM ciso_families
      WHERE standard_id = ?
      ORDER BY display_order
    `, [id]);
    
    const familiesWithControls = [];
    for (const family of families) {
      const [controls] = await db.query(`
        SELECT id, ref_id, name, description
        FROM ciso_controls
        WHERE family_id = ?
        ORDER BY ref_id
      `, [family.id]);
      
      familiesWithControls.push({
        id: family.id,
        ref_id: family.ref_id,
        title: family.name,
        description: family.description || "",
        items: controls.map(c => ({
          id: c.id,
          ref_id: c.ref_id,
          name: c.name,
          description: c.description || ""
        })),
        children: []
      });
    }
    
    // Récupérer les chapitres Core
    const [coreChapters] = await db.query(`
      SELECT id, ref_id, title, description, parent_id, level
      FROM ciso_core_chapters
      WHERE standard_id = ? AND (level = 0 OR level = 1)
      ORDER BY display_order
    `, [id]);
    
    const buildCoreHierarchy = (parentId = null) => {
      return coreChapters
        .filter(ch => ch.parent_id === parentId)
        .map(ch => ({
          id: ch.id,
          ref_id: ch.ref_id,
          title: ch.title,
          description: ch.description || "",
          level: ch.level,
          items: [],
          children: buildCoreHierarchy(ch.id)
        }));
    };
    
    const hierarchy = [
      {
        id: `${id}__core_section`,
        ref_id: "core",
        title: "Core Requirements",
        description: `Exigences principales du framework ${stdRows[0].name}`,
        items: [],
        children: buildCoreHierarchy(null)
      },
      {
        id: `${id}__annexes_section`,
        ref_id: "annexes",
        title: "Annexes - Controls",
        description: "Annexes et contrôles associés",
        items: [],
        children: familiesWithControls
      }
    ];
    
    res.json({
      id: stdRows[0].id,
      title: stdRows[0].name,
      hierarchy: hierarchy
    });
  } catch (err) {
    console.error("❌ DB error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /packages - Liste tous les standards
router.get("/packages", async (req, res) => {
  console.log("🔄 GET /api/ciso/packages");
  try {
    const [rows] = await db.query(`
      SELECT id, name, description, version, provider, ref_id, controls_count
      FROM ciso_standards 
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ DB error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /stats - Statistiques
router.get("/stats", async (req, res) => {
  try {
    const [[{ standards }]] = await db.query("SELECT COUNT(*) as standards FROM ciso_standards");
    const [[{ families }]] = await db.query("SELECT COUNT(*) as families FROM ciso_families");
    const [[{ controls }]] = await db.query("SELECT COUNT(*) as controls FROM ciso_controls");
    const [[{ coreChapters }]] = await db.query("SELECT COUNT(*) as coreChapters FROM ciso_core_chapters");
    
    res.json({ standards, families, controls, coreChapters });
  } catch (err) {
    console.error("❌ Stats error:", err.message);
    res.json({ standards: 0, families: 0, controls: 0, coreChapters: 0 });
  }
});

// GET /reimport - Réimporter tous les standards
router.get("/reimport", async (req, res) => {
  try {
    while (isImporting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("🔄 Réimport complet des standards...");
    await db.query("DELETE FROM ciso_controls");
    await db.query("DELETE FROM ciso_families");
    await db.query("DELETE FROM ciso_core_chapters");
    await db.query("DELETE FROM ciso_standards");
    await importStandardsToDB();
    res.json({ 
      message: "Réimport terminé avec succès!",
      frameworks_imported: true
    });
  } catch (err) {
    console.error("❌ Erreur lors du réimport:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /json-files - Liste des fichiers JSON disponibles
router.get("/json-files", async (req, res) => {
  try {
    const files = getAllFrameworkFiles();
    const frameworks = [];
    
    for (const file of files) {
      const framework = readFrameworkFromFile(file);
      if (framework) {
        frameworks.push({
          file: path.basename(file),
          name: framework.name,
          controls_count: framework.controls?.length || 0
        });
      }
    }
    
    res.json({
      directory: DATA_DIR,
      total_files: files.length,
      frameworks: frameworks
    });
  } catch (err) {
    console.error("❌ Error reading JSON files:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// ROUTE DEBUG - CORRIGÉE
// ============================================================
router.get("/packages/:id/controls-debug", async (req, res) => {
  const { id } = req.params;
  console.log(`🐛 DEBUG /controls-debug pour ${id}`);
  
  try {
    const [controls] = await db.query(`
      SELECT 
        c.id,
        c.ref_id,
        c.name as title,
        c.description,
        f.id as family_id,
        f.ref_id as family_ref,
        f.name as family_name
      FROM ciso_controls c
      JOIN ciso_families f ON c.family_id = f.id
      WHERE c.standard_id = ?
    `, [id]);
    
    console.log(`🐛 ${controls.length} contrôles trouvés`);
    
    res.json({
      success: true,
      standard_id: id,
      total: controls.length,
      controls: controls
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;