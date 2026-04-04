import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GemmaChat, { SYSTEM_PROMPT, DEFAULT_PHYSICS } from '../../js/GemmaChat.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock SSE response body from an array of content strings.
 * Each chunk becomes one SSE "data:" line wrapping Ollama JSON.
 */
function mockSSEStream(chunks, { includeEmpty = false } = {}) {
  const lines = chunks.map((content, i) => {
    const done = i === chunks.length - 1;
    return `data: ${JSON.stringify({ message: { content }, done })}\n\n`;
  });

  if (includeEmpty) {
    lines.unshift('\n');
  }

  const text = lines.join('');
  const encoded = new TextEncoder().encode(text);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
}

/**
 * Collect all chunks from a ReadableStream into a single string.
 */
async function drainStream(stream) {
  const reader = stream.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GemmaChat', () => {
  /** @type {GemmaChat} */
  let chat;

  beforeEach(() => {
    chat = new GemmaChat('/api/chat');
    // Reset global fetch mock before each test
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===== parseSimulationParams =============================================

  describe('parseSimulationParams', () => {
    it('extracts SimConfig from a valid JSON block', () => {
      const response = `Here is a bridge simulation:

\`\`\`json
{
  "simulation": {
    "prompt": "bridge",
    "physics": {
      "springStiffness": 30,
      "density": 7.8
    }
  }
}
\`\`\`

Try changing the density!`;

      const result = chat.parseSimulationParams(response);

      expect(result).not.toBeNull();
      expect(result.prompt).toBe('bridge');
      expect(result.physics.springStiffness).toBe(30);
      expect(result.physics.density).toBe(7.8);
      // defaults should be merged in
      expect(result.physics.gravity).toBe(DEFAULT_PHYSICS.gravity);
      expect(result.physics.damping).toBe(DEFAULT_PHYSICS.damping);
    });

    it('returns null when there is no JSON block', () => {
      const response = 'This is a plain text answer about bridges.';
      expect(chat.parseSimulationParams(response)).toBeNull();
    });

    it('returns null for malformed JSON inside a code block', () => {
      const response = '```json\n{ broken json !!!\n```';
      expect(chat.parseSimulationParams(response)).toBeNull();
    });

    it('returns null for JSON block without "simulation" key', () => {
      const response = '```json\n{ "other": 123 }\n```';
      expect(chat.parseSimulationParams(response)).toBeNull();
    });

    it('returns null for empty / non-string input', () => {
      expect(chat.parseSimulationParams('')).toBeNull();
      expect(chat.parseSimulationParams(null)).toBeNull();
      expect(chat.parseSimulationParams(undefined)).toBeNull();
    });

    it('picks the first valid simulation block when multiple exist', () => {
      const response = `\`\`\`json
{ "notSimulation": true }
\`\`\`
\`\`\`json
{ "simulation": { "prompt": "tower", "physics": { "gravity": -3.7 } } }
\`\`\``;

      const result = chat.parseSimulationParams(response);
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('tower');
      expect(result.physics.gravity).toBe(-3.7);
    });
  });

  // ===== Fallback NLP ======================================================

  describe('Fallback NLP', () => {
    it('"다리" maps to bridge params', () => {
      const result = chat._fallbackNLP('다리를 만들어줘');
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('bridge');
      expect(result.physics.springStiffness).toBe(30);
      expect(result.physics.density).toBe(7.8);
    });

    it('"bridge" maps to bridge params', () => {
      const result = chat._fallbackNLP('Build a bridge');
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('bridge');
    });

    it('"건물" maps to building params', () => {
      const result = chat._fallbackNLP('건물 시뮬레이션');
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('building');
      expect(result.physics.springStiffness).toBe(25);
      expect(result.physics.density).toBe(2.4);
    });

    it('"지진" maps to earthquake params', () => {
      const result = chat._fallbackNLP('지진 시뮬레이션');
      expect(result).not.toBeNull();
      expect(result.physics.seismic).toBe(6);
      expect(result.physics.seismicFreq).toBe(2.5);
    });

    it('"earthquake" maps to earthquake params', () => {
      const result = chat._fallbackNLP('simulate an earthquake');
      expect(result).not.toBeNull();
      expect(result.physics.seismic).toBe(6);
    });

    it('"자유낙하" maps to free fall params', () => {
      const result = chat._fallbackNLP('자유낙하 실험');
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('freefall');
      expect(result.physics.gravity).toBe(-9.81);
    });

    it('merges multiple matched rules', () => {
      const result = chat._fallbackNLP('다리에 지진이 발생');
      expect(result).not.toBeNull();
      expect(result.prompt).toBe('bridge');
      expect(result.physics.seismic).toBe(6);
      expect(result.physics.springStiffness).toBe(30);
    });

    it('returns null for unrecognised input', () => {
      expect(chat._fallbackNLP('hello')).toBeNull();
      expect(chat._fallbackNLP('')).toBeNull();
      expect(chat._fallbackNLP(null)).toBeNull();
    });
  });

  // ===== History management ================================================

  describe('History management', () => {
    it('starts with only the system prompt', () => {
      const history = chat.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('system');
      expect(history[0].content).toBe(SYSTEM_PROMPT);
    });

    it('getHistory returns a copy, not the internal array', () => {
      const h1 = chat.getHistory();
      const h2 = chat.getHistory();
      expect(h1).not.toBe(h2);
      expect(h1).toEqual(h2);
    });

    it('clearHistory resets to system prompt only', () => {
      // Manually push extra messages to simulate conversation
      chat._history.push({ role: 'user', content: 'hello' });
      chat._history.push({ role: 'assistant', content: 'hi' });
      expect(chat.getHistory()).toHaveLength(3);

      chat.clearHistory();
      const history = chat.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('system');
    });
  });

  // ===== checkConnection ===================================================

  describe('checkConnection', () => {
    it('returns true when server reports ollama: true', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ollama: true, model: 'gemma4', models: ['gemma4'] }),
      });

      const result = await chat.checkConnection();
      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/status');
    });

    it('returns false when server reports ollama: false', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ollama: false, model: null, models: [] }),
      });

      expect(await chat.checkConnection()).toBe(false);
    });

    it('returns false when fetch throws (network error)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      expect(await chat.checkConnection()).toBe(false);
    });

    it('returns false when response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false });
      expect(await chat.checkConnection()).toBe(false);
    });
  });

  // ===== on / off events ===================================================

  describe('on / off event listeners', () => {
    it('registers and fires a listener', () => {
      const spy = vi.fn();
      chat.on('stream', spy);
      chat._emit('stream', 'hello');
      expect(spy).toHaveBeenCalledWith('hello');
    });

    it('supports multiple listeners on the same event', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      chat.on('complete', spy1);
      chat.on('complete', spy2);
      chat._emit('complete', 'done');
      expect(spy1).toHaveBeenCalledWith('done');
      expect(spy2).toHaveBeenCalledWith('done');
    });

    it('off removes a specific listener', () => {
      const spy = vi.fn();
      chat.on('error', spy);
      chat.off('error', spy);
      chat._emit('error', new Error('test'));
      expect(spy).not.toHaveBeenCalled();
    });

    it('off on non-existent event does not throw', () => {
      const spy = vi.fn();
      expect(() => chat.off('nonexistent', spy)).not.toThrow();
    });

    it('listener errors do not propagate', () => {
      chat.on('stream', () => {
        throw new Error('boom');
      });
      const spy = vi.fn();
      chat.on('stream', spy);

      // Should not throw and the second listener should still fire
      expect(() => chat._emit('stream', 'data')).not.toThrow();
      expect(spy).toHaveBeenCalledWith('data');
    });
  });

  // ===== send() ============================================================

  describe('send', () => {
    it('streams chunks from a successful SSE response', async () => {
      const sseBody = mockSSEStream(['Hello', ' world', '!']);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: sseBody,
      });

      const streamChunks = [];
      chat.on('stream', (chunk) => streamChunks.push(chunk));

      const completeSpy = vi.fn();
      chat.on('complete', completeSpy);

      const stream = chat.send('hi');
      const result = await drainStream(stream);

      expect(result).toBe('Hello world!');
      expect(streamChunks).toEqual(['Hello', ' world', '!']);
      expect(completeSpy).toHaveBeenCalledWith('Hello world!');
    });

    it('adds user and assistant messages to history', async () => {
      const sseBody = mockSSEStream(['response text']);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: sseBody,
      });

      const stream = chat.send('test message');
      await drainStream(stream);

      const history = chat.getHistory();
      expect(history).toHaveLength(3); // system + user + assistant
      expect(history[1]).toEqual({ role: 'user', content: 'test message' });
      expect(history[2]).toEqual({ role: 'assistant', content: 'response text' });
    });

    it('emits params when response contains simulation JSON', async () => {
      const jsonBlock = '```json\n{"simulation":{"prompt":"bridge","physics":{"springStiffness":30}}}\n```';
      const sseBody = mockSSEStream([jsonBlock]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: sseBody,
      });

      const paramsSpy = vi.fn();
      chat.on('params', paramsSpy);

      const stream = chat.send('build a bridge');
      await drainStream(stream);

      expect(paramsSpy).toHaveBeenCalledTimes(1);
      const params = paramsSpy.mock.calls[0][0];
      expect(params.prompt).toBe('bridge');
      expect(params.physics.springStiffness).toBe(30);
    });

    it('falls back to NLP and emits params on fetch failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Offline'));

      const paramsSpy = vi.fn();
      const errorSpy = vi.fn();
      chat.on('params', paramsSpy);
      chat.on('error', errorSpy);

      const stream = chat.send('다리를 만들어줘');
      await drainStream(stream);

      // Should emit params from fallback NLP
      expect(paramsSpy).toHaveBeenCalledTimes(1);
      expect(paramsSpy.mock.calls[0][0].prompt).toBe('bridge');

      // Should NOT emit error because fallback succeeded
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('emits error when fetch fails and no NLP match', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Offline'));

      const errorSpy = vi.fn();
      chat.on('error', errorSpy);

      const stream = chat.send('random gibberish');
      await drainStream(stream);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('emits error when server returns non-ok status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const errorSpy = vi.fn();
      chat.on('error', errorSpy);

      const stream = chat.send('random gibberish');
      await drainStream(stream);

      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('handles empty SSE lines gracefully', async () => {
      const sseBody = mockSSEStream(['ok'], { includeEmpty: true });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: sseBody,
      });

      const stream = chat.send('hi');
      const result = await drainStream(stream);
      expect(result).toBe('ok');
    });
  });
});
