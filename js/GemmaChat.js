/**
 * @deprecated Not used by main app flow. SimulationManager._sendToOllama handles chat directly.
 * Kept for reference. May be removed in future cleanup.
 *
 * GemmaChat — Ollama streaming chat client with simulation parameter extraction.
 *
 * Communicates with the Express /api/chat SSE endpoint, manages conversation
 * history, extracts SimConfig JSON from Gemma 4 responses, and provides
 * keyword-based NLP fallback when Ollama is offline.
 */

const SYSTEM_PROMPT = `You are a physics education expert specializing in structural and particle simulations.
Your role is to help students understand physics concepts through interactive 3D simulations.

When a user describes a scenario, respond with:
1. A clear, natural-language explanation using SI units (meters, kilograms, Newtons, Pascals, etc.)
2. A JSON configuration block that the simulation engine can use to set up the scenario.
3. One or two follow-up questions the student could explore next.

The JSON block MUST be wrapped in a fenced code block and follow this exact format:

\`\`\`json
{
  "simulation": {
    "prompt": "<structure_type>",
    "physics": {
      "gravity": -9.81,
      "damping": 0.97,
      "springStiffness": 20,
      "density": 2.4,
      "yieldStrength": 40,
      "temperature": 293,
      "seismic": 0,
      "seismicFreq": 0,
      "foundation": 0,
      "windX": 0,
      "windY": 0,
      "windZ": 0,
      "friction": 0.5,
      "bounciness": 0.3
    }
  }
}
\`\`\`

Only include physics properties that differ from the defaults above.
You support both Korean and English. Respond in the same language the user uses.`;

/**
 * Default physics values used by the simulation engine.
 */
const DEFAULT_PHYSICS = {
  gravity: -9.81,
  damping: 0.97,
  springStiffness: 20,
  density: 2.4,
  yieldStrength: 40,
  temperature: 293,
  seismic: 0,
  seismicFreq: 0,
  foundation: 0,
  windX: 0,
  windY: 0,
  windZ: 0,
  friction: 0.5,
  bounciness: 0.3,
};

/**
 * Keyword-based fallback rules for when Ollama is offline.
 * Each rule has pattern(s) and the params it maps to.
 */
const FALLBACK_RULES = [
  {
    patterns: [/다리/i, /bridge/i],
    config: { prompt: 'bridge', physics: { springStiffness: 30, density: 7.8 } },
  },
  {
    patterns: [/건물/i, /building/i],
    config: { prompt: 'building', physics: { springStiffness: 25, density: 2.4 } },
  },
  {
    patterns: [/지진/i, /earthquake/i],
    config: { prompt: null, physics: { seismic: 6, seismicFreq: 2.5 } },
  },
  {
    patterns: [/자유\s*낙하/i, /free\s*fall/i],
    config: { prompt: 'freefall', physics: { gravity: -9.81 } },
  },
];

export default class GemmaChat {
  /**
   * @param {string} apiEndpoint - Server chat endpoint (default '/api/chat')
   */
  constructor(apiEndpoint = '/api/chat') {
    /** @type {string} */
    this._apiEndpoint = apiEndpoint;

    /** @type {import('./interfaces.js').Message[]} */
    this._history = [{ role: 'system', content: SYSTEM_PROMPT }];

    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  // ------------------------------------------------------------------
  // Event emitter
  // ------------------------------------------------------------------

  /**
   * Register an event listener.
   * @param {'stream'|'params'|'error'|'complete'} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Remove a previously registered listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  _emit(event, ...args) {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(...args);
        } catch {
          // listener errors must not break the stream
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // History management
  // ------------------------------------------------------------------

  /**
   * Return a copy of the conversation history (including system prompt).
   * @returns {import('./interfaces.js').Message[]}
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Clear conversation history, keeping the system prompt.
   */
  clearHistory() {
    this._history = [{ role: 'system', content: SYSTEM_PROMPT }];
  }

  // ------------------------------------------------------------------
  // Connection check
  // ------------------------------------------------------------------

  /**
   * Check whether Ollama is reachable via the status endpoint.
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      // Derive status endpoint from the chat endpoint
      const statusUrl = this._apiEndpoint.replace(/\/chat$/, '/status');
      const res = await fetch(statusUrl);
      if (!res.ok) return false;
      const data = await res.json();
      // Connected only when Ollama is running AND the required model is available
      return data.ollama === true && data.model !== null;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Simulation param extraction
  // ------------------------------------------------------------------

  /**
   * Extract a SimConfig from a Gemma response that contains a ```json block.
   * @param {string} fullResponse
   * @returns {import('./interfaces.js').SimConfig|null}
   */
  parseSimulationParams(fullResponse) {
    if (!fullResponse || typeof fullResponse !== 'string') return null;

    // Match fenced json code blocks
    const pattern = /```json\s*([\s\S]*?)```/g;
    let match;

    while ((match = pattern.exec(fullResponse)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && parsed.simulation) {
          const sim = parsed.simulation;
          return {
            prompt: sim.prompt || '',
            physics: { ...DEFAULT_PHYSICS, ...(sim.physics || {}) },
          };
        }
      } catch {
        // malformed JSON — try next block if any
      }
    }

    return null;
  }

