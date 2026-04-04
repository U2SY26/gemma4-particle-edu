const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = 'gemma4';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!response.ok) return res.json({ ollama: false, model: null, models: [] });
    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasGemma = models.some((name) => name.startsWith(OLLAMA_MODEL));
    return res.json({ ollama: true, model: hasGemma ? OLLAMA_MODEL : null, models });
  } catch {
    return res.json({ ollama: false, model: null, models: [] });
  }
}
