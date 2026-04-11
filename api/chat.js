import { REFERENCE_MATERIALS, TOOL_DEFINITIONS, GOOGLE_TOOL_DECLARATIONS, executeTool, tryGoogleAIWithTools } from './chat-tools.js';

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const GEMMA4_MODEL = process.env.GEMMA4_MODEL || 'gemma-4-31b-it';

// ==================== HANDLER ====================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, model } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // model=gemma4 → use Gemma 4 via Google AI Studio (same API key, different model)
  const useGemma4 = model === 'gemma4';

  // Provider order: Ollama (with tool calling) → Gemma 4 AI Studio (if requested) → Gemini Pro → Claude

  // 1. Try Ollama with Function Calling
  const ollamaOk = await tryOllamaWithTools(messages, res);
  if (ollamaOk) return;

  // 2. Try Gemma 4 via Google AI Studio with Function Calling
  if (useGemma4 && GEMINI_API_KEY) {
    const gemma4Ok = await tryGoogleAIWithTools(messages, res, GEMMA4_MODEL, GEMINI_API_KEY);
    if (gemma4Ok) return;
    // Fallback: plain streaming without tools
    const gemma4Plain = await tryGeminiStream(messages, res, GEMMA4_MODEL, 'gemma4');
    if (gemma4Plain) return;
  }

  // 3. Try Gemini Pro with streaming (production default)
  if (GEMINI_API_KEY) {
    const geminiOk = await tryGeminiStream(messages, res);
    if (geminiOk) return;
  }

  // 3. Try Claude (fallback)
  if (ANTHROPIC_API_KEY) {
    const claudeResult = await tryClaude(messages);
    if (claudeResult) return sendAsSSE(res, claudeResult.content, 'claude');
  }

  if (!res.headersSent) {
    return res.status(503).json({ error: 'No AI provider available' });
  }
}

// ==================== OLLAMA WITH FUNCTION CALLING ====================

async function tryOllamaWithTools(messages, res) {
  try {
    // Step 1: Non-streaming call with tools (30s timeout for tool call phase)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const firstRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        tools: TOOL_DEFINITIONS,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!firstRes.ok) return false;
    const firstData = await firstRes.json();

    // Step 2: If model made tool calls, execute them and re-call
    if (firstData.message?.tool_calls && firstData.message.tool_calls.length > 0) {
      const updatedMessages = [...messages, firstData.message];

      for (const tc of firstData.message.tool_calls) {
        const args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const result = executeTool(tc.function.name, args);
        updatedMessages.push({ role: 'tool', content: result });
      }

      // Step 3: Final streaming call with tool results
      const finalRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: updatedMessages,
          stream: true,
        }),
      });
      if (!finalRes.ok) return false;
      return await streamOllamaResponse(finalRes, res, 'ollama+tools');
    }

    // No tool calls — stream the already-received response as SSE
    const content = firstData.message?.content || '';
    if (content) {
      sendAsSSE(res, content, 'ollama');
      return true;
    }
    return false;
  } catch {
    // Fallback: try plain streaming without tools
    return await tryOllamaStream(messages, res);
  }
}

// Plain Ollama streaming (fallback if tools fail)
async function tryOllamaStream(messages, res) {
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
    });
    if (!ollamaRes.ok) return false;
    return await streamOllamaResponse(ollamaRes, res, 'ollama');
  } catch { return false; }
}

async function streamOllamaResponse(ollamaRes, res, provider) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = ollamaRes.body.getReader();
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
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Inject provider info
      try {
        const parsed = JSON.parse(trimmed);
        parsed.provider = provider;
        res.write(`data: ${JSON.stringify(parsed)}\n\n`);
      } catch {
        res.write(`data: ${trimmed}\n\n`);
      }
      sentAny = true;
    }
  }
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim());
      parsed.provider = provider;
      res.write(`data: ${JSON.stringify(parsed)}\n\n`);
    } catch {
      res.write(`data: ${buffer.trim()}\n\n`);
    }
  }
  res.end();
  return sentAny;
}

// ==================== GEMINI PRO (SSE streaming) ====================

async function tryGeminiStream(messages, res, modelOverride, providerLabel) {
  const activeModel = modelOverride || GEMINI_MODEL;
  const activeProvider = providerLabel || 'gemini';
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
      generationConfig: { temperature: 1.0, maxOutputTokens: 8192 },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!geminiRes.ok) return await tryGeminiFallback(messages, res);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
          for (const part of parts) {
            if (part.text && !part.thought) {
              res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: part.text }, done: false, provider: activeProvider })}\n\n`);
              sentAny = true;
            }
          }
        } catch {}
      }
    }
    if (sentAny) {
      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, provider: activeProvider })}\n\n`);
    }
    res.end();
    return sentAny;
  } catch { return false; }
}

async function tryGeminiFallback(messages, res) {
  try {
    const contents = messages.filter(m => m.role !== 'system').map(m => {
      const parts = [{ text: m.content }];
      if (m.images && Array.isArray(m.images)) {
        for (const img of m.images) parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
    const systemInstruction = messages.find(m => m.role === 'system');
    const body = { contents, generationConfig: { temperature: 1.0, maxOutputTokens: 8192 } };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!geminiRes.ok) return false;
    const data = await geminiRes.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => !p.thought).map(p => p.text).join('');
    if (!text) return false;
    sendAsSSE(res, text, 'gemini');
    return true;
  } catch { return false; }
}

// ==================== CLAUDE (fallback) ====================

async function tryClaude(messages) {
  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: systemMsg?.content || '', messages: chatMsgs.map(m => ({ role: m.role, content: m.content })) }),
    });
    if (!claudeRes.ok) return null;
    const data = await claudeRes.json();
    const text = data.content?.[0]?.text;
    return text ? { content: text, provider: 'claude' } : null;
  } catch { return null; }
}

// ==================== HELPERS ====================

function sendAsSSE(res, text, provider) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const chunkSize = 20;
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: chunk }, done: false, provider })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, provider })}\n\n`);
  res.end();
}
