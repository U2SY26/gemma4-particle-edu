// ==================== SHARED: Function Calling for Google AI Studio ====================
// Used by both api/chat.js (Vercel) and server.js (Express local)

// 138 Material Reference Table (SI units)
export const REFERENCE_MATERIALS = {
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

export const GOOGLE_TOOL_DECLARATIONS = [{
  functionDeclarations: [{
    name: 'lookup_material',
    description: 'Look up exact SI-unit physical properties for a material. MUST be called before setting physics values. Returns density(kg/m3), gravity(m/s2), temperature(K), springStiffness, viscosity.',
    parameters: {
      type: 'object',
      properties: { material_name: { type: 'string', description: 'Material name in English lowercase (e.g. steel, water, graphene)' } },
      required: ['material_name'],
    },
  }],
}];

// Ollama-compatible tool definitions
export const TOOL_DEFINITIONS = [
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

export function executeTool(name, args) {
  if (name === 'lookup_material') {
    const key = (args.material_name || '').toLowerCase().replace(/\s+/g, '_');
    const mat = REFERENCE_MATERIALS[key];
    if (mat) return JSON.stringify({ material: key, ...mat, source: 'CRC/NIST reference' });
    const fuzzy = Object.keys(REFERENCE_MATERIALS).find(k => k.includes(key) || key.includes(k));
    if (fuzzy) return JSON.stringify({ material: fuzzy, ...REFERENCE_MATERIALS[fuzzy], source: 'CRC/NIST reference (fuzzy match)' });
    return JSON.stringify({ error: `Unknown material: ${args.material_name}. Available: ${Object.keys(REFERENCE_MATERIALS).slice(0, 20).join(', ')}...` });
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

/**
 * Google AI Studio Function Calling flow:
 * 1. Non-streaming call with tools → check for functionCall
 * 2. Execute tool calls (lookup_material → REFERENCE_MATERIALS)
 * 3. Streaming call with tool results
 *
 * @param {Array} messages - Chat messages
 * @param {object} res - HTTP response (Express or Vercel)
 * @param {string} modelName - e.g. 'gemma-4-31b-it'
 * @param {string} apiKey - Google AI Studio API key
 * @returns {boolean} true if response was sent
 */
export async function tryGoogleAIWithTools(messages, res, modelName, apiKey) {
  try {
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const systemInstruction = messages.find(m => m.role === 'system');
    const body = {
      contents,
      tools: GOOGLE_TOOL_DECLARATIONS,
      generationConfig: { temperature: 1.0, maxOutputTokens: 8192 },
    };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };

    // Step 1: Non-streaming call to check for tool calls
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const firstRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!firstRes.ok) return false;
    const firstData = await firstRes.json();
    const firstParts = firstData.candidates?.[0]?.content?.parts || [];
    const toolCalls = firstParts.filter(p => p.functionCall);

    if (toolCalls.length === 0) return false; // No tool calls — let plain streaming handle it

    // Step 2: Execute tool calls and build function responses
    const toolResponses = toolCalls.map(tc => ({
      functionResponse: {
        name: tc.functionCall.name,
        response: JSON.parse(executeTool(tc.functionCall.name, tc.functionCall.args || {})),
      },
    }));

    // Step 3: Streaming call with tool results
    const updatedContents = [
      ...contents,
      { role: 'model', parts: firstParts },
      { role: 'user', parts: toolResponses },
    ];
    const streamBody = { contents: updatedContents, generationConfig: { temperature: 1.0, maxOutputTokens: 8192 } };
    if (systemInstruction) streamBody.systemInstruction = { parts: [{ text: systemInstruction.content }] };

    const streamRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(streamBody) }
    );
    if (!streamRes.ok) return false;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', sentAny = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const parts = JSON.parse(line.slice(6)).candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text && !part.thought) {
              res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: part.text }, done: false, provider: 'gemma4+tools' })}\n\n`);
              sentAny = true;
            }
          }
        } catch {}
      }
    }
    if (sentAny) {
      res.write(`data: ${JSON.stringify({ message: { role: 'assistant', content: '' }, done: true, provider: 'gemma4+tools' })}\n\n`);
    }
    res.end();
    return sentAny;
  } catch { return false; }
}
