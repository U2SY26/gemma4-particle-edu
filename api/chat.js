const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

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

  // Provider order: Ollama (local) → Gemini Pro (streaming) → Claude (fallback)

  // 1. Try Ollama (local dev with Gemma 4)
  const ollamaOk = await tryOllamaStream(messages, res);
  if (ollamaOk) return;

  // 2. Try Gemini Pro with streaming (primary web provider)
  if (GEMINI_API_KEY) {
    const geminiOk = await tryGeminiStream(messages, res);
    if (geminiOk) return;
  }

  // 3. Try Claude (fallback)
  if (ANTHROPIC_API_KEY) {
    const claudeResult = await tryClaude(messages);
    if (claudeResult) return sendAsSSE(res, claudeResult.content, 'claude');
  }

  // 4. All providers failed
  if (!res.headersSent) {
    return res.status(503).json({ error: 'No AI provider available' });
  }
}

// ==================== OLLAMA (streaming passthrough) ====================

async function tryOllamaStream(messages, res) {
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
    });
    if (!ollamaRes.ok) return false;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
    res.end();
    return true;
  } catch { return false; }
}

// ==================== GEMINI PRO (SSE streaming) ====================

async function tryGeminiStream(messages, res) {
  try {
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const parts = [{ text: m.content }];
        if (m.images && Array.isArray(m.images)) {
          for (const img of m.images) {
            parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
          }
        }
        return { role: m.role === 'assistant' ? 'model' : 'user', parts };
      });

    const systemInstruction = messages.find(m => m.role === 'system');

    const body = {
      contents,
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 8192,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    // Use streamGenerateContent with SSE for real-time streaming
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!geminiRes.ok) {
      // Fallback: try non-streaming if streaming fails
      return await tryGeminiFallback(messages, res);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Read Gemini SSE stream → convert to Ollama-compatible SSE
    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sentAny = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          const geminiData = JSON.parse(payload);
          const parts = geminiData.candidates?.[0]?.content?.parts;
          if (!parts) continue;

          // Extract text content (skip thinking/thought parts)
          for (const part of parts) {
            if (part.text) {
              const ollamaChunk = JSON.stringify({
                message: { role: 'assistant', content: part.text },
                done: false,
                provider: 'gemini',
              });
              res.write(`data: ${ollamaChunk}\n\n`);
              sentAny = true;
            }
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    // Send done event
    if (sentAny) {
      const doneChunk = JSON.stringify({
        message: { role: 'assistant', content: '' },
        done: true,
        provider: 'gemini',
      });
      res.write(`data: ${doneChunk}\n\n`);
    }

    res.end();
    return sentAny;
  } catch {
    return false;
  }
}

// Non-streaming Gemini fallback (if streaming endpoint fails)
async function tryGeminiFallback(messages, res) {
  try {
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const parts = [{ text: m.content }];
        if (m.images && Array.isArray(m.images)) {
          for (const img of m.images) {
            parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
          }
        }
        return { role: m.role === 'assistant' ? 'model' : 'user', parts };
      });

    const systemInstruction = messages.find(m => m.role === 'system');
    const body = {
      contents,
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 8192,
      },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!geminiRes.ok) return false;
    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return false;

    sendAsSSE(res, text, 'gemini');
    return true;
  } catch {
    return false;
  }
}

// ==================== CLAUDE (fallback) ====================

async function tryClaude(messages) {
  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
    if (!claudeRes.ok) return null;
    const data = await claudeRes.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    return { content: text, provider: 'claude' };
  } catch { return null; }
}

// ==================== HELPERS ====================

function sendAsSSE(res, text, provider) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Chunk the text to simulate streaming for better UX
  const chunkSize = 20;
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    const ollamaChunk = JSON.stringify({
      message: { role: 'assistant', content: chunk },
      done: false,
      provider,
    });
    res.write(`data: ${ollamaChunk}\n\n`);
  }

  const doneChunk = JSON.stringify({
    message: { role: 'assistant', content: '' },
    done: true,
    provider,
  });
  res.write(`data: ${doneChunk}\n\n`);
  res.end();
}
