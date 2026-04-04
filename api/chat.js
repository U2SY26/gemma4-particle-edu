const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Try providers in order: Ollama → Claude (best) → Gemini

  // 1. Try Ollama (local dev with Gemma 4)
  const ollamaResult = await tryOllama(messages);
  if (ollamaResult) return streamSSE(res, ollamaResult);

  // 2. Try Claude (best quality for web demo)
  if (ANTHROPIC_API_KEY) {
    const claudeResult = await tryClaude(messages);
    if (claudeResult) return sendJSON(res, claudeResult);
  }

  // 3. Try Gemini
  if (GEMINI_API_KEY) {
    const geminiResult = await tryGemini(messages);
    if (geminiResult) return sendJSON(res, geminiResult);
  }

  // 4. All providers failed
  return res.status(503).json({ error: 'No AI provider available' });
}

async function tryOllama(messages) {
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
    });
    if (!ollamaRes.ok) return null;
    return { type: 'stream', body: ollamaRes.body };
  } catch { return null; }
}

async function tryGemini(messages) {
  try {
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = messages.find(m => m.role === 'system');

    const body = { contents };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return { type: 'text', content: text, provider: 'gemini' };
  } catch { return null; }
}

async function tryClaude(messages) {
  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemMsg?.content || '',
        messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    return { type: 'text', content: text, provider: 'claude' };
  } catch { return null; }
}

function streamSSE(res, result) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = result.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) res.write(`data: ${trimmed}\n\n`);
        }
      }
      if (buffer.trim()) res.write(`data: ${buffer.trim()}\n\n`);
    } catch {
      // Stream interrupted
    }
    res.end();
  })();
}

function sendJSON(res, result) {
  // Convert non-streaming response to SSE format that client expects
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  // Send the full response as a single SSE event in Ollama-compatible format
  const ollamaFormat = JSON.stringify({
    message: { role: 'assistant', content: result.content },
    done: true,
    provider: result.provider,
  });
  res.write(`data: ${ollamaFormat}\n\n`);
  res.end();
}
