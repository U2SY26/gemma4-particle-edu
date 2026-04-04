import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = 'gemma4';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Static files — serve project root (index.html, js/, css/)
app.use(express.static(__dirname));

// --- Routes ---

// GET /api/status — Check Ollama connectivity and model availability
app.get('/api/status', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!response.ok) {
      return res.json({ ollama: false, model: null, models: [] });
    }
    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasGemma = models.some((name) => name.startsWith(OLLAMA_MODEL));
    return res.json({
      ollama: true,
      model: hasGemma ? OLLAMA_MODEL : null,
      models,
    });
  } catch {
    return res.json({ ollama: false, model: null, models: [] });
  }
});

// POST /api/chat — Ollama proxy with SSE streaming
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text().catch(() => '');
      // Map Ollama errors to 503 so clients get a consistent "service unavailable"
      // status regardless of whether Ollama is down or the model is missing.
      return res
        .status(503)
        .json({ error: `Ollama error: ${ollamaRes.status}`, detail: text });
    }

    // SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Pipe Ollama's NDJSON stream as SSE events to the client
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          res.write(`data: ${trimmed}\n\n`);
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim()) {
        res.write(`data: ${buffer.trim()}\n\n`);
      }
    } catch (streamErr) {
      // If the client disconnected mid-stream, just end quietly
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      }
    }

    res.end();
  } catch {
    // Ollama is unreachable
    if (!res.headersSent) {
      return res.status(503).json({ error: 'Ollama not available' });
    }
    res.end();
  }
});

// --- Start server (only when run directly, not when imported for tests) ---
let server = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app, server };
