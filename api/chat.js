const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

// ==================== 138 MATERIAL REFERENCE TABLE (SI units) ====================
const REFERENCE_MATERIALS = {
  steel:{density:7850,gravity:-9.81,temp:293,springK:55},iron:{density:7874,gravity:-9.81,temp:293,springK:50},aluminum:{density:2700,gravity:-9.81,temp:293,springK:40},copper:{density:8960,gravity:-9.81,temp:293,springK:45},titanium:{density:4506,gravity:-9.81,temp:293,springK:50},gold:{density:19320,gravity:-9.81,temp:293,springK:30},silver:{density:10490,gravity:-9.81,temp:293,springK:35},platinum:{density:21450,gravity:-9.81,temp:293,springK:40},tungsten:{density:19250,gravity:-9.81,temp:293,springK:80},zinc:{density:7134,gravity:-9.81,temp:293,springK:35},nickel:{density:8908,gravity:-9.81,temp:293,springK:45},lead:{density:11340,gravity:-9.81,temp:293,springK:10},tin:{density:7310,gravity:-9.81,temp:293,springK:20},chromium:{density:7190,gravity:-9.81,temp:293,springK:55},manganese:{density:7470,gravity:-9.81,temp:293,springK:45},cobalt:{density:8900,gravity:-9.81,temp:293,springK:50},lithium:{density:534,gravity:-9.81,temp:293,springK:5},sodium:{density:971,gravity:-9.81,temp:293,springK:3},mercury:{density:13546,gravity:-9.81,temp:293,springK:1,viscosity:1.5},brass:{density:8500,gravity:-9.81,temp:293,springK:40},bronze:{density:8800,gravity:-9.81,temp:293,springK:42},stainless_steel:{density:8000,gravity:-9.81,temp:293,springK:55},cast_iron:{density:7200,gravity:-9.81,temp:293,springK:35},magnesium:{density:1738,gravity:-9.81,temp:293,springK:25},cesium:{density:1930,gravity:-9.81,temp:293,springK:2},
  concrete:{density:2400,gravity:-9.81,temp:293,springK:35},wood:{density:700,gravity:-9.81,temp:293,springK:12},limestone:{density:2700,gravity:-9.81,temp:293,springK:30},stone:{density:2500,gravity:-9.81,temp:293,springK:35},brick:{density:1900,gravity:-9.81,temp:293,springK:25},glass:{density:2500,gravity:-9.81,temp:293,springK:15},marble:{density:2700,gravity:-9.81,temp:293,springK:30},granite:{density:2700,gravity:-9.81,temp:293,springK:40},sandstone:{density:2300,gravity:-9.81,temp:293,springK:20},slate:{density:2800,gravity:-9.81,temp:293,springK:35},asphalt:{density:2360,gravity:-9.81,temp:293,springK:8},plywood:{density:600,gravity:-9.81,temp:293,springK:10},cement:{density:1500,gravity:-9.81,temp:293,springK:30},fiberglass:{density:2550,gravity:-9.81,temp:293,springK:25},rebar:{density:7850,gravity:-9.81,temp:293,springK:55},
  rubber:{density:1100,gravity:-9.81,temp:293,springK:5},plastic:{density:1100,gravity:-9.81,temp:293,springK:8},nylon:{density:1140,gravity:-9.81,temp:293,springK:10},polyethylene:{density:950,gravity:-9.81,temp:293,springK:4},pvc:{density:1400,gravity:-9.81,temp:293,springK:12},polystyrene:{density:1050,gravity:-9.81,temp:293,springK:15},teflon:{density:2200,gravity:-9.81,temp:293,springK:2},kevlar:{density:1440,gravity:-9.81,temp:293,springK:70},epoxy:{density:1200,gravity:-9.81,temp:293,springK:20},silicone:{density:1100,gravity:-9.81,temp:293,springK:3},acrylic:{density:1180,gravity:-9.81,temp:293,springK:15},foam:{density:30,gravity:-9.81,temp:293,springK:1},
  ceramic:{density:2500,gravity:-9.81,temp:293,springK:45},diamond:{density:3515,gravity:-9.81,temp:293,springK:150},quartz:{density:2650,gravity:-9.81,temp:293,springK:40},sapphire:{density:3980,gravity:-9.81,temp:293,springK:80},ruby:{density:4010,gravity:-9.81,temp:293,springK:80},
  water:{density:1000,gravity:-9.81,temp:293,springK:5,viscosity:1.0},seawater:{density:1025,gravity:-9.81,temp:288,springK:5,viscosity:1.1},oil:{density:900,gravity:-9.81,temp:293,springK:2,viscosity:30},ethanol:{density:789,gravity:-9.81,temp:293,springK:2,viscosity:1.2},glycerol:{density:1261,gravity:-9.81,temp:293,springK:2,viscosity:1400},honey:{density:1420,gravity:-9.81,temp:293,springK:1,viscosity:10},lava:{density:2600,gravity:-9.81,temp:1500,springK:3,viscosity:8},liquid_nitrogen:{density:808,gravity:-9.81,temp:77,springK:1,viscosity:0.2},
  air:{density:1.225,gravity:-9.81,temp:293,springK:1,viscosity:0},helium:{density:0.164,gravity:-9.81,temp:293,springK:1},hydrogen:{density:0.082,gravity:-9.81,temp:293,springK:1},
  sand:{density:1600,gravity:-9.81,temp:293,springK:3},clay:{density:1750,gravity:-9.81,temp:293,springK:5},ice:{density:917,gravity:-9.81,temp:273,springK:30},snow:{density:100,gravity:-9.81,temp:273,springK:1},
  dna:{density:1700,gravity:0,temp:310,springK:30,viscosity:0.5},protein:{density:1350,gravity:0,temp:310,springK:20,viscosity:0.5},blood:{density:1060,gravity:-9.81,temp:310,springK:5,viscosity:3},bone:{density:1900,gravity:-9.81,temp:310,springK:50},
  graphene:{density:2267,gravity:0,temp:293,springK:100},aerogel:{density:100,gravity:0,temp:293,springK:1},silicon:{density:2329,gravity:-9.81,temp:293,springK:40},carbon_nanotube:{density:1600,gravity:0,temp:293,springK:120},superconductor:{density:6300,gravity:-9.81,temp:77,springK:45},
  plasma:{density:1025,gravity:0,temp:5778,springK:2,viscosity:0},stellar_plasma:{density:1400,gravity:-274,temp:5778,springK:2},neutron_star:{density:1e17,gravity:-1e12,temp:1e6,springK:100},
  feldspar:{density:2560,gravity:-9.81,temp:293,springK:30},gypsum:{density:2320,gravity:-9.81,temp:293,springK:10},talc:{density:2750,gravity:-9.81,temp:293,springK:5},calcite:{density:2710,gravity:-9.81,temp:293,springK:25},acetone:{density:784,gravity:-9.81,temp:293,springK:1,viscosity:0.3},mercury_liquid:{density:13546,gravity:-9.81,temp:293,springK:1,viscosity:1.5},sulfuric_acid:{density:1840,gravity:-9.81,temp:293,springK:2,viscosity:2.5},mud:{density:1600,gravity:-9.81,temp:293,springK:2,viscosity:5},co2:{density:1.98,gravity:-9.81,temp:293,springK:1},oxygen:{density:1.429,gravity:-9.81,temp:293,springK:1},nitrogen:{density:1.251,gravity:-9.81,temp:293,springK:1},argon:{density:1.633,gravity:-9.81,temp:293,springK:1},methane:{density:0.657,gravity:-9.81,temp:293,springK:1},soil:{density:1500,gravity:-9.81,temp:293,springK:3},basalt:{density:3000,gravity:-9.81,temp:293,springK:50},obsidian:{density:2600,gravity:-9.81,temp:293,springK:45},pumice:{density:640,gravity:-9.81,temp:293,springK:5},coal:{density:1350,gravity:-9.81,temp:293,springK:10},regolith:{density:1500,gravity:-1.62,temp:400,springK:10},dry_ice:{density:1560,gravity:-9.81,temp:195,springK:15},cell:{density:1050,gravity:0,temp:310,springK:8,viscosity:1},bacteria:{density:1100,gravity:-9.81,temp:310,springK:5},lipid:{density:900,gravity:0,temp:310,springK:3,viscosity:2},muscle:{density:1060,gravity:-9.81,temp:310,springK:8},collagen:{density:1300,gravity:-9.81,temp:310,springK:15},keratin:{density:1300,gravity:-9.81,temp:310,springK:20},chitin:{density:1400,gravity:-9.81,temp:293,springK:25},cellulose:{density:1500,gravity:-9.81,temp:293,springK:20},cartilage:{density:1100,gravity:-9.81,temp:310,springK:6},hemoglobin:{density:1335,gravity:0,temp:310,springK:10},neuron:{density:1040,gravity:0,temp:310,springK:5,viscosity:1},wax:{density:900,gravity:-9.81,temp:293,springK:3},sugar:{density:1590,gravity:-9.81,temp:293,springK:15},salt:{density:2160,gravity:-9.81,temp:293,springK:20},chocolate:{density:1300,gravity:-9.81,temp:304,springK:5},starch:{density:1500,gravity:-9.81,temp:293,springK:8},gelatin:{density:1270,gravity:-9.81,temp:310,springK:2,viscosity:5},cotton:{density:1550,gravity:-9.81,temp:293,springK:8},silk:{density:1340,gravity:-9.81,temp:293,springK:12},wool:{density:1310,gravity:-9.81,temp:293,springK:6},leather:{density:860,gravity:-9.81,temp:293,springK:10},paper:{density:800,gravity:-9.81,temp:293,springK:5},carbon:{density:2260,gravity:0,temp:293,springK:50},ferrofluid:{density:1300,gravity:-9.81,temp:293,springK:5,viscosity:3},nitinol:{density:6450,gravity:-9.81,temp:373,springK:30},perovskite:{density:5100,gravity:-9.81,temp:293,springK:25},metamaterial:{density:1000,gravity:-9.81,temp:293,springK:10},piezoelectric:{density:7500,gravity:-9.81,temp:293,springK:40},semiconductor:{density:2329,gravity:-9.81,temp:293,springK:40},photon:{density:0,gravity:0,temp:2.7,springK:1},dark_matter:{density:0,gravity:0,temp:2.7,springK:1},comet_ice:{density:600,gravity:0,temp:150,springK:10},nebula_gas:{density:0.001,gravity:0,temp:10000,springK:1},
};

