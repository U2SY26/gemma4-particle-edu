import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * XRController — WebXR VR + AR (passthrough) support
 *
 * VR mode: Immersive 3D simulation in headset
 * AR mode: Particles placed in real-world space (passthrough camera)
 * Voice: Web Speech API for hands-free Gemma 4 commands
 *
 * Tested targets: Quest 3, Samsung XR, Apple Vision Pro (via WebXR)
 */
export class XRController {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this._xrMode = 'none'; // 'none' | 'vr' | 'ar'
        this._voiceActive = false;
        this._onVoiceCommand = null; // callback(transcript)

        // Enable WebXR
        renderer.xr.enabled = true;

        // ==================== VR BUTTON ====================
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-vr').then(supported => {
                if (supported) this._createVRButton();
            });
            navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                if (supported) this._createARButton();
            });
        }

        // ==================== ORBIT CONTROLS (non-XR) ====================
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.3;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 80;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.target.set(0, 3, 0);

        // ==================== XR CONTROLLERS ====================
        this.controller1 = renderer.xr.getController(0);
        this.controller2 = renderer.xr.getController(1);
        scene.add(this.controller1);
        scene.add(this.controller2);

        // Controller ray visualization
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
        });

        this.controller1.add(new THREE.Line(rayGeometry, rayMaterial));
        this.controller2.add(new THREE.Line(rayGeometry.clone(), rayMaterial.clone()));

        // Controller interaction: squeeze to activate voice
        this.controller1.addEventListener('squeeze', () => this.toggleVoice());
        this.controller2.addEventListener('selectstart', () => {
            // Point controller at simulation → show physics info
            this._handleControllerSelect();
        });

        // ==================== XR SESSION EVENTS ====================
        renderer.xr.addEventListener('sessionstart', () => {
            const session = renderer.xr.getSession();
            this._xrMode = session.mode === 'immersive-ar' ? 'ar' : 'vr';

            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'none';
            this.controls.enabled = false;

            // AR mode: make scene background transparent for passthrough
            if (this._xrMode === 'ar') {
                this.scene.background = null;
                // Scale down simulation to room-scale (0.1x)
                this.scene.scale.set(0.1, 0.1, 0.1);
                // Position at floor level
                this.scene.position.set(0, 0, -1.5);
            }

            this._showXRStatus(`${this._xrMode.toUpperCase()} Mode Active`);
        });

        renderer.xr.addEventListener('sessionend', () => {
            this._xrMode = 'none';
            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.controls.enabled = true;

            // Restore scene
            this.scene.scale.set(1, 1, 1);
            this.scene.position.set(0, 0, 0);

            this.stopVoice();
            this._removeXRStatus();
        });

        // ==================== VOICE INPUT (Web Speech API) ====================
        this._setupVoiceInput();

        // ==================== VOICE BUTTON (non-XR) ====================
        this._createVoiceButton();
    }

    // ==================== VR/AR BUTTONS ====================

    _createVRButton() {
        const vrButton = VRButton.createButton(this.renderer);
        vrButton.style.fontFamily = "'Courier New', monospace";
        vrButton.style.borderColor = '#00ffff';
        vrButton.style.color = '#00ffff';
        vrButton.style.background = 'rgba(0, 20, 30, 0.8)';
        vrButton.style.bottom = '90px';
        vrButton.style.zIndex = '100';
        document.body.appendChild(vrButton);
    }

    _createARButton() {
        const arButton = document.createElement('button');
        arButton.textContent = 'ENTER AR';
        arButton.style.cssText = `
            position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%);
            z-index: 100; font-family: 'Courier New', monospace; font-size: 13px;
            padding: 10px 20px; border: 1px solid #3fb950; color: #3fb950;
            background: rgba(0, 20, 30, 0.8); border-radius: 4px; cursor: pointer;
            letter-spacing: 2px;
        `;
        arButton.addEventListener('click', async () => {
            try {
                const session = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['hand-tracking', 'hit-test', 'camera-access'],
                });
                this.renderer.xr.setSession(session);
            } catch (e) {
                console.warn('[XR] AR session failed:', e.message);
            }
        });
        document.body.appendChild(arButton);
    }

    // ==================== VOICE INPUT ====================

    _setupVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this._speechAvailable = false;
            return;
        }

        this._speechAvailable = true;
        this._recognition = new SpeechRecognition();
        this._recognition.continuous = false;
        this._recognition.interimResults = true;
        this._recognition.lang = localStorage.getItem('particleLang') === 'en' ? 'en-US' : 'ko-KR';

        this._recognition.onresult = (event) => {
            let transcript = '';
            for (const result of event.results) {
                transcript = result[0].transcript;
            }
            // Show interim results
            this._showXRStatus(`Voice: ${transcript}`);

            if (event.results[0].isFinal && this._onVoiceCommand) {
                this._onVoiceCommand(transcript);
                this._showXRStatus(`Sent: ${transcript}`);
                setTimeout(() => this._removeXRStatus(), 2000);
            }
        };

        this._recognition.onerror = (event) => {
            console.warn('[Voice]', event.error);
            this._voiceActive = false;
            this._updateVoiceButton();
        };

        this._recognition.onend = () => {
            // Auto-restart if voice is still active (continuous mode)
            if (this._voiceActive) {
                setTimeout(() => {
                    try { this._recognition.start(); } catch {}
                }, 300);
            }
            this._updateVoiceButton();
        };
    }

    _createVoiceButton() {
        if (!this._speechAvailable) return;

        const btn = document.createElement('button');
        btn.id = 'voice-input-btn';
        btn.title = 'Voice input (Gemma 4)';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 10a2 2 0 002-2V4a2 2 0 10-4 0v4a2 2 0 002 2z"/><path d="M12 8a1 1 0 10-2 0 2 2 0 01-4 0 1 1 0 10-2 0 4 4 0 003 3.87V13H6a1 1 0 100 2h4a1 1 0 100-2H9v-1.13A4 4 0 0012 8z"/></svg>';
        btn.style.cssText = `
            background: none; border: none; color: var(--text-secondary, #8b949e);
            cursor: pointer; padding: 6px; font-size: 16px; opacity: 0.7;
            transition: all 0.15s; border-radius: 4px;
        `;
        btn.onmouseenter = () => { btn.style.opacity = '1'; };
        btn.onmouseleave = () => { if (!this._voiceActive) btn.style.opacity = '0.7'; };
        btn.addEventListener('click', () => this.toggleVoice());
        this._voiceButton = btn;

        // Insert next to chat input
        const chatArea = document.getElementById('chat-input-area');
        if (chatArea) {
            const imageBtn = document.getElementById('chat-image-btn');
            if (imageBtn) {
                imageBtn.after(btn);
            } else {
                chatArea.prepend(btn);
            }
        }
    }

    _updateVoiceButton() {
        if (!this._voiceButton) return;
        if (this._voiceActive) {
            this._voiceButton.style.color = '#f85149';
            this._voiceButton.style.opacity = '1';
            this._voiceButton.title = 'Stop voice input';
        } else {
            this._voiceButton.style.color = 'var(--text-secondary, #8b949e)';
            this._voiceButton.style.opacity = '0.7';
            this._voiceButton.title = 'Voice input (Gemma 4)';
        }
    }

    toggleVoice() {
        if (!this._speechAvailable) return;
        if (this._voiceActive) {
            this.stopVoice();
        } else {
            this.startVoice();
        }
    }

    startVoice() {
        if (!this._speechAvailable || this._voiceActive) return;
        this._voiceActive = true;
        this._recognition.lang = localStorage.getItem('particleLang') === 'en' ? 'en-US' : 'ko-KR';
        try { this._recognition.start(); } catch {}
        this._updateVoiceButton();
    }

    stopVoice() {
        if (!this._speechAvailable) return;
        this._voiceActive = false;
        try { this._recognition.stop(); } catch {}
        this._updateVoiceButton();
    }

    /** Set callback for voice commands. Called with (transcript: string). */
    setVoiceCallback(callback) {
        this._onVoiceCommand = callback;
    }

    // ==================== XR HUD ====================

    _showXRStatus(text) {
        let el = document.getElementById('xr-status-hud');
        if (!el) {
            el = document.createElement('div');
            el.id = 'xr-status-hud';
            el.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                z-index: 10000; background: rgba(0,0,0,0.8); color: #00ffff;
                padding: 8px 16px; border-radius: 6px; font-family: monospace;
                font-size: 14px; pointer-events: none; border: 1px solid rgba(0,255,255,0.2);
            `;
            document.body.appendChild(el);
        }
        el.textContent = text;
    }

    _removeXRStatus() {
        const el = document.getElementById('xr-status-hud');
        if (el) el.remove();
    }

    _handleControllerSelect() {
        // Future: raycast into simulation, show physics info for targeted particle group
    }

    // ==================== UPDATE LOOP ====================

    update() {
        if (!this.renderer.xr.isPresenting) {
            this.controls.update();
        }
    }

    dispose() {
        this.controls.dispose();
        this.stopVoice();
    }
}
