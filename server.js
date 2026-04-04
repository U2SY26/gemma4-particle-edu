import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// --- Routes will be added by Agent 1D ---

// GET /api/status — stub
app.get('/api/status', (req, res) => {
  res.json({ ollama: false, model: null });
});

// POST /api/chat — stub
app.post('/api/chat', (req, res) => {
  res.status(503).json({ error: 'Not implemented yet' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, server };
