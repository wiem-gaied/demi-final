import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Stockage des processus Python par session
const pythonProcesses = new Map();
const pendingResponses = new Map();

// Fonction pour créer un nouveau processus Python
function createPythonSession(sessionId) {
    // Chemins absolus
    const pythonScript = "C:/Users/ASUS/Desktop/PFE/chatbot_ollama.py";
    const workingDir = "C:/Users/ASUS/Desktop/PFE";
    
    // Mais vérifiez que le chemin existe
    if (!fs.existsSync(workingDir)) {
        console.error(`❌ Le dossier n'existe pas: ${workingDir}`);
    }
    // Vérifier que chroma_db existe
    const chromaPath = path.join(workingDir, "chroma_db");
    if (!fs.existsSync(chromaPath)) {
        console.error(`⚠️ chroma_db non trouvé dans: ${chromaPath}`);
        console.error("Exécutez d'abord: python chatbot_ollama.py --mode interactive");
    } else {
        console.log(`✅ chroma_db trouvé: ${chromaPath}`);
    }
    
    const pythonProcess = spawn('python', [pythonScript, '--mode', 'server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            PYTHONPATH: workingDir,
            OLLAMA_HOST: 'http://127.0.0.1:11434'
        }
    });
    
    pythonProcess.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");

        lines.forEach(line => {
            const trimmed = line.trim();

            if (!trimmed.startsWith("{")) return;

            try {
                const response = JSON.parse(trimmed);

                if (!pendingResponses.has(sessionId)) {
                    pendingResponses.set(sessionId, []);
                }

                pendingResponses.get(sessionId).push(response);

            } catch (e) {
                console.error("Invalid JSON ignored:", trimmed);
            }
        });
    });
    
    pythonProcess.stderr.on('data', (data) => {
        const msg = data.toString();

        if (
            msg.includes("HF") ||
            msg.includes("BertModel") ||
            msg.includes("UNEXPECTED")
        ) return;

        console.error(`Python stderr (${sessionId}):`, msg);
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Processus Python ${sessionId} fermé avec code ${code}`);
        pythonProcesses.delete(sessionId);
        pendingResponses.delete(sessionId);
    });
    
    return pythonProcess;
}

// Fonction pour attendre une réponse du processus Python
function waitForResponse(sessionId, type, timeout = 120000) { // Timeout augmenté à 120 secondes
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const interval = setInterval(() => {
            const responses = pendingResponses.get(sessionId);

            if (!responses) return;

            const index = responses.findIndex(r => r.type === type);

            if (index !== -1) {
                const response = responses.splice(index, 1)[0];
                clearInterval(interval);
                return resolve(response);
            }

            if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error("Timeout Python response"));
            }

        }, 50);
    });
}

// Route pour envoyer un message au chatbot
router.post('/chatbot/message', async (req, res) => {
    const { message, sessionId: clientSessionId } = req.body;

    const sessionId = clientSessionId || req.session.id;

    if (!pythonProcesses.has(sessionId)) {
        console.log(`🔄 Création d'une nouvelle session Python: ${sessionId}`);
        pythonProcesses.set(sessionId, createPythonSession(sessionId));
    }

    const pythonProcess = pythonProcesses.get(sessionId);

    pythonProcess.stdin.write(JSON.stringify({
        type: "message",
        content: message,
        sessionId
    }) + "\n");

    try {
        const response = await waitForResponse(sessionId, "response", 120000);

        res.json({
            success: true,
            message: response.content,
            sessionId
        });

    } catch (err) {
        console.error(`Erreur pour la session ${sessionId}:`, err.message);
        res.status(500).json({
            success: false,
            error: "Le chatbot met trop de temps à répondre. Veuillez réessayer."
        });
    }
});

// Route pour réinitialiser la conversation
router.post('/chatbot/reset', async (req, res) => {
    const { sessionId } = req.body;
    const currentSessionId = sessionId || req.session.id;
    
    if (!pythonProcesses.has(currentSessionId)) {
        return res.json({ 
            success: true, 
            message: 'Aucune conversation active à réinitialiser' 
        });
    }
    
    const pythonProcess = pythonProcesses.get(currentSessionId);
    
    const command = JSON.stringify({
        type: 'reset',
        sessionId: currentSessionId
    });
    
    pythonProcess.stdin.write(command + '\n');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
        const responses = pendingResponses.get(currentSessionId) || [];
        if (responses.length > 0) {
            const response = responses.shift();
            if (response.type === 'reset_confirm') {
                return res.json({
                    success: true,
                    message: response.content
                });
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    res.json({ 
        success: true, 
        message: 'Conversation réinitialisée' 
    });
});

// Route pour obtenir l'historique
router.get('/chatbot/history/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    if (!pythonProcesses.has(sessionId)) {
        return res.json({ 
            success: true, 
            history: [] 
        });
    }
    
    const pythonProcess = pythonProcesses.get(sessionId);
    
    const command = JSON.stringify({
        type: 'get_history',
        sessionId: sessionId
    });
    
    pythonProcess.stdin.write(command + '\n');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
        const responses = pendingResponses.get(sessionId) || [];
        if (responses.length > 0) {
            const response = responses.shift();
            if (response.type === 'history') {
                return res.json({
                    success: true,
                    history: response.history || []
                });
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    res.json({ 
        success: true, 
        history: [] 
    });
});

// Route pour vérifier le statut d'Ollama
router.get('/chatbot/status', async (req, res) => {
    try {
        const { exec } = await import('child_process');
        exec('ollama list', (error, stdout, stderr) => {
            if (error) {
                return res.json({ 
                    status: 'error', 
                    message: 'Ollama n\'est pas disponible',
                    ollamaRunning: false 
                });
            }
            const hasMistral = stdout.includes('mistral');
            res.json({ 
                status: 'ok', 
                message: 'Ollama est disponible',
                ollamaRunning: true,
                models: {
                    mistral: hasMistral
                }
            });
        });
    } catch (error) {
        res.json({ 
            status: 'error', 
            message: 'Erreur de connexion à Ollama',
            ollamaRunning: false 
        });
    }
});

// Nettoyer les processus à la fermeture
process.on('SIGINT', () => {
    console.log('Fermeture des processus Python...');
    for (const [sessionId, process] of pythonProcesses) {
        process.kill();
    }
    process.exit(0);
});

export default router;