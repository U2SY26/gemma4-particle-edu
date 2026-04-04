const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let ollamaStatus = { ollama: false, model: null };
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const models = (data.models || []).map((m) => m.name);
      const hasModel = models.some((name) => name.startsWith(OLLAMA_MODEL));
      ollamaStatus = { ollama: true, model: hasModel ? OLLAMA_MODEL : null };
    }
  } catch {}

  // Match the same shape as the Express server /api/status route
  return res.json({
    status: 'running',
    version: '1.0.0',
    ollama: ollamaStatus,
    providers: {
      ollama: ollamaStatus.ollama,
      gemini: !!GEMINI_API_KEY,
      claude: !!ANTHROPIC_API_KEY,
    },
    capabilities: {
      physics: true,
      ai_chat: true,
      worldModel: false,
      cosmos: false,
      omniverse: false,
    },
  });
}
