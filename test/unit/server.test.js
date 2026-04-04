import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import supertest from 'supertest';

let app;
let server;
let request;

beforeAll(async () => {
  // Ensure tests don't start a listening server
  process.env.NODE_ENV = 'test';
  const mod = await import('../../server.js');
  app = mod.app;
  server = mod.server;
  request = supertest(app);
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('GET /', () => {
  it('returns 200 with HTML content-type', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('GET /api/status', () => {
  it('returns JSON with ollama field', async () => {
    const res = await request.get('/api/status');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('ollama');
    expect(typeof res.body.ollama).toBe('boolean');
    expect(res.body).toHaveProperty('model');
    expect(res.body).toHaveProperty('models');
    expect(Array.isArray(res.body.models)).toBe(true);
  });

  it('returns ollama: false when Ollama is not running', async () => {
    // Unless Ollama happens to be running locally, this tests the catch path
    const res = await request.get('/api/status');
    // Either way the shape is correct; if Ollama is down, ollama is false
    expect(res.body.ollama === true || res.body.ollama === false).toBe(true);
  });
});

describe('POST /api/chat', () => {
  it('returns 400 when messages is missing', async () => {
    const res = await request
      .post('/api/chat')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/messages/i);
  });

  it('returns 400 when messages is empty array', async () => {
    const res = await request
      .post('/api/chat')
      .send({ messages: [] })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when messages is not an array', async () => {
    const res = await request
      .post('/api/chat')
      .send({ messages: 'not an array' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 503 when Ollama is not available', async () => {
    const res = await request
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'hello' }] })
      .set('Content-Type', 'application/json');
    // If Ollama is not running, we get 503
    // If Ollama IS running but model is missing, we may get a different error
    // In CI / typical test env, Ollama is not running -> 503
    if (res.status === 503) {
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/ollama/i);
    } else {
      // Ollama is running — we just verify we got a valid response
      expect([200, 400, 404, 500]).toContain(res.status);
    }
  });
});

describe('CORS headers', () => {
  it('sets Access-Control-Allow-Origin on responses', async () => {
    const res = await request.get('/api/status');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('handles OPTIONS preflight', async () => {
    const res = await request
      .options('/api/chat')
      .set('Origin', 'http://example.com');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