// ==================== TOOL DEFINITIONS ====================
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "lookup_material",
      description: "Look up exact SI-unit physical properties for a material. MUST be called before setting physics values. Returns density(kg/m3), gravity(m/s2), temperature(K), springStiffness, viscosity.",
      parameters: {
        type: "object",
        required: ["material_name"],
        properties: {
          material_name: {
            type: "string",
            description: "Material name in English lowercase (e.g. 'steel', 'water', 'graphene', 'dna', 'lava')"
          }
        }
      }
    }
  }
];

function executeTool(name, args) {
  if (name === 'lookup_material') {
    const key = (args.material_name || '').toLowerCase().replace(/\s+/g, '_');
    const mat = REFERENCE_MATERIALS[key];
    if (mat) return JSON.stringify({ material: key, ...mat, source: 'CRC/NIST reference' });
    // fuzzy match
    const fuzzy = Object.keys(REFERENCE_MATERIALS).find(k => k.includes(key) || key.includes(k));
    if (fuzzy) return JSON.stringify({ material: fuzzy, ...REFERENCE_MATERIALS[fuzzy], source: 'CRC/NIST reference (fuzzy match)' });
    return JSON.stringify({ error: `Unknown material: ${args.material_name}. Available: ${Object.keys(REFERENCE_MATERIALS).slice(0, 20).join(', ')}...` });
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ==================== HANDLER ====================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Provider order: Ollama (with tool calling) → Gemini Pro → Claude

  // 1. Try Ollama with Function Calling
  const ollamaOk = await tryOllamaWithTools(messages, res);
  if (ollamaOk) return;

  // 2. Try Gemini Pro with streaming
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

async function tryGeminiStream(messages, res) {
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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
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
            if (part.text) {
              res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: part.text }, done: false, provider: 'gemini' })}\n\n`);
              sentAny = true;
            }
          }
        } catch {}
      }
    }
    if (sentAny) {
      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, provider: 'gemini' })}\n\n`);
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
