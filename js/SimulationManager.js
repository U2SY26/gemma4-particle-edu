/**
 * SimulationManager
 * Handles simulation card CRUD, sidebar UI, physics parameter binding,
 * AI chat interface, and server communication.
 */
import { tPreset } from './i18n.js';

const API_BASE = '';  // Same origin

// Default physics template
const BASE_PHYSICS = {
    gravity: -9.81, damping: 0.97, springStiffness: 20, particleCount: 25000,
    timeScale: 1.0, friction: 0.8, bounciness: 0.3,
    windX: 0, windY: 0, windZ: 0, turbulence: 0,
    viscosity: 0, temperature: 293,
    foundation: 5.0, density: 2.4, elasticity: 0.3, yieldStrength: 50,
    seismic: 0, seismicFreq: 2.0, snowLoad: 0, floodLevel: 0,
};

const p = (overrides) => ({ ...BASE_PHYSICS, ...overrides });

// Domain-specific physics defaults — applied when Gemma 4 specifies a domain
const DOMAIN_PHYSICS = {
    physics:       { gravity: -9.81, damping: 0.97 },
    chemistry:     { gravity: 0, damping: 0.99, viscosity: 0.5 },
    biology:       { gravity: -2.0, damping: 0.95, viscosity: 1.0 },
    astronomy:     { gravity: 0, damping: 0.999, turbulence: 0.5 },
    earth_science: { gravity: -9.81, damping: 0.90 },
    engineering:   { gravity: -9.81, damping: 0.97 },
    mathematics:   { gravity: 0, damping: 0.999 },
};

