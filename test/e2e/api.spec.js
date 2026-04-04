// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// GET /api/status
// ---------------------------------------------------------------------------
test.describe('GET /api/status', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/api/status');
    expect(res.status()).toBe(200);
  });

  test('response is valid JSON', async ({ request }) => {
    const res = await request.get('/api/status');
    // .json() will throw if the body is not valid JSON
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('has "ollama" boolean field', async ({ request }) => {
    const body = await (await request.get('/api/status')).json();
    expect(typeof body.ollama).toBe('boolean');
  });

  test('has "model" field (string or null)', async ({ request }) => {
    const body = await (await request.get('/api/status')).json();
    expect(body.model === null || typeof body.model === 'string').toBe(true);
  });

  test('has "models" array field', async ({ request }) => {
    const body = await (await request.get('/api/status')).json();
    expect(Array.isArray(body.models)).toBe(true);
  });

  test('response time < 2 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/status');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test('Content-Type is application/json', async ({ request }) => {
    const res = await request.get('/api/status');
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat — validation & error handling
// ---------------------------------------------------------------------------
test.describe('POST /api/chat', () => {
  test('returns 400 when body is empty', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when messages is missing', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { prompt: 'hello' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when messages is not an array', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: 'not-an-array' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when messages is empty array', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('returns error when Ollama unavailable or model missing', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'hello' }] },
    });
    // 503 if Ollama is not running; Ollama's own error status (e.g. 404) if
    // the model is not found. Either way the request must not succeed (2xx).
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.ok()).toBe(false);
  });

  test('Content-Type for error responses is application/json', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {},
    });
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
  });

  test('error response has "error" field', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {},
    });
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
test.describe('CORS', () => {
  test('response has Access-Control-Allow-Origin header', async ({ request }) => {
    const res = await request.get('/api/status');
    expect(res.headers()['access-control-allow-origin']).toBe('*');
  });

  test('OPTIONS preflight returns 204', async ({ request }) => {
    const res = await request.fetch('/api/chat', { method: 'OPTIONS' });
    expect(res.status()).toBe(204);
  });

  test('CORS allows POST method', async ({ request }) => {
    const res = await request.fetch('/api/chat', { method: 'OPTIONS' });
    const allowedMethods = res.headers()['access-control-allow-methods'] || '';
    expect(allowedMethods).toContain('POST');
  });
});

// ---------------------------------------------------------------------------
// Static Files
// ---------------------------------------------------------------------------
test.describe('Static Files', () => {
  test('GET / returns HTML', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('text/html');
  });

  test('GET /css/style.css returns CSS', async ({ request }) => {
    const res = await request.get('/css/style.css');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('text/css');
  });

  test('GET /js/app.js returns JavaScript', async ({ request }) => {
    const res = await request.get('/js/app.js');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('javascript');
  });

  test('GET /js/PhysicsEngine.js returns JavaScript', async ({ request }) => {
    const res = await request.get('/js/PhysicsEngine.js');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct).toContain('javascript');
  });

  test('GET /nonexistent returns 404', async ({ request }) => {
    const res = await request.get('/nonexistent-path-' + Date.now());
    expect(res.status()).toBe(404);
  });

  test('static files have correct content-type', async ({ request }) => {
    // Verify a sampling of content-types for different file extensions
    const expectations = [
      { path: '/', type: 'text/html' },
      { path: '/css/style.css', type: 'text/css' },
      { path: '/js/app.js', type: 'javascript' },
    ];
    for (const { path, type } of expectations) {
      const res = await request.get(path);
      const ct = res.headers()['content-type'] || '';
      expect(ct).toContain(type);
    }
  });
});

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------
test.describe('Security Headers', () => {
  test('no server version leak in headers', async ({ request }) => {
    const res = await request.get('/api/status');
    const headers = res.headers();
    // Express sets "x-powered-by: Express" by default — check it is not leaking version numbers
    const xPowered = headers['x-powered-by'] || '';
    // Should not contain version numbers (e.g. "Express/4.18.2")
    expect(xPowered).not.toMatch(/\d+\.\d+/);

    // Should not have a Server header with version info
    const server = headers['server'] || '';
    expect(server).not.toMatch(/\d+\.\d+/);
  });

  test('no sensitive info in error responses', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {},
    });
    const body = await res.text();
    const lower = body.toLowerCase();
    // Error responses should not contain stack traces or internal paths
    expect(lower).not.toContain('stack');
    expect(lower).not.toContain('node_modules');
    expect(lower).not.toContain('at module');
    expect(lower).not.toContain('at object');
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
test.describe('Error Handling', () => {
  test('malformed JSON body returns appropriate error', async ({ request }) => {
    // Send raw text that is not valid JSON with the JSON content-type
    const res = await request.fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{ invalid json !!!',
    });
    // Express returns 400 for malformed JSON by default
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('very large body is handled without crash', async ({ request }) => {
    // Send a 1 MB payload — the server should respond without crashing
    const largePayload = { messages: 'x'.repeat(1_000_000) };
    const res = await request.post('/api/chat', {
      data: largePayload,
    });
    // Should get a 400 (messages is not an array) rather than a crash
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(600);
  });
});