  // ------------------------------------------------------------------
  // Fallback NLP
  // ------------------------------------------------------------------

  /**
   * Simple keyword-based parameter extraction for offline use.
   * @param {string} message
   * @returns {import('./interfaces.js').SimConfig|null}
   */
  _fallbackNLP(message) {
    if (!message || typeof message !== 'string') return null;

    let prompt = null;
    const mergedPhysics = { ...DEFAULT_PHYSICS };
    let matched = false;

    for (const rule of FALLBACK_RULES) {
      const hit = rule.patterns.some((re) => re.test(message));
      if (hit) {
        matched = true;
        if (rule.config.prompt) {
          prompt = rule.config.prompt;
        }
        Object.assign(mergedPhysics, rule.config.physics);
      }
    }

    if (!matched) return null;

    return {
      prompt: prompt || 'custom',
      physics: mergedPhysics,
    };
  }

  // ------------------------------------------------------------------
  // send()
  // ------------------------------------------------------------------

  /**
   * Send a user message to the chat endpoint and stream the response.
   *
   * Returns a ReadableStream whose chunks are the content strings emitted by
   * the server.  Also emits events: 'stream', 'complete', 'params', 'error'.
   *
   * If the server is unreachable the method falls back to keyword NLP, emits
   * the fallback result, and returns a closed stream.
   *
   * @param {string} message
   * @returns {ReadableStream}
   */
  send(message) {
    // Push user message into history
    this._history.push({ role: 'user', content: message });

    const chat = this; // capture for the ReadableStream callbacks
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch(chat._apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chat._history }),
          });

          if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
          }

          const reader = res.body.getReader();
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
              if (!trimmed) continue;

              // SSE lines start with "data: "
              if (!trimmed.startsWith('data: ')) continue;

              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                const chunk = data?.message?.content;
                if (chunk) {
                  fullResponse += chunk;
                  controller.enqueue(chunk);
                  chat._emit('stream', chunk);
                }
                if (data.done) break;
              } catch {
                // ignore unparseable SSE frames
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const chunk = data?.message?.content;
                if (chunk) {
                  fullResponse += chunk;
                  controller.enqueue(chunk);
                  chat._emit('stream', chunk);
                }
              } catch {
                // ignore
              }
            }
          }

          // Store assistant reply in history
          if (fullResponse) {
            chat._history.push({ role: 'assistant', content: fullResponse });
          }

          chat._emit('complete', fullResponse);

          // Try to extract simulation params
          const params = chat.parseSimulationParams(fullResponse);
          if (params) {
            chat._emit('params', params);
          }

          controller.close();
        } catch (err) {
          // ---- Fallback NLP path ----
          const fallbackParams = chat._fallbackNLP(message);

          if (fallbackParams) {
            const fallbackText = `[Offline mode] Detected simulation parameters from your message.`;
            chat._history.push({ role: 'assistant', content: fallbackText });
            controller.enqueue(fallbackText);
            chat._emit('stream', fallbackText);
            chat._emit('complete', fallbackText);
            chat._emit('params', fallbackParams);
          } else {
            chat._emit('error', err);
          }

          controller.close();
        }
      },
    });

    return stream;
  }
}

export { SYSTEM_PROMPT, DEFAULT_PHYSICS, FALLBACK_RULES };