// Default physics presets for quick card creation
const PRESETS = [
    // ========== BUILDINGS ==========
    { name: '1층 주택',         prompt: 'house',                tags: ['building', '1F'],     physics: p({ springStiffness: 18, foundation: 4 }) },
    { name: '2층 건물',         prompt: '2층 건물',              tags: ['building', '2F'],     physics: p({ springStiffness: 20, foundation: 5 }) },
    { name: '3층 건물',         prompt: '3층 건물',              tags: ['building', '3F'],     physics: p({ springStiffness: 22, foundation: 5 }) },
    { name: '5층 아파트',       prompt: '5층 건물',              tags: ['building', '5F'],     physics: p({ springStiffness: 25, foundation: 6 }) },
    { name: '10층 오피스',      prompt: '10층 건물',             tags: ['building', '10F'],    physics: p({ springStiffness: 30, foundation: 7 }) },
    { name: '20층 타워',        prompt: '20층 건물',             tags: ['building', 'high'],   physics: p({ springStiffness: 40, foundation: 8, density: 2.5 }) },
    { name: '강철 고층빌딩',     prompt: 'tall skyscraper',       tags: ['building', 'steel'],  physics: p({ springStiffness: 60, foundation: 9, density: 7.8, yieldStrength: 90, elasticity: 0.2 }) },
    { name: '목조 주택',        prompt: 'small house',           tags: ['building', 'wood'],   physics: p({ springStiffness: 12, foundation: 3, density: 0.6, yieldStrength: 20, elasticity: 0.5 }) },
    { name: '콘크리트 건물',     prompt: '5층 건물',              tags: ['building', 'concrete'], physics: p({ springStiffness: 35, foundation: 7, density: 2.4, yieldStrength: 45, elasticity: 0.15 }) },
    { name: '유리 건물',        prompt: '10층 건물',             tags: ['building', 'glass'],  physics: p({ springStiffness: 15, foundation: 6, density: 2.5, yieldStrength: 15, elasticity: 0.1 }) },
    { name: '지진 내진 건물',    prompt: '5층 건물',              tags: ['building', 'seismic'], physics: p({ springStiffness: 45, foundation: 9, seismic: 5, seismicFreq: 3.0, elasticity: 0.4 }) },
    { name: '약한 기초 건물',    prompt: '3층 건물',              tags: ['building', 'weak'],   physics: p({ springStiffness: 10, foundation: 1.5, density: 2.4, yieldStrength: 20 }) },

    // ========== BRIDGES ==========
    { name: '소형 인도교',       prompt: 'small bridge',          tags: ['bridge', 'small'],    physics: p({ springStiffness: 20, foundation: 4, density: 2.0 }) },
    { name: '중형 다리',        prompt: 'bridge',                tags: ['bridge', 'medium'],   physics: p({ springStiffness: 30, foundation: 6, density: 2.4 }) },
    { name: '대형 현수교',       prompt: 'large bridge',          tags: ['bridge', 'large'],    physics: p({ springStiffness: 40, foundation: 8, density: 7.8 }) },
    { name: '강풍 다리',        prompt: 'wide bridge',           tags: ['bridge', 'wind'],     physics: p({ springStiffness: 25, windX: 10, windZ: 3, turbulence: 4, foundation: 6 }) },
    { name: '강철 트러스교',     prompt: 'large bridge',          tags: ['bridge', 'steel'],    physics: p({ springStiffness: 55, foundation: 9, density: 7.8, yieldStrength: 85 }) },
    { name: '목재 다리',        prompt: 'small bridge',          tags: ['bridge', 'wood'],     physics: p({ springStiffness: 10, foundation: 3, density: 0.5, yieldStrength: 15, elasticity: 0.6 }) },
    { name: '지진 다리 테스트',  prompt: 'bridge',                tags: ['bridge', 'seismic'],  physics: p({ springStiffness: 30, seismic: 6, seismicFreq: 2.5, foundation: 7 }) },
    { name: '적설 다리',        prompt: 'bridge',                tags: ['bridge', 'snow'],     physics: p({ springStiffness: 28, snowLoad: 5, foundation: 6 }) },
    { name: '홍수 다리',        prompt: 'bridge',                tags: ['bridge', 'flood'],    physics: p({ springStiffness: 30, floodLevel: 4, viscosity: 1.5, foundation: 6 }) },
    { name: '약한 기초 다리',    prompt: 'bridge',                tags: ['bridge', 'weak'],     physics: p({ springStiffness: 15, foundation: 1.0, yieldStrength: 15 }) },

    // ========== TOWERS ==========
    { name: '전망 타워',        prompt: 'tall tower',            tags: ['tower', 'tall'],      physics: p({ springStiffness: 35, foundation: 7 }) },
    { name: '강풍 타워',        prompt: 'tower',                 tags: ['tower', 'wind'],      physics: p({ springStiffness: 15, windX: 12, windY: 3, windZ: -5, turbulence: 5 }) },
    { name: '지진 타워',        prompt: 'tower',                 tags: ['tower', 'seismic'],   physics: p({ springStiffness: 25, seismic: 7, seismicFreq: 4.0 }) },

    // ========== SPECIAL STRUCTURES ==========
    { name: '고딕 성당',        prompt: 'gothic cathedral',      tags: ['cathedral', 'gothic'], physics: p({ springStiffness: 25, foundation: 7, density: 2.6 }) },
    { name: '고전 사원',        prompt: 'classical temple',      tags: ['temple', 'classical'], physics: p({ springStiffness: 30, foundation: 8, density: 2.7 }) },
    { name: '미니어처 성',       prompt: 'small castle',          tags: ['castle', 'mini'],     physics: p({ springStiffness: 35, foundation: 8, particleCount: 15000 }) },
    { name: '거대 피라미드',     prompt: 'huge pyramid',          tags: ['pyramid', 'huge'],    physics: p({ springStiffness: 50, foundation: 10, density: 2.3, yieldStrength: 80 }) },
    { name: '경기장',           prompt: 'stadium',               tags: ['stadium', 'large'],   physics: p({ springStiffness: 22 }) },
    { name: '대형 돔',          prompt: 'large dome',            tags: ['dome', 'large'],      physics: p({ springStiffness: 28, foundation: 6 }) },
    { name: '아치 게이트',       prompt: '3 arch',               tags: ['arch', 'gate'],       physics: p({ springStiffness: 22 }) },
    { name: '성벽',             prompt: 'wide wall',             tags: ['wall', 'defense'],    physics: p({ springStiffness: 35, foundation: 8, density: 2.5 }) },

    // ========== WEATHER / ATMOSPHERIC PHYSICS ==========
    // Weather physics inspired by NVIDIA Earth-2 atmospheric modeling
    // Reference: https://developer.nvidia.com/earth-2
    // Atmospheric parameters derived from real physics:
    //   - Temperature: Kelvin (affects particle velocity via Boltzmann distribution)
    //   - Wind: m/s (pressure differential → particle drift)
    //   - Turbulence: Reynolds-number-inspired chaotic motion
    //   - Damping: viscous drag from air density at altitude
    //   - Gravity reduction: buoyancy effects in convective systems
    { name: '태풍 시뮬레이션',   prompt: 'tornado',               tags: ['weather', 'typhoon'],   physics: p({ gravity: -0.5, damping: 0.92, windX: 12, windZ: 8, turbulence: 8, viscosity: 0.3, temperature: 305, particleCount: 30000 }) },
    { name: '적란운 형성',       prompt: 'cloud',                 tags: ['weather', 'cloud'],     physics: p({ gravity: -0.2, damping: 0.98, windY: 5, turbulence: 3, viscosity: 0.5, temperature: 253, particleCount: 20000 }) },
    { name: '폭풍우',           prompt: 'rain',                  tags: ['weather', 'storm'],     physics: p({ gravity: -9.81, damping: 0.85, windX: 8, turbulence: 6, viscosity: 1.0, temperature: 288, particleCount: 25000 }) },
    { name: '눈보라',           prompt: 'rain',                  tags: ['weather', 'blizzard'],  physics: p({ gravity: -2.0, damping: 0.95, windX: 15, windZ: 10, turbulence: 7, viscosity: 0.1, temperature: 250, particleCount: 20000 }) },
    { name: '오로라',           prompt: 'magnet',                tags: ['weather', 'aurora'],    physics: p({ gravity: 0, damping: 0.995, windY: 2, turbulence: 1, viscosity: 0, temperature: 200, particleCount: 15000 }) },

    // ========== EXPERIMENTS ==========
    { name: '무중력 파티클',     prompt: 'sphere',                tags: ['zero-g', 'experiment'], physics: p({ gravity: 0, damping: 0.99, springStiffness: 5, bounciness: 0.9, friction: 0.1 }) },
    { name: '강한 중력',        prompt: 'cube',                  tags: ['gravity', 'heavy'],   physics: p({ gravity: -25, springStiffness: 8, bounciness: 0.1 }) },
    { name: '역중력',           prompt: 'pyramid',               tags: ['anti-gravity'],        physics: p({ gravity: 5, damping: 0.95, springStiffness: 10 }) },
    { name: '탄성 구조',        prompt: 'dome',                  tags: ['elastic', 'bouncy'],  physics: p({ springStiffness: 8, bounciness: 0.85, elasticity: 0.8, damping: 0.98, friction: 0.4 }) },
    { name: '점성 유체',        prompt: 'sphere',                tags: ['fluid', 'viscous'],   physics: p({ gravity: -4.0, damping: 0.85, springStiffness: 3, viscosity: 4.0, friction: 0.95, bounciness: 0.05, temperature: 350 }) },
    { name: '고온 플라즈마',     prompt: 'sphere',                tags: ['plasma', 'hot'],      physics: p({ gravity: 0.5, damping: 0.90, springStiffness: 2, particleCount: 30000, bounciness: 0.7, friction: 0.1, windY: 5, viscosity: 0.2, temperature: 4500 }) },
    { name: '극저온 동결',       prompt: 'cube',                  tags: ['cryo', 'frozen'],     physics: p({ temperature: 5, damping: 0.999, springStiffness: 50, friction: 0.99, bounciness: 0.01 }) },
    { name: '슬로우모션',       prompt: 'tower',                 tags: ['slow', 'cinematic'],  physics: p({ timeScale: 0.2, springStiffness: 20 }) },
    { name: '고속 시뮬',        prompt: 'tower',                 tags: ['fast', 'speed'],      physics: p({ timeScale: 3.0, springStiffness: 20 }) },
];

