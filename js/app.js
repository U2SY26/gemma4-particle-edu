import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { NeonRenderer, detectQuality, QUALITY } from './NeonRenderer.js';
import { XRController } from './XRController.js';
import { SimulationManager } from './SimulationManager.js';
import { t, tPreset, getLang, setLang } from './i18n.js';
import { MATERIALS, GROUNDS, CATEGORIES, materialToPhysics, groundToPhysics } from './Materials.js';

// ==================== CONFIGURATION ====================
const GROUND_SPREAD = 25;

// ==================== APPLICATION ====================
class App {
    constructor() {
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentStructure = null;
        this.activeParticleCount = 25000;
        this.timeScale = 1.0;

        this._init();
    }

    _init() {
        try {
            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: 'high-performance',
            });

            const container = document.getElementById('canvas-container');
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(this.renderer.domElement);

            // Scene & Camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(
                60, container.clientWidth / container.clientHeight, 0.1, 200
            );
            this.camera.position.set(8, 6, 12);
            this.camera.lookAt(0, 3, 0);

            // Auto-detect GPU quality
            this.quality = detectQuality(this.renderer);
            const MAX_PARTICLES = this.quality.maxParticles;
            console.log(`[Quality] ${this.quality.label} - Max particles: ${MAX_PARTICLES}`);

            // Initialize modules with quality settings
            this.neonRenderer = new NeonRenderer(this.renderer, this.scene, this.camera, this.quality);
            this.particleSystem = new ParticleSystem(this.scene, MAX_PARTICLES, this.quality);
            this.physics = new PhysicsEngine(MAX_PARTICLES);
            this.archGen = new ArchitectureGenerator();
            this.xrController = new XRController(this.renderer, this.scene, this.camera);

            // Spawn initial particles (clamped to quality tier max)
            this.activeParticleCount = Math.min(this.activeParticleCount, MAX_PARTICLES);
            const initialPositions = this.particleSystem.spawnOnGround(this.activeParticleCount, GROUND_SPREAD);
            this.physics.initPositions(initialPositions, this.activeParticleCount);

            // Simulation Manager (sidebar + cards)
            this.simManager = new SimulationManager(
                (card) => this._onCardSelect(card),
                (physics) => this._onPhysicsChange(physics),
            );

            // Connect voice input to chat
            this.xrController.setVoiceCallback((transcript) => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput && this.simManager) {
                    chatInput.value = transcript;
                    this.simManager._handleChatSubmit();
                }
            });

            // UI
            this._setupUI();

            // Resize handler
            window.addEventListener('resize', () => this._onResize());

            // Start animation loop
            this.renderer.setAnimationLoop((time, frame) => this._animate(time, frame));

            this._updateStatus('Ready');
            this._updateParticleCount(this.activeParticleCount);
            this._updateQualityBadge();

            // Landing page logic
            this._initLandingPage();

            // Mobile sidebar toggle
            this._initMobileToggle();
        } catch (err) {
            // Surface the failure so users aren't left staring at a spinner forever
            console.error('[App] Initialization failed:', err);
            this._showInitError(err);
        } finally {
            // Always hide the loading overlay so the UI (or the error banner) becomes visible
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    _showInitError(err) {
        const container = document.getElementById('canvas-container') || document.body;
        const banner = document.createElement('div');
        banner.setAttribute('role', 'alert');
        banner.style.cssText = [
            'position:fixed', 'inset:auto 16px 16px 16px', 'z-index:2000',
            'max-width:720px', 'margin:0 auto',
            'padding:14px 18px', 'border-radius:10px',
            'background:rgba(20,24,36,0.96)', 'color:#ff6b6b',
            'border:1px solid rgba(255,107,107,0.35)',
            'font:500 13px/1.4 Inter, system-ui, sans-serif',
            'box-shadow:0 12px 40px rgba(0,0,0,0.45)',
        ].join(';');
        const title = document.createElement('div');
        title.textContent = 'Simulation failed to initialize';
        title.style.cssText = 'font-weight:600;margin-bottom:4px;color:#ff8a8a;letter-spacing:0.3px';
        const detail = document.createElement('div');
        detail.textContent = (err && (err.message || String(err))) || 'Unknown error';
        detail.style.cssText = 'color:#e7e9ef;font-family:JetBrains Mono, monospace;font-size:12px;word-break:break-word';
        banner.appendChild(title);
        banner.appendChild(detail);
        container.appendChild(banner);
    }

    _initLandingPage() {
        const landing = document.getElementById('landing-page');
        const landingInput = document.getElementById('landing-input');
        const landingStart = document.getElementById('landing-start');
        const landingCanvas = document.getElementById('landing-canvas');

        if (!landing) return;

        // --- Landing canvas particle animation ---
        if (landingCanvas) {
            const ctx = landingCanvas.getContext('2d');
            let animId = null;
            const particles = [];
            const PARTICLE_COUNT = 120;

            const resizeCanvas = () => {
                landingCanvas.width = window.innerWidth;
                landingCanvas.height = window.innerHeight;
            };
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * landingCanvas.width,
                    y: Math.random() * landingCanvas.height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    r: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.5 + 0.1,
                    hue: Math.random() * 60 + 200, // blue-purple range
                });
            }

            const drawLanding = () => {
                ctx.clearRect(0, 0, landingCanvas.width, landingCanvas.height);

                // Draw connections
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const dx = particles[i].x - particles[j].x;
                        const dy = particles[i].y - particles[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 150) {
                            const a = (1 - dist / 150) * 0.12;
                            ctx.strokeStyle = `rgba(88, 166, 255, ${a})`;
                            ctx.lineWidth = 0.5;
                            ctx.beginPath();
                            ctx.moveTo(particles[i].x, particles[i].y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            ctx.stroke();
                        }
                    }
                }

                // Draw particles
                for (const p of particles) {
                    p.x += p.vx;
                    p.y += p.vy;

                    // Wrap around edges
                    if (p.x < 0) p.x = landingCanvas.width;
                    if (p.x > landingCanvas.width) p.x = 0;
                    if (p.y < 0) p.y = landingCanvas.height;
                    if (p.y > landingCanvas.height) p.y = 0;

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
                    ctx.fill();

                    // Glow effect
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha * 0.15})`;
                    ctx.fill();
                }

                animId = requestAnimationFrame(drawLanding);
            };
            drawLanding();

            // Stop animation when landing page hides
            const stopLandingAnim = () => {
                if (animId) cancelAnimationFrame(animId);
                animId = null;
            };

            // Store cleanup function
            this._stopLandingAnimation = stopLandingAnim;
        }

        // --- Transition logic ---
        const enterSimPage = (prompt) => {
            landing.classList.add('hidden');
            if (this._stopLandingAnimation) {
                setTimeout(() => this._stopLandingAnimation(), 600);
            }
            setTimeout(() => {
                landing.style.display = 'none';
            }, 700);

            // If prompt provided, trigger simulation via chat
            if (prompt && prompt.trim()) {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = prompt.trim();
                    // Auto-submit after a brief delay for the transition
                    setTimeout(() => {
                        this.simManager._handleChatSubmit();
                    }, 300);
                }
            }
        };

        if (landingStart) {
            landingStart.addEventListener('click', () => {
                enterSimPage(landingInput ? landingInput.value : '');
            });
        }

        if (landingInput) {
            landingInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    enterSimPage(landingInput.value);
                }
            });
        }

        // Landing page chips (language-aware prompt)
        for (const chip of document.querySelectorAll('.landing-chip')) {
            chip.addEventListener('click', () => {
                const lang = localStorage.getItem('particleLang') || 'ko';
                const prompt = lang === 'ko' ? (chip.dataset.promptKo || chip.dataset.prompt) : chip.dataset.prompt;
                enterSimPage(prompt);
            });
        }

        // URL query parameter support (?prompt=pyramid&lang=ko)
        // Enables embedding from 3dweb and direct link sharing
        const urlParams = new URLSearchParams(window.location.search);
        const urlPrompt = urlParams.get('prompt');
        const urlLang = urlParams.get('lang');
        if (urlLang && ['ko', 'en'].includes(urlLang)) {
            setLang(urlLang);
            this._applyLang(); // Apply language immediately so placeholders update
        }
        if (urlPrompt) {
            // Auto-enter sim page with the URL prompt, skip landing
            setTimeout(() => enterSimPage(urlPrompt), 300);
        }
    }

    _initMobileToggle() {
        const toggle = document.getElementById('mobile-toggle');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (!toggle || !sidebar) return;

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('visible');
        };

        toggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('visible', isOpen);
        });

        if (backdrop) {
            backdrop.addEventListener('click', closeSidebar);
        }
    }

    _setupUI() {
        const input = document.getElementById('prompt-input');
        const btn = document.getElementById('generate-btn');

        const submit = () => {
            const prompt = input.value.trim();
            if (prompt) {
                // Update active card's prompt
                const card = this.simManager.getActiveCard();
                if (card) {
                    this.simManager.updateCard(card.id, { prompt });
                }
                this._onPromptSubmit(prompt);
            }
        };

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });

        // === Visual Settings ===
        const colorMode = document.getElementById('color-mode');
        const colorPrimary = document.getElementById('color-primary');
        const colorSecondary = document.getElementById('color-secondary');
        const brightness = document.getElementById('param-brightness');
        const bloom = document.getElementById('param-bloom');
        const bloomRadius = document.getElementById('param-bloomRadius');
        const particleSize = document.getElementById('param-particleSize');
        const opacity = document.getElementById('param-opacity');
        const bgColor = document.getElementById('color-bg');

        const updateVisual = () => {
            const display = (id, val) => {
                const el = document.querySelector(`.param-value[data-for="${id}"]`);
                if (el) el.textContent = parseFloat(val).toFixed(2);
            };
            display('param-brightness', brightness.value);
            display('param-bloom', bloom.value);
            display('param-bloomRadius', bloomRadius.value);
            display('param-particleSize', particleSize.value);
            display('param-opacity', opacity.value);
        };

        colorMode.addEventListener('change', () => {
            const show2nd = colorMode.value === 'gradient' || colorMode.value === 'velocity';
            document.getElementById('color-secondary-group').style.display = show2nd ? '' : 'none';
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });
        // Initial hide secondary
        document.getElementById('color-secondary-group').style.display = 'none';

        colorPrimary.addEventListener('input', () => {
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });
        colorSecondary.addEventListener('input', () => {
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });

        brightness.addEventListener('input', () => {
            this.particleSystem.setBrightness(parseFloat(brightness.value));
            updateVisual();
        });

        bloom.addEventListener('input', () => {
            this.neonRenderer.bloomPass.strength = parseFloat(bloom.value);
            updateVisual();
        });
        bloomRadius.addEventListener('input', () => {
            this.neonRenderer.bloomPass.radius = parseFloat(bloomRadius.value);
            updateVisual();
        });

        particleSize.addEventListener('input', () => {
            this.particleSystem.setParticleSize(parseFloat(particleSize.value));
            updateVisual();
        });

        opacity.addEventListener('input', () => {
            this.particleSystem.setOpacity(parseFloat(opacity.value));
            updateVisual();
        });

        bgColor.addEventListener('input', () => {
            const c = parseInt(bgColor.value.slice(1), 16);
            this.scene.background.set(c);
            this.scene.fog.color.set(c);
        });

        // === Material & Ground Selection ===
        this._initMaterialUI();

        // === Community Contribution ===
        document.getElementById('contrib-submit-btn')?.addEventListener('click', () => this._submitContribution());

        // === Language Toggle ===
        const langBtn = document.getElementById('lang-toggle');
        this._applyLang();
        langBtn.addEventListener('click', () => {
            const next = getLang() === 'ko' ? 'en' : 'ko';
            setLang(next);
            this._applyLang();
            this._populateMaterialSelect();
            this._populateGroundSelect();
            this.simManager._renderCardList();
        });

        // === Right Drawer Toggle ===
        const drawer = document.getElementById('right-drawer');
        const drawerToggle = document.getElementById('right-drawer-toggle');
        if (drawer && drawerToggle) {
            drawerToggle.addEventListener('click', () => {
                drawer.classList.toggle('open');
                drawerToggle.textContent = drawer.classList.contains('open') ? '\u25B6' : '\u25C0';
            });
        }

        // Drawer tab switching
        const tabs = document.querySelectorAll('.drawer-tab');
        const panels = document.querySelectorAll('.drawer-tab-panel');
        for (const tab of tabs) {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                // Update tab styles
                for (const t of tabs) {
                    t.style.borderBottomColor = t.dataset.tab === target ? 'var(--accent-blue)' : 'transparent';
                    t.style.color = t.dataset.tab === target ? 'var(--text-primary)' : 'var(--text-secondary)';
                    t.classList.toggle('active', t.dataset.tab === target);
                }
                // Show/hide panels
                for (const p of panels) {
                    p.style.display = p.id === `tab-${target}` ? '' : 'none';
                }
                // Populate presets tab on first open
                if (target === 'presets' && !this._presetsPopulated) {
                    this._populateDrawerPresets();
                    this._presetsPopulated = true;
                }
                // Populate benchmark tab on first open
                if (target === 'benchmark' && !this._benchPopulated) {
                    this._populateDrawerBenchmark();
                    this._benchPopulated = true;
                }
            });
        }
    }

    async _populateDrawerPresets() {
        const list = document.getElementById('drawer-preset-list');
        if (!list || !this.simManager) return;

        // 300 시나리오 + 기존 cards 통합 (사용자 요청 2026-04-26)
        let scenarios = this.simManager._benchmarkScenarios;
        if (!scenarios) {
            try {
                const res = await fetch('/data/benchmark-300.json');
                const data = await res.json();
                scenarios = data.scenarios || [];
                this.simManager._benchmarkScenarios = scenarios;
            } catch (e) {
                console.warn('[Presets] 300 시나리오 로드 실패', e);
                scenarios = [];
            }
        }

        // 카테고리 자동 분류
        const categorize = (s) => {
            const t = (s.title || '').toLowerCase();
            const m = (s.material || '').toLowerCase();
            if (/피라미드|타워|아파트|건물|성당|다리|bridge|tower|cathedral|building|pyramid|skyscraper/.test(t) || /steel|concrete|brick|wood|iron/.test(m)) return 'building';
            if (/dna|세포|단백질|박테리아|virus|cell|protein|bacteria|혈액|뼈|근육/.test(t)) return 'bio';
            if (/태양|행성|블랙홀|은하|별|소행성|sun|planet|black hole|galaxy|star|asteroid|nebula|comet|moon|earth/.test(t)) return 'space';
            if (/전기|자기|중력|광자|전자|쿼크|electromagnetic|gravity|electron|photon|quark|magnet|laser|plasma/.test(t)) return 'physics';
            return 'building'; // default
        };

        const iconMap = { building: '🏛️', bio: '🧬', space: '🌌', physics: '⚛️' };

        let filtered = scenarios.map(s => ({ ...s, _cat: categorize(s) }));
        let activeCat = 'all';
        let searchQuery = '';

        const render = () => {
            list.innerHTML = '';
            const items = filtered.filter(s => {
                const catOk = activeCat === 'all' || s._cat === activeCat;
                const qOk = !searchQuery || (s.title || '').toLowerCase().includes(searchQuery);
                return catOk && qOk;
            }).slice(0, 100); // 한 번에 100개만 렌더 (perf)

            if (items.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:10px">결과 없음</div>';
                return;
            }

            for (const s of items) {
                const el = document.createElement('div');
                el.className = 'preset-card';
                const stars = '★'.repeat(s.stars || 0);
                el.innerHTML = `
                    <span class="preset-card-icon">${iconMap[s._cat]}</span>
                    <span class="preset-card-title">${s.title}</span>
                    <span class="preset-card-stars">${stars}</span>
                `;
                el.title = `${s.material || ''} | ${s.particles || 0} particles | accuracy ${s.accuracy || 0}%`;
                el.addEventListener('click', () => {
                    if (this.simManager._applyBenchmarkScenario) {
                        this.simManager._applyBenchmarkScenario(s);
                    } else {
                        // Fallback: 자연어 prompt 로 전송
                        const input = document.getElementById('chat-input');
                        if (input) {
                            input.value = s.title;
                            document.getElementById('chat-send-btn')?.click();
                        }
                    }
                });
                list.appendChild(el);
            }

            const totalCount = filtered.filter(s => activeCat === 'all' || s._cat === activeCat).length;
            if (totalCount > 100) {
                const more = document.createElement('div');
                more.style.cssText = 'text-align:center;padding:8px;color:var(--text-secondary);font-size:9px';
                more.textContent = `${items.length} / ${totalCount}개 표시 (검색하여 필터링)`;
                list.appendChild(more);
            }
        };

        // 카테고리 필터 버튼 이벤트
        document.querySelectorAll('.preset-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-cat-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.color = 'var(--text-secondary)';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(0,212,255,0.2)';
                btn.style.borderColor = 'var(--accent-blue)';
                btn.style.color = 'var(--text-primary)';
                activeCat = btn.dataset.cat;
                render();
            });
        });

        // 검색 이벤트
        const searchInput = document.getElementById('preset-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value.trim().toLowerCase();
                render();
            });
        }

        render();
    }

    _populateDrawerBenchmark() {
        const list = document.getElementById('drawer-bench-list');
        const search = document.getElementById('drawer-bench-search');
        if (!list || !this.simManager?._benchmarkScenarios) return;

        const scenarios = this.simManager._benchmarkScenarios;
        const render = (items) => {
            list.innerHTML = '';
            for (const s of items) {
                const el = document.createElement('div');
                el.style.cssText = 'padding:5px 6px;border-radius:3px;cursor:pointer;font-size:10px;border-left:2px solid transparent;transition:all 0.15s';
                el.onmouseenter = () => { el.style.background = 'rgba(88,166,255,0.08)'; el.style.borderLeftColor = 'var(--accent-blue)'; };
                el.onmouseleave = () => { el.style.background = ''; el.style.borderLeftColor = 'transparent'; };
                const pdfId = String(s.id).padStart(3, '0');
                const accColor = s.accuracy === 100 ? 'var(--accent-green)' : 'var(--accent-yellow)';
                el.innerHTML = `<div style="display:flex;gap:4px;align-items:center"><span style="flex:1;color:var(--text-primary)">#${s.id} ${s.title}</span><a href="/docs/benchmarks/bench-${pdfId}.pdf" target="_blank" style="color:var(--accent-blue);text-decoration:none;font-size:9px" onclick="event.stopPropagation()">PDF</a></div><div style="color:var(--text-secondary);font-size:9px">${s.material || ''} <span style="color:${accColor}">${s.accuracy}%</span></div>`;
                el.addEventListener('click', (e) => { if (!e.target.closest('a')) this.simManager._applyBenchmarkScenario(s); });
                list.appendChild(el);
            }
        };
        render(scenarios);

        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.toLowerCase().trim();
                render(q ? scenarios.filter(s => s.title.toLowerCase().includes(q) || (s.material || '').toLowerCase().includes(q)) : scenarios);
            });
        }
    }

    _initMaterialUI() {
        const catSel = document.getElementById('sel-category');
        const matSel = document.getElementById('sel-material');
        const gndSel = document.getElementById('sel-ground');
        const depthSlider = document.getElementById('param-foundationDepth');

        this._populateMaterialSelect();
        this._populateGroundSelect();

        catSel.addEventListener('change', () => this._populateMaterialSelect());

        matSel.addEventListener('change', () => {
            const key = matSel.value;
            const mat = MATERIALS[key];
            if (!mat) return;
            this.physics.applyMaterial(mat);
            this._showMaterialInfo(key);
            // Update particle color — keep neon if that's the current mode
            if (mat.color && this.particleSystem.colorMode !== 'neon') {
                document.getElementById('color-primary').value = mat.color;
                this.particleSystem.setColorMode('single', mat.color, null);
            }
        });

        gndSel.addEventListener('change', () => {
            const key = gndSel.value;
            const gnd = GROUNDS[key];
            if (!gnd) return;
            this.physics.applyGround(gnd);
            // Update ground visual color
            if (gnd.color && this.neonRenderer.ground) {
                this.neonRenderer.ground.material.color.set(gnd.color);
            }
        });

        depthSlider.addEventListener('input', () => {
            const v = parseFloat(depthSlider.value);
            this.physics.foundationDepth = v;
            this.physics.updateDerivedPhysics();
            const display = document.querySelector('.param-value[data-for="param-foundationDepth"]');
            if (display) display.textContent = v.toFixed(1) + 'm';
        });
    }

    _populateMaterialSelect() {
        const cat = document.getElementById('sel-category').value;
        const sel = document.getElementById('sel-material');
        const lang = getLang();
        sel.innerHTML = '';
        for (const [key, mat] of Object.entries(MATERIALS)) {
            if (mat.category !== cat) continue;
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = mat.name[lang] || mat.name.en;
            sel.appendChild(opt);
        }
        // Auto-select first and apply
        if (sel.options.length > 0) {
            sel.dispatchEvent(new Event('change'));
        }
    }

    _populateGroundSelect() {
        const sel = document.getElementById('sel-ground');
        const lang = getLang();
        sel.innerHTML = '';
        for (const [key, gnd] of Object.entries(GROUNDS)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = gnd.name[lang] || gnd.name.en;
            sel.appendChild(opt);
        }
    }

    _showMaterialInfo(key) {
        const mat = MATERIALS[key];
        const lang = getLang();
        const info = document.getElementById('material-info');
        if (!info || !mat) return;
        const fmt = (v, unit) => {
            if (v >= 1e9) return (v/1e9).toFixed(1) + ' G' + unit;
            if (v >= 1e6) return (v/1e6).toFixed(1) + ' M' + unit;
            if (v >= 1e3) return (v/1e3).toFixed(1) + ' k' + unit;
            if (v < 0.01) return v.toExponential(1) + ' ' + unit;
            return v.toFixed(2) + ' ' + unit;
        };
        info.innerHTML = `
            <div class="info-row"><span>ρ</span><span>${mat.density} kg/m³</span></div>
            <div class="info-row"><span>E</span><span>${fmt(mat.youngsModulus, 'Pa')}</span></div>
            <div class="info-row"><span>σy</span><span>${fmt(mat.yieldStrength, 'Pa')}</span></div>
            <div class="info-row"><span>ν</span><span>${mat.poissonRatio}</span></div>
            <div class="info-row"><span>α</span><span>${mat.thermalExpansion.toExponential(1)} /K</span></div>
            <div class="info-row"><span>Tm</span><span>${mat.meltingPoint} K</span></div>
        `;
    }

    async _submitContribution() {
        const name = document.getElementById('contrib-name').value || 'Anonymous';
        const domain = document.getElementById('contrib-domain').value;
        const type = document.getElementById('contrib-type').value;
        const content = document.getElementById('contrib-content').value;
        const status = document.getElementById('contrib-status');

        if (!content.trim()) {
            status.textContent = '⚠ Content required';
            return;
        }

        try {
            const res = await fetch('/api/contributions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author: name, domain, type, content }),
            });
            if (res.ok) {
                status.textContent = '✓ Submitted! Thank you for your contribution.';
                document.getElementById('contrib-content').value = '';
            } else {
                status.textContent = '✗ Server error';
            }
        } catch {
            status.textContent = '✗ Offline — saved locally';
        }
    }

    _applyLang() {
        const lang = getLang();
        document.getElementById('lang-toggle').textContent = lang.toUpperCase();

        // Update all data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const val = t(key);
            if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
                el.textContent = val;
            } else {
                el.innerHTML = val;
            }
        });

        // Update placeholder attributes
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
    }

    // ==================== CARD & PHYSICS CALLBACKS ====================

    _onCardSelect(card) {
        // Apply card's physics parameters
        this._applyPhysics(card.physics);

        // Build the structure from card's prompt or particle spec
        if (card.particleSpec) {
            this._onPromptSubmit(card.prompt, card.particleSpec);
        } else if (card.prompt) {
            this._onPromptSubmit(card.prompt);
        }
    }

    _onPhysicsChange(physics) {
        this._applyPhysics(physics);
    }

    _applyPhysics(p) {
        // Core physics (SI units)
        this.physics.GRAVITY = p.gravity;               // m/s²
        this.timeScale = p.timeScale;

        // Wind & environment
        this.physics.windX = p.windX || 0;
        this.physics.windY = p.windY || 0;
        this.physics.windZ = p.windZ || 0;
        this.physics.turbulence = p.turbulence || 0;
        this.physics.viscosity = p.viscosity || 0;
        this.physics.temperature = p.temperature || 293;

        // Material properties — sliders map to real SI units
        // density: handle both kg/m³ (>100) and ×1000 scale (<100)
        const rawDensity = p.density || 2.4;
        this.physics.materialDensity = rawDensity > 100 ? rawDensity : rawDensity * 1000;

        // springStiffness: cap to safe Verlet range to prevent particle explosion
        // Gemma 4 may send large values (5000+) — clamp to [0, 100] before ×1e9
        const rawK = Math.min(p.springStiffness || 20, 100);
        this.physics.youngsModulus = rawK * 1e9;
        this.physics.dampingRatio = Math.max(0.001, Math.min(1.0 - (p.damping || 0.97), 0.5));
        this.physics.materialYieldStrength = Math.min(p.yieldStrength || 50, 100) * 1e6;

        // Foundation depth (m)
        this.physics.foundationDepth = p.foundation || 5.0;

        // Ground properties (friction & bounciness from sliders directly)
        this.physics.friction = p.friction || 0.8;
        this.physics.bounciness = p.bounciness || 0.3;

        // Hazards (SI)
        this.physics.seismic = p.seismic || 0;          // m/s²
        this.physics.seismicFreq = p.seismicFreq || 2.0; // Hz
        this.physics.snowLoad = p.snowLoad || 0;         // kN/m²
        this.physics.floodLevel = p.floodLevel || 0;     // m

        // Electromagnetic parameters
        this.physics.electricFieldX = p.electricFieldX || 0;  // V/m
        this.physics.electricFieldY = p.electricFieldY || 0;
        this.physics.electricFieldZ = p.electricFieldZ || 0;
        this.physics.chargeStrength = p.chargeStrength || 0;  // Coulomb multiplier
        this.physics.gateVoltage = p.gateVoltage ?? 1;       // 0=blocked, 1=conducting

        // Recalculate all derived quantities (mass, spring K, damping)
        this.physics.updateDerivedPhysics();
    }

    // ==================== STRUCTURE BUILDING ====================

    _onPromptSubmit(promptText, particleSpec) {
        this._updateStatus('Generating...');

        if (this.currentStructure) {
            this.physics.releaseTargets(1.0);
            setTimeout(() => this._buildStructure(promptText, particleSpec), 1200);
        } else {
            this._buildStructure(promptText, particleSpec);
        }
    }

    _buildStructure(promptText, particleSpec) {
        this._updateStatus('Building structure...');

        try {
            // Universal pipeline: use particleSpec if available, else fall back to template
            const structure = particleSpec
                ? this.archGen.generateFromSpec(particleSpec, this.activeParticleCount)
                : this.archGen.generate(promptText, this.activeParticleCount);
            this.currentStructure = structure;

            const needed = structure.metadata.particleCount;
            if (needed !== this.particleSystem.activeCount) {
                if (needed > this.particleSystem.activeCount) {
                    // Grow: spawn new particles in the ground zone
                    for (let i = this.particleSystem.activeCount; i < needed; i++) {
                        const idx = i * 3;
                        this.physics.pos[idx] = (Math.random() - 0.5) * GROUND_SPREAD;
                        this.physics.pos[idx + 1] = Math.random() * 0.3;
                        this.physics.pos[idx + 2] = (Math.random() - 0.5) * GROUND_SPREAD;
                        this.physics.prevPos[idx] = this.physics.pos[idx];
                        this.physics.prevPos[idx + 1] = this.physics.pos[idx + 1];
                        this.physics.prevPos[idx + 2] = this.physics.pos[idx + 2];
                    }
                }
                // Shrink or grow — always sync the active count to the structure's needs
                // so capped templates (DNA, protein, etc.) don't leave ghost ambient
                // particles sitting as a wall below the structure.
                this.particleSystem.setActiveCount(needed);
                this.physics.activeCount = needed;
            }

            this.physics.setTargetPositions(structure.targets, structure.assignments);
            this.physics.setSprings(structure.connections);
            this.physics.setLoadBearing(structure.loads);
            this.particleSystem.setParticleColors(structure.roles, structure.loads);

            // Apply per-particle charge data from EM templates (transistor, circuit, etc.)
            if (structure.charges) {
                this.physics.charge.fill(0); // Reset all charges
                this.physics.charge.set(structure.charges.subarray(0, needed));
            } else {
                this.physics.charge.fill(0);
            }

            // Re-apply neon mode after structure colors if that's the user's preference
            const colorModeSelect = document.getElementById('color-mode');
            if (colorModeSelect && colorModeSelect.value === 'neon') {
                this.particleSystem.setColorMode('neon');
            }

            const info = `${structure.metadata.type} | ${structure.metadata.structuralParticles} structural + ${structure.metadata.ambientParticles} ambient`;
            document.getElementById('structure-info').textContent = info;
            this._updateParticleCount(needed);
            this._updateStatus('Simulating');
        } catch (e) {
            console.error('Generation error:', e);
            this._updateStatus('Error: ' + e.message);
        }
    }

    // ==================== ANIMATION ====================

    _animate(time, frame) {
        const timeSeconds = time / 1000;
        let dt = Math.min(timeSeconds - this.lastTime, 0.033);
        this.lastTime = timeSeconds;

        // Apply time scale
        dt *= this.timeScale;

        // FPS counter
        this.frameCount++;
        if (timeSeconds - this.fpsTime > 1.0) {
            const fps = Math.round(this.frameCount / (timeSeconds - this.fpsTime));
            document.getElementById('fps-counter').textContent = fps + ' fps';
            this.frameCount = 0;
            this.fpsTime = timeSeconds;

            if (this.physics.isTransitioning) {
                const pct = Math.round(this.physics.stiffnessRamp * 100);
                this._updateStatus(this.physics._releasing ? `Releasing ${100-pct}%` : `Forming ${pct}%`);
            } else if (this.currentStructure) {
                this._updateStatus('Stable');
            }
        }

        if (dt > 0) {
            this.physics.step(dt);
            this.particleSystem.updateFromPhysics(this.physics.pos, this.physics.vel);
        }

        this.xrController.update(time, frame);
        this.neonRenderer.render();
    }

    // ==================== RESIZE ====================

    _onResize() {
        const container = document.getElementById('canvas-container');
        const w = container.clientWidth;
        const h = container.clientHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.neonRenderer.onResize(w, h);
    }

    // ==================== STATUS ====================

    _updateStatus(text) {
        document.getElementById('status').textContent = text;
    }

    _updateParticleCount(count) {
        document.getElementById('particle-count').textContent = count.toLocaleString();
    }

    _updateQualityBadge() {
        const badge = document.getElementById('quality-badge');
        badge.textContent = this.quality.label;
        badge.className = this.quality.label.toLowerCase();

        // Click to cycle quality
        badge.onclick = () => {
            const tiers = [QUALITY.LOW, QUALITY.MEDIUM, QUALITY.HIGH];
            const idx = tiers.findIndex(t => t.label === this.quality.label);
            const next = tiers[(idx + 1) % tiers.length];
            this.quality = next;
            this.neonRenderer.setQuality(next);
            this._updateQualityBadge();
            console.log(`[Quality] Switched to ${next.label}`);
        };
    }
}

// ==================== START ====================
const app = new App();
// Expose for E2E testing (read-only access to physics state)
window.__app = app;