export class SimulationManager {
    constructor(onCardSelect, onPhysicsChange) {
        this.cards = [];
        this.activeCardId = null;
        this.serverOnline = false;
        this._ollamaAvailable = false;
        this._chatHistory = [];
        this.onCardSelect = onCardSelect;       // callback(card)
        this.onPhysicsChange = onPhysicsChange; // callback(physicsParams)

        this._initUI();
        this._checkServer();
        this._loadCards();
    }

    // ==================== SERVER ====================

    async _checkServer() {
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            if (res.ok) {
                this.serverOnline = true;
                document.getElementById('server-dot').classList.add('online');
                document.getElementById('server-label').textContent = 'ONLINE';
                this._loadHistory();
            }
        } catch {
            this.serverOnline = false;
        }

        // Check Ollama availability separately
        try {
            const res = await fetch(`${API_BASE}/api/ollama/status`);
            if (res.ok) {
                const data = await res.json();
                this._ollamaAvailable = data.ollama === true && data.model !== null;
                if (this._ollamaAvailable) {
                    document.getElementById('server-label').textContent = `ONLINE (Gemma)`;
                }
            }
        } catch {
            this._ollamaAvailable = false;
        }
    }

    // ==================== CARDS CRUD ====================

    async _loadCards() {
        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`);
                this.cards = await res.json();
            } catch {
                this.cards = [];
            }
        }

        // If no cards (first run or offline), create from presets
        if (this.cards.length === 0) {
            this.cards = PRESETS.map((p, i) => ({
                id: `preset-${i}`,
                name: p.name,
                prompt: p.prompt,
                tags: p.tags,
                physics: { ...p.physics },
                chat: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
            }));

            // Save to server if online
            if (this.serverOnline) {
                for (const card of this.cards) {
                    try {
                        const res = await fetch(`${API_BASE}/api/cards`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(card),
                        });
                        const saved = await res.json();
                        card.id = saved.id; // Use server-assigned ID
                    } catch {}
                }
            }
        }

        this._renderCardList();

        // Auto-select first card
        if (this.cards.length > 0) {
            this.selectCard(this.cards[0].id);
        }
    }

    async createCard(name, prompt, physics) {
        const card = {
            id: `local-${Date.now()}`,
            name: name || 'New Simulation',
            prompt: prompt || '',
            tags: [],
            physics: physics || { ...PRESETS[0].physics },
            chat: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            worldModel: { engine: null, sceneId: null, exportFormat: null, metadata: {} },
        };

        if (this.serverOnline) {
            try {
                const res = await fetch(`${API_BASE}/api/cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
                const saved = await res.json();
                card.id = saved.id;
            } catch {}
        }

        this.cards.unshift(card);
        this._renderCardList();
        this.selectCard(card.id);
        return card;
    }

    async deleteCard(id) {
        this.cards = this.cards.filter(c => c.id !== id);
        if (this.serverOnline) {
            try { await fetch(`${API_BASE}/api/cards/${id}`, { method: 'DELETE' }); } catch {}
        }

        if (this.activeCardId === id) {
            this.activeCardId = null;
            document.getElementById('card-detail').classList.add('hidden');
            if (this.cards.length > 0) this.selectCard(this.cards[0].id);
        }
        this._renderCardList();
    }

    async duplicateCard(id) {
        const original = this.cards.find(c => c.id === id);
        if (!original) return;
        await this.createCard(
            original.name + ' (copy)',
            original.prompt,
            { ...original.physics }
        );
    }

    async updateCard(id, updates) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;
        Object.assign(card, updates, { updatedAt: new Date().toISOString() });

        if (this.serverOnline) {
            try {
                await fetch(`${API_BASE}/api/cards/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card),
                });
            } catch {}
        }
    }

    // ==================== CARD SELECTION ====================

    selectCard(id) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return;

        this.activeCardId = id;

        // Update active styling
        document.querySelectorAll('.sim-card').forEach(el => el.classList.remove('active'));
        const cardEl = document.querySelector(`.sim-card[data-id="${id}"]`);
        if (cardEl) cardEl.classList.add('active');

        // Show detail panel
        document.getElementById('card-detail').classList.remove('hidden');

        // Update physics sliders
        this._syncPhysicsUI(card.physics);

        // Update chat messages
        this._renderChat(card.chat);

        // Update prompt input
        document.getElementById('prompt-input').value = card.prompt;

        // Notify app
        if (this.onCardSelect) this.onCardSelect(card);
    }

    getActiveCard() {
        return this.cards.find(c => c.id === this.activeCardId) || null;
    }

    // ==================== UI RENDERING ====================

    _renderCardList() {
        const list = document.getElementById('card-list');
        list.innerHTML = '';

        for (const card of this.cards) {
            const el = document.createElement('div');
            el.className = `sim-card${card.id === this.activeCardId ? ' active' : ''}`;
            el.dataset.id = card.id;

            const tagsHtml = (card.tags || [])
                .map(t => `<span class="card-tag">${t}</span>`)
                .join('');

            const timeAgo = this._timeAgo(card.updatedAt);

            const displayName = tPreset(card.name) || card.name;
            el.innerHTML = `
                <div class="card-name">${this._escapeHtml(displayName)}</div>
                <div class="card-prompt">${this._escapeHtml(card.prompt || 'No prompt')}</div>
                <div class="card-meta">
                    <div class="card-tags">${tagsHtml}</div>
                    <span>${timeAgo}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn dup" title="Duplicate">&#9851;</button>
                    <button class="card-action-btn delete" title="Delete">&times;</button>
                </div>
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.card-action-btn')) return;
                this.selectCard(card.id);
            });

            el.querySelector('.dup').addEventListener('click', () => this.duplicateCard(card.id));
            el.querySelector('.delete').addEventListener('click', () => this.deleteCard(card.id));

            list.appendChild(el);
        }
    }

    _renderChat(messages) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (!messages || messages.length === 0) {
            container.innerHTML = `<div class="chat-msg system">AI와 대화하며 물리 파라미터를 조정하세요</div>`;
            return;
        }

        for (const msg of messages) {
            const el = document.createElement('div');
            el.className = `chat-msg ${msg.role}`;
            el.textContent = msg.content;
            container.appendChild(el);
        }

        container.scrollTop = container.scrollHeight;
    }

    // ==================== PHYSICS UI SYNC ====================

    _syncPhysicsUI(physics) {
        const paramMap = {
            'param-gravity': physics.gravity,
            'param-damping': physics.damping,
            'param-springK': physics.springStiffness,
            'param-timeScale': physics.timeScale,
            'param-friction': physics.friction,
            'param-bounciness': physics.bounciness,
            'param-particles': physics.particleCount,
            'param-foundation': physics.foundation,
            'param-density': physics.density,
            'param-elasticity': physics.elasticity,
            'param-yieldStrength': physics.yieldStrength,
            'param-windX': physics.windX,
            'param-windY': physics.windY,
            'param-windZ': physics.windZ,
            'param-turbulence': physics.turbulence,
            'param-viscosity': physics.viscosity,
            'param-temperature': physics.temperature,
            'param-seismic': physics.seismic,
            'param-seismicFreq': physics.seismicFreq,
            'param-snowLoad': physics.snowLoad,
            'param-floodLevel': physics.floodLevel,
        };

        for (const [id, val] of Object.entries(paramMap)) {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = val;
                const display = document.querySelector(`.param-value[data-for="${id}"]`);
                if (display) display.textContent = this._formatValue(id, val);
            }
        }
    }

    _getPhysicsFromUI() {
        const g = (id) => parseFloat(document.getElementById(id).value);
        return {
            gravity: g('param-gravity'),
            damping: g('param-damping'),
            springStiffness: g('param-springK'),
            timeScale: g('param-timeScale'),
            friction: g('param-friction'),
            bounciness: g('param-bounciness'),
            particleCount: parseInt(document.getElementById('param-particles').value),
            foundation: g('param-foundation'),
            density: g('param-density'),
            elasticity: g('param-elasticity'),
            yieldStrength: g('param-yieldStrength'),
            windX: g('param-windX'),
            windY: g('param-windY'),
            windZ: g('param-windZ'),
            turbulence: g('param-turbulence'),
            viscosity: g('param-viscosity'),
            temperature: g('param-temperature'),
            seismic: g('param-seismic'),
            seismicFreq: g('param-seismicFreq'),
            snowLoad: g('param-snowLoad'),
            floodLevel: g('param-floodLevel'),
        };
    }

    _formatValue(id, val) {
        if (id === 'param-particles') return Math.round(val).toString();
        if (id === 'param-temperature') return Math.round(val).toString();
        return parseFloat(val).toFixed(2);
    }

    // ==================== CHAT ====================

    async addChatMessage(role, content) {
        const card = this.getActiveCard();
        if (!card) return;

        const msg = { role, content, timestamp: new Date().toISOString() };
        card.chat.push(msg);
        this._renderChat(card.chat);

        // Save to server
        if (this.serverOnline) {
            try {
                await fetch(`${API_BASE}/api/cards/${card.id}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(msg),
                });
            } catch {}
        }

        return msg;
    }

    async _handleChatSubmit() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        this.addChatMessage('user', content);
        this._chatHistory.push({ role: 'user', content });

        // Try Ollama SSE first, fall back to keyword NLP
        const ollamaResponse = await this._sendToOllama(content);

        if (ollamaResponse) {
            // Finalize streaming message into a permanent chat message
            this._finalizeStreamingMessage();
            this.addChatMessage('assistant', ollamaResponse);
            this._chatHistory.push({ role: 'assistant', content: ollamaResponse });

            // Extract simulation parameters from Gemma response
            const simParams = this._extractSimParams(ollamaResponse);
            if (simParams) {
                const card = this.getActiveCard();
                if (card) {
                    if (simParams.physics) {
                        Object.assign(card.physics, simParams.physics);
                        this._syncPhysicsUI(card.physics);
                        if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                    }

                    // Store particle spec on card for universal pipeline
                    if (simParams.particles) {
                        card.particleSpec = simParams.particles;
                        card.prompt = simParams.prompt || 'custom';
                        if (simParams.title) card.name = simParams.title;
                        document.getElementById('prompt-input').value = card.prompt;
                        if (this.onCardSelect) this.onCardSelect(card);
                    } else if (simParams.prompt) {
                        // Clear any previous particle spec — fall back to template
                        card.particleSpec = null;
                        card.prompt = simParams.prompt;
                        document.getElementById('prompt-input').value = simParams.prompt;
                        if (this.onCardSelect) this.onCardSelect(card);
                    }

                    // Save to history
                    this._saveToHistory({
                        query: content,
                        title: simParams.title || simParams.prompt || 'Simulation',
                        domain: simParams.domain || 'general',
                        description: simParams.description || '',
                        prompt: simParams.prompt,
                        physics: card.physics,
                        particleSpec: simParams.particles || null,
                        aiResponse: ollamaResponse,
                        particleCount: card.physics.particleCount || 25000,
                    });
                }
            }
        } else {
            // Fallback to keyword NLP
            const response = this._processNaturalLanguage(content);
            this.addChatMessage('assistant', response);
            this._chatHistory.push({ role: 'assistant', content: response });
        }
    }

    // ==================== OLLAMA SSE CHAT ====================

    async _sendToOllama(userMessage) {
        const SYSTEM_PROMPT = `You are a friendly, passionate science educator and particle simulation AI for Gemma 4 Particle Edu.
Your personality: warm, curious, encouraging. You LOVE helping people explore science through interactive 3D simulations.

## How to Respond
1. **Greet the topic enthusiastically** — show genuine excitement about what the user wants to explore.
2. **Explain the science** (2-4 sentences) — use simple, vivid language. Analogies are great! Make it feel like a fun conversation, not a textbook.
3. **Share your thinking** — briefly explain WHY you chose the particle arrangement and physics parameters you did.
4. **ALWAYS include a \`\`\`json block** — this is MANDATORY, every response MUST have it. The simulation won't work without it.
5. **Suggest follow-up experiments** — spark curiosity with "what if" questions.

If the user speaks Korean, respond in casual, friendly Korean (반말/존댓말 mix is fine).
If the user speaks English, respond in warm conversational English.

## Capabilities
- **Physics**: pendulum, wave interference, double slit, electric field, magnetic field, collisions, projectile motion
- **Chemistry**: crystal lattice, molecular orbital, reaction kinetics, water molecule, DNA, proteins
- **Biology**: cell division, protein folding, DNA replication, neuron network, blood flow
- **Astronomy**: nebula, black hole accretion disk, comet trail, binary star, galaxy, solar system
- **Earth Science**: tectonic plates, volcano eruption, ocean current, atmosphere layers, earthquakes
- **Engineering**: stress test, fluid dynamics, heat transfer, aerodynamics, bridge structures
- **Mathematics**: fractal, attractor, topology surface, fibonacci spiral, Platonic solids
- **Architecture**: buildings, bridges, towers, cathedrals, pyramids, stadiums

## JSON Format (MANDATORY in every response)

### Option A — Simple (use a built-in template)
For common structures use a prompt keyword:
\`\`\`json
{
  "simulation": {
    "prompt": "<structure_type>",
    "physics": {
      "gravity": -9.81, "damping": 0.97, "springStiffness": 20,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.8,
      "bounciness": 0.3, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0, "temperature": 293,
      "foundation": 5.0, "density": 2.4,
      "seismic": 0, "seismicFreq": 2.0
    }
  }
}
\`\`\`
Available prompt types: house, tower, bridge, dome, pyramid, cathedral, temple, castle, wall, stadium, arch, sphere, cube, molecule, dna, protein, solar_system, galaxy, asteroid_field, cloud, tornado, rain, water_drop, river, ocean_wave, magnet, electron_cloud

### Option B — Custom (define particle groups for ANY science domain)
For anything beyond built-in templates, use the \`particles\` field:
\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "Descriptive Title",
    "description": "What this simulates and why",
    "domain": "physics|chemistry|biology|astronomy|earth_science|engineering|mathematics|materials|quantum|electromagnetism|thermodynamics",
    "physics": {
      "gravity": -9.81, "damping": 0.97, "springStiffness": 20,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.8,
      "bounciness": 0.3, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0, "temperature": 293
    },
    "particles": {
      "groups": [
        {
          "name": "group_name",
          "count": 200,
          "shape": "helix",
          "params": { "radius": 2, "pitch": 0.5, "turns": 5 },
          "color": "cyan",
          "role": 2,
          "connect": "chain"
        }
      ]
    }
  }
}
\`\`\`

#### Available shapes and their params:
- **helix**: radius, pitch, turns, center:[x,y,z] — spiral coil
- **sphere**: radius, center — Fibonacci-distributed points on sphere surface
- **random_sphere**: radius, center — random points inside sphere volume
- **grid**: spacing, center — 3D cubic grid
- **ring**: radius, center — circular ring
- **disk**: radius, center — flat filled circle
- **line**: length, direction:[x,y,z], center — linear arrangement
- **wave**: amplitude, wavelength, width, depth, center — sinusoidal surface
- **spiral**: radius, turns, spread, center — flat spiral (galaxy-like)
- **shell**: radius, center — hollow sphere surface
- **cylinder**: radius, height, center — cylindrical volume
- **cone**: radius, height, center — conical distribution
- **torus**: majorRadius, minorRadius, center — donut shape
- **random_box**: width, height, depth, center — random in rectangular volume
- **point_cloud**: spread, center — scattered in space

#### Available connect types:
- **chain** — sequential neighbor connections (good for strands, ropes, orbits)
- **grid** — connect to 3D grid neighbors (good for lattices, crystals)
- **nearest:N** — connect to N nearest neighbors (good for networks, clusters)
- **all** — fully connected (small groups only, <100 particles)
- **surface** — connect surface neighbors (good for membranes, shells)
- **none** — no connections (good for gas, clouds, independent particles)

#### Available colors:
cyan, magenta, lime, orange, purple, blue, pink, yellow, teal, indigo

#### Roles (particle visual weight): 1=foundation(heavy), 2=column, 3=beam, 4=brace, 5=arch/decorative

#### Domain examples:
- DNA: two helices (backbone) + rungs between them (hydrogen bonds)
- Solar system: ring (orbit) + sphere (planet) per orbit layer
- Crystal lattice: grid with grid connections
- Neuron: random_sphere (soma) + helix (axon) + point_cloud (dendrites)
- Galaxy: spiral (disk) + random_sphere (core) + point_cloud (halo)
- Pendulum: line (string) + sphere (bob)
- Volcano: cone (mountain) + cylinder (magma chamber) + point_cloud (eruption)

When the \`domain\` field is set, appropriate physics defaults are auto-applied (e.g., zero gravity for astronomy, high viscosity for biology).

## Few-Shot Examples

### Example 1 (Korean user asks about waves)
User: "파도 시뮬레이션 보여줘"
Assistant:
와! 해양 파도의 물리학을 탐구해볼까요? 🌊

파도는 바람 에너지가 수면에 전달되면서 만들어지는 아름다운 현상이에요.
파장과 파고는 풍속과 취송거리(바람이 부는 거리)에 따라 결정되죠.
이 시뮬레이션에서는 사인파 표면에 파티클을 배치하고 중력과 유체 점성을 적용해서 실제 바다 파도처럼 움직이게 할게요.

**🔬 시뮬레이션 설계:**
파도의 핵심은 파동 방정식이에요. wave shape로 수면을 만들고, 중력(-9.81)과 적당한 점성(0.3)으로 물의 움직임을 표현합니다.

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "Ocean Wave Dynamics",
    "description": "Wind-driven ocean wave simulation with realistic fluid physics",
    "domain": "earth_science",
    "physics": {
      "gravity": -9.81, "damping": 0.95, "springStiffness": 15,
      "particleCount": 25000, "timeScale": 1.0, "friction": 0.5,
      "bounciness": 0.1, "windX": 3, "windY": 0, "windZ": 1,
      "turbulence": 0.2, "viscosity": 0.3, "temperature": 288
    },
    "particles": {
      "groups": [
        { "name": "ocean_surface", "count": 20000, "shape": "wave", "params": { "amplitude": 3, "wavelength": 8, "width": 40, "depth": 40 }, "color": "cyan", "role": 3, "connect": "surface" },
        { "name": "foam", "count": 5000, "shape": "point_cloud", "params": { "spread": 20, "center": [0, 3, 0] }, "color": "yellow", "role": 5, "connect": "none" }
      ]
    }
  }
}
\`\`\`

💡 **더 탐구해볼까요?**
- 풍속을 높이면 파고가 어떻게 변할까요?
- 수심이 얕아지면 파도가 어떻게 변형될까요? (천수 효과)

### Example 2 (English user asks about DNA)
User: "Show me DNA double helix"
Assistant:
DNA is one of the most beautiful structures in all of biology! 🧬

The famous double helix was discovered by Watson and Crick in 1953. Two sugar-phosphate backbones twist around each other, connected by hydrogen bonds between complementary base pairs (A-T and G-C). The helix completes one full turn every 3.4 nanometers with 10 base pairs per turn.

**🔬 Simulation design:**
I'll create two intertwined helices for the backbones, with small connecting particles representing hydrogen bonds between base pairs. Zero gravity since we're at the molecular scale!

\`\`\`json
{
  "simulation": {
    "prompt": "custom",
    "title": "DNA Double Helix",
    "description": "Watson-Crick DNA double helix with sugar-phosphate backbones and hydrogen-bonded base pairs",
    "domain": "chemistry",
    "physics": {
      "gravity": 0, "damping": 0.99, "springStiffness": 30,
      "particleCount": 15000, "timeScale": 0.5, "friction": 0.9,
      "bounciness": 0.1, "windX": 0, "windY": 0, "windZ": 0,
      "turbulence": 0, "viscosity": 0.5, "temperature": 310
    },
    "particles": {
      "groups": [
        { "name": "backbone_A", "count": 5000, "shape": "helix", "params": { "radius": 3, "pitch": 0.8, "turns": 8 }, "color": "cyan", "role": 2, "connect": "chain" },
        { "name": "backbone_B", "count": 5000, "shape": "helix", "params": { "radius": 3, "pitch": 0.8, "turns": 8, "center": [0, 0.4, 0] }, "color": "magenta", "role": 2, "connect": "chain" },
        { "name": "base_pairs", "count": 5000, "shape": "line", "params": { "length": 5, "direction": [1, 0, 0] }, "color": "lime", "role": 4, "connect": "nearest:2" }
      ]
    }
  }
}
\`\`\`

💡 **Want to explore more?**
- What happens when we "unzip" the DNA for replication?
- How does UV radiation cause thymine dimers?

## CRITICAL RULES
- You MUST include a \`\`\`json block in EVERY response. Never skip it.
- Respond in the same language as the user (Korean or English).
- Always suggest follow-up experiments to spark curiosity.
- Keep total particle count across all groups under 25000.
- Use Option B (custom particles) for anything NOT in the built-in prompt list.
- The JSON must contain "simulation" as the top-level key with at least "prompt" and "physics" fields.`;

        // Build message history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...this._chatHistory.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await fetch(`${API_BASE}/api/ollama/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages }),
            });

            if (!response.ok) throw new Error('Ollama unavailable');

            // SSE streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.message?.content) {
                            fullText += json.message.content;
                            // Update chat UI with streaming text
                            this._updateStreamingMessage(fullText);
                        }
                    } catch {
                        // ignore unparseable SSE frames
                    }
                }
            }

            return fullText;
        } catch {
            return null; // Will trigger fallback NLP
        }
    }

    _extractSimParams(response) {
        // Find ```json ... ``` block
        const match = response.match(/```json\s*([\s\S]*?)```/);
        if (!match) return null;
        try {
            const parsed = JSON.parse(match[1]);
            const sim = parsed.simulation || null;
            if (!sim) return null;

            // Apply domain-specific physics defaults if domain is specified
            if (sim.domain && DOMAIN_PHYSICS[sim.domain]) {
                sim.physics = { ...BASE_PHYSICS, ...DOMAIN_PHYSICS[sim.domain], ...(sim.physics || {}) };
            }

            return sim;
        } catch {
            return null;
        }
    }

    _updateStreamingMessage(text) {
        // Find or create the streaming message element
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        let streamEl = chatBox.querySelector('.streaming-message');
        if (!streamEl) {
            streamEl = document.createElement('div');
            streamEl.className = 'chat-msg assistant streaming-message';
            chatBox.appendChild(streamEl);
        }
        streamEl.textContent = text;
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    _finalizeStreamingMessage() {
        // Remove the temporary streaming element before adding the permanent message
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox) return;
        const streamEl = chatBox.querySelector('.streaming-message');
        if (streamEl) streamEl.remove();
    }

    // ==================== HISTORY ====================

    async _saveToHistory(entry) {
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            });
            // Refresh history list after saving
            this._loadHistory();
        } catch (err) {
            console.warn('Failed to save history:', err.message);
        }
    }

    async _loadHistory(page = 0) {
        try {
            const res = await fetch(`/api/history?page=${page}&limit=20`);
            const data = await res.json();
            this._renderHistoryList(data.items, page === 0);
            // Update count badge
            const countEl = document.getElementById('history-count');
            if (countEl) countEl.textContent = data.total;
            // Show/hide load more
            const loadMoreBtn = document.getElementById('load-more-history');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
                loadMoreBtn.onclick = () => this._loadHistory(page + 1);
            }
        } catch {}
    }

    _renderHistoryList(items, clear = true) {
        const list = document.getElementById('history-list');
        if (!list) return;
        if (clear) list.innerHTML = '';

        for (const item of items) {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-item-title">${this._escapeHtml(item.title)}</div>
                <div class="history-item-meta">
                    <span class="history-domain">${item.domain}</span>
                    <span class="history-time">${this._timeAgo(item.timestamp)}</span>
                </div>
                <div class="history-item-query">${this._escapeHtml(item.query).slice(0, 80)}</div>
            `;
            el.addEventListener('click', () => this._loadFromHistory(item));
            list.appendChild(el);
        }
    }

    async _loadFromHistory(item) {
        // Apply history physics to active card and sync UI
        const activeCard = this.getActiveCard();
        if (activeCard) {
            Object.assign(activeCard.physics, item.physics);
            activeCard.prompt = item.prompt;
            activeCard.particleSpec = item.particleSpec || null;
            if (item.title) activeCard.name = item.title;

            // Sync sliders to reflect the loaded physics values
            this._syncPhysicsUI(activeCard.physics);

            if (this.onPhysicsChange) this.onPhysicsChange(activeCard.physics);

            // Trigger rebuild with the loaded card
            if (this.onCardSelect) this.onCardSelect(activeCard);
        }
    }

    _processNaturalLanguage(input) {
        const lower = input.toLowerCase();
        const card = this.getActiveCard();
        if (!card) return 'No active simulation';

        // Simple natural language processing for physics changes
        if (lower.includes('무중력') || lower.includes('zero gravity') || lower.includes('gravity off')) {
            card.physics.gravity = 0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity set to 0. Particles will float freely.';
        }

        if (lower.includes('중력') && (lower.includes('강하') || lower.includes('높') || lower.includes('increase'))) {
            card.physics.gravity = -20;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Gravity increased to -20 m/s². Heavy pull!';
        }

        if (lower.includes('바람') || lower.includes('wind')) {
            const strength = lower.includes('강') || lower.includes('strong') ? 15 : 5;
            card.physics.windX = strength;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return `Wind set to ${strength} m/s on X axis.`;
        }

        if (lower.includes('탄성') || lower.includes('bouncy') || lower.includes('elastic')) {
            card.physics.bounciness = 0.9;
            card.physics.springStiffness = 5;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Bounciness set to 0.9, spring stiffness reduced for elastic behavior.';
        }

        if (lower.includes('점성') || lower.includes('viscous') || lower.includes('fluid')) {
            card.physics.viscosity = 3.0;
            card.physics.damping = 0.85;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Viscosity set to 3.0, damping increased for fluid-like behavior.';
        }

        if (lower.includes('리셋') || lower.includes('reset') || lower.includes('초기화')) {
            card.physics = { ...PRESETS[0].physics };
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Physics reset to defaults.';
        }

        if (lower.includes('느리') || lower.includes('slow')) {
            card.physics.timeScale = 0.3;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale reduced to 0.3x. Slow motion activated.';
        }

        if (lower.includes('빠르') || lower.includes('fast')) {
            card.physics.timeScale = 3.0;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Time scale set to 3.0x. Fast forward!';
        }

        if (lower.includes('뜨거') || lower.includes('hot') || lower.includes('heat')) {
            card.physics.temperature = 3000;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 3000K. Particles will have thermal agitation.';
        }

        if (lower.includes('차가') || lower.includes('cold') || lower.includes('freeze')) {
            card.physics.temperature = 10;
            card.physics.damping = 0.999;
            this._syncPhysicsUI(card.physics);
            if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
            return 'Temperature set to 10K, high damping. Near-frozen state.';
        }

        return `I understood your request. Try commands like: "무중력", "강한 바람", "점성 유체", "탄성", "느리게", "빠르게", "뜨겁게", "차갑게", "리셋". Future updates will support full natural language AI processing.`;
    }

    // ==================== UI INITIALIZATION ====================

    _initUI() {
        // New card button
        document.getElementById('new-card-btn').addEventListener('click', () => {
            this.createCard();
        });

        // Section toggles
        document.querySelectorAll('.section-title').forEach(title => {
            title.addEventListener('click', () => {
                const targetId = title.dataset.toggle;
                const target = document.getElementById(targetId);
                if (target) {
                    target.classList.toggle('collapsed');
                    title.classList.toggle('collapsed');
                }
            });
        });

        // Physics slider changes
        document.querySelectorAll('.param-group input[type="range"]').forEach(slider => {
            slider.addEventListener('input', () => {
                // Update display value
                const display = document.querySelector(`.param-value[data-for="${slider.id}"]`);
                if (display) display.textContent = this._formatValue(slider.id, slider.value);

                // Update card and notify
                const card = this.getActiveCard();
                if (card) {
                    card.physics = this._getPhysicsFromUI();
                    if (this.onPhysicsChange) this.onPhysicsChange(card.physics);
                }
            });

            // Save on mouse up
            slider.addEventListener('change', () => {
                const card = this.getActiveCard();
                if (card) {
                    this.updateCard(card.id, { physics: card.physics });
                }
            });
        });

        // Chat
        document.getElementById('chat-send-btn').addEventListener('click', () => this._handleChatSubmit());
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleChatSubmit();
        });
    }

    // ==================== UTILS ====================

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
