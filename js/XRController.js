import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * XRController — WebXR VR + AR (passthrough & mobile) support
 *
 * VR mode:  Immersive 3D simulation in headset
 * AR mode:  Particles placed on real-world surfaces via hit-test
 * Mobile AR: Camera feed + Three.js overlay (iOS/Android fallback)
 * Voice:    Web Speech API for hands-free Gemma 4 commands
 *
 * AR Features:
 * - Hit-test reticle: ring indicator shows where simulation will be placed
 * - Tap/select to place: anchor simulation to detected surface
 * - Plane visualization: detected planes shown as translucent grids
 * - Pinch to scale: two-finger gesture resizes simulation in AR
 * - Mobile camera AR: getUserMedia fallback for non-WebXR browsers (iOS)
 *
 * Tested targets: Quest 3/3S, Android Chrome (ARCore), Samsung Galaxy XR
 * Partial: Apple Vision Pro (VR only), iOS Safari (camera AR fallback)
 */
export class XRController {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this._xrMode = 'none'; // 'none' | 'vr' | 'ar' | 'camera-ar'
        this._voiceActive = false;
        this._onVoiceCommand = null;

        // AR placement state
        this._hitTestSource = null;
        this._hitTestSourceRequested = false;
        this._reticle = null;
        this._placed = false;
        this._simulationAnchor = new THREE.Group();
        this._detectedPlanes = new Map();
        this._arScale = 0.1; // simulation → room scale

        // Mobile camera AR state
        this._cameraStream = null;
        this._cameraVideo = null;

        // Enable WebXR
        renderer.xr.enabled = true;

        // ==================== RETICLE (AR placement indicator) ====================
        this._createReticle();

        // ==================== VR/AR BUTTONS ====================
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-vr').then(supported => {
                if (supported) this._createVRButton();
            });
            navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                if (supported) this._createARButton();
            }).catch(() => {});
        }

        // Mobile AR button (camera fallback for iOS/non-WebXR)
        this._createMobileARButton();

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

        // Controller ray
        const rayGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
        this.controller1.add(new THREE.Line(rayGeo, rayMat));
        this.controller2.add(new THREE.Line(rayGeo.clone(), rayMat.clone()));

        // Controller events
        this.controller1.addEventListener('squeeze', () => this.toggleVoice());
        this.controller1.addEventListener('select', () => this._onARSelect());
        this.controller2.addEventListener('select', () => this._onARSelect());

        // ==================== XR SESSION EVENTS ====================
        renderer.xr.addEventListener('sessionstart', () => {
            const session = renderer.xr.getSession();
            this._xrMode = session.mode === 'immersive-ar' ? 'ar' : 'vr';
            this._placed = false;

            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'none';
            this.controls.enabled = false;

            if (this._xrMode === 'ar') {
                this.scene.background = null;
                // Don't scale yet — wait for placement
                this._simulationAnchor.scale.set(this._arScale, this._arScale, this._arScale);
                this._simulationAnchor.visible = false;
                this.scene.add(this._simulationAnchor);

                // Move simulation content into anchor group
                this._reparentSimulation(true);

                this._showXRStatus('Tap a surface to place simulation');

                // Request hit-test
                session.requestReferenceSpace('viewer').then(refSpace => {
                    session.requestHitTestSource({ space: refSpace }).then(source => {
                        this._hitTestSource = source;
                    });
                });

                // Plane detection (Quest 3)
                if (session.enabledFeatures?.includes('plane-detection')) {
                    this._planeDetectionEnabled = true;
                }
            }
        });

        renderer.xr.addEventListener('sessionend', () => {
            this._xrMode = 'none';
            this._placed = false;
            this._hitTestSource = null;
            this._hitTestSourceRequested = false;

            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.controls.enabled = true;

            // Restore simulation from anchor
            this._reparentSimulation(false);
            if (this._simulationAnchor.parent) {
                this.scene.remove(this._simulationAnchor);
            }

            // Clean up planes
            this._detectedPlanes.forEach(mesh => this.scene.remove(mesh));
            this._detectedPlanes.clear();

            // Hide reticle
            if (this._reticle) this._reticle.visible = false;

            this.stopVoice();
            this._removeXRStatus();
        });

        // ==================== VOICE INPUT ====================
        this._setupVoiceInput();
        this._createVoiceButton();
    }

    // ==================== AR RETICLE ====================

    _createReticle() {
        const ringGeo = new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
        });
        this._reticle = new THREE.Mesh(ringGeo, ringMat);
        this._reticle.visible = false;
        this._reticle.matrixAutoUpdate = false;
        this.scene.add(this._reticle);

        // Pulsing dot in center
        const dotGeo = new THREE.CircleGeometry(0.03, 16).rotateX(-Math.PI / 2);
        const dotMat = new THREE.MeshBasicMaterial({
            color: 0x3fb950,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
        });
        this._reticle.add(new THREE.Mesh(dotGeo, dotMat));
    }

    // ==================== AR PLACEMENT ====================

    _onARSelect() {
        if (this._xrMode !== 'ar') return;

        if (!this._placed && this._reticle.visible) {
            // Place simulation at reticle position
            this._simulationAnchor.position.copy(this._reticle.position);
            this._simulationAnchor.quaternion.setFromRotationMatrix(
                new THREE.Matrix4().fromArray(this._reticle.matrix.elements)
            );
            this._simulationAnchor.visible = true;
            this._placed = true;
            this._reticle.visible = false;

            this._showXRStatus('Simulation placed! Pinch to resize.');
            setTimeout(() => this._removeXRStatus(), 3000);
        }
    }

    _reparentSimulation(intoAnchor) {
        // Move particle system meshes into/out of anchor group
        const particleMeshes = [];
        this.scene.traverse(child => {
            if (child.isInstancedMesh || (child.isMesh && child.geometry?.attributes?.position?.count > 100)) {
                if (child !== this._reticle && !this._reticle.children.includes(child)) {
                    particleMeshes.push(child);
                }
            }
        });

        if (intoAnchor) {
            this._originalParents = new Map();
            particleMeshes.forEach(mesh => {
                this._originalParents.set(mesh, mesh.parent);
                this._simulationAnchor.add(mesh);
            });
        } else {
            if (this._originalParents) {
                this._originalParents.forEach((parent, mesh) => {
                    if (parent) parent.add(mesh);
                });
                this._originalParents = null;
            }
        }
    }

    // ==================== PLANE VISUALIZATION ====================

    _updatePlanes(frame, refSpace) {
        if (!this._planeDetectionEnabled || !frame.detectedPlanes) return;

        const currentPlanes = new Set();

        for (const plane of frame.detectedPlanes) {
            currentPlanes.add(plane);

            if (!this._detectedPlanes.has(plane)) {
                // New plane — create visualization
                const planePose = frame.getPose(plane.planeSpace, refSpace);
                if (!planePose) continue;

                const polygon = plane.polygon;
                if (!polygon || polygon.length < 3) continue;

                // Create plane mesh from polygon
                const shape = new THREE.Shape();
                shape.moveTo(polygon[0].x, polygon[0].z);
                for (let i = 1; i < polygon.length; i++) {
                    shape.lineTo(polygon[i].x, polygon[i].z);
                }
                shape.closePath();

                const geo = new THREE.ShapeGeometry(shape);
                geo.rotateX(-Math.PI / 2);
                const mat = new THREE.MeshBasicMaterial({
                    color: plane.orientation === 'horizontal' ? 0x00ffff : 0x3fb950,
                    transparent: true,
                    opacity: 0.08,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.matrix.fromArray(planePose.transform.matrix);
                mesh.matrixAutoUpdate = false;
                this.scene.add(mesh);
                this._detectedPlanes.set(plane, mesh);
            }
        }

        // Remove stale planes
        this._detectedPlanes.forEach((mesh, plane) => {
            if (!currentPlanes.has(plane)) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                this._detectedPlanes.delete(plane);
            }
        });
    }

    // ==================== MOBILE CAMERA AR (iOS/non-WebXR fallback) ====================

    _createMobileARButton() {
        // Only show on mobile devices without WebXR AR support
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) return;

        // Wait to check if WebXR AR is available
        const createButton = () => {
            const btn = document.createElement('button');
            btn.id = 'mobile-ar-btn';
            btn.textContent = 'CAMERA AR';
            btn.style.cssText = `
                position: fixed; bottom: 90px; right: 20px; z-index: 100;
                font-family: 'Courier New', monospace; font-size: 12px;
                padding: 8px 16px; border: 1px solid #f0883e; color: #f0883e;
                background: rgba(0, 20, 30, 0.9); border-radius: 4px; cursor: pointer;
                letter-spacing: 1px; display: none;
            `;
            btn.addEventListener('click', () => this._toggleCameraAR());
            document.body.appendChild(btn);
            this._mobileARButton = btn;

            // Show only if WebXR AR is NOT supported
            if (navigator.xr) {
                navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                    if (!supported) btn.style.display = 'block';
                }).catch(() => { btn.style.display = 'block'; });
            } else {
                btn.style.display = 'block';
            }
        };

        if (document.readyState === 'complete') createButton();
        else window.addEventListener('load', createButton);
    }

    async _toggleCameraAR() {
        if (this._xrMode === 'camera-ar') {
            this._stopCameraAR();
            return;
        }

        try {
            // Request rear camera
            this._cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            // Create video element as background
            this._cameraVideo = document.createElement('video');
            this._cameraVideo.srcObject = this._cameraStream;
            this._cameraVideo.setAttribute('playsinline', '');
            this._cameraVideo.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                object-fit: cover; z-index: -1;
            `;
            document.body.prepend(this._cameraVideo);
            await this._cameraVideo.play();

            // Make renderer transparent
            this.renderer.setClearColor(0x000000, 0);
            this.scene.background = null;

            // Scale down for room-scale
            this._simulationAnchor.scale.set(this._arScale, this._arScale, this._arScale);
            this._simulationAnchor.position.set(0, -0.5, -2);
            this._simulationAnchor.visible = true;
            this.scene.add(this._simulationAnchor);
            this._reparentSimulation(true);

            this._xrMode = 'camera-ar';
            this.controls.autoRotate = false;

            // Update button
            if (this._mobileARButton) {
                this._mobileARButton.textContent = 'EXIT AR';
                this._mobileARButton.style.borderColor = '#f85149';
                this._mobileARButton.style.color = '#f85149';
            }

            // Touch to reposition
            this._cameraTouchHandler = (e) => {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    const x = (touch.clientX / window.innerWidth) * 2 - 1;
                    const y = -(touch.clientY / window.innerHeight) * 2 + 1;
                    // Move simulation to tap point (approximate depth)
                    this._simulationAnchor.position.set(x * 2, y * 2 - 0.5, -2);
                } else if (e.touches.length === 2) {
                    // Pinch to scale
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (this._lastPinchDist) {
                        const delta = (dist - this._lastPinchDist) * 0.002;
                        this._arScale = Math.max(0.02, Math.min(0.5, this._arScale + delta));
                        this._simulationAnchor.scale.setScalar(this._arScale);
                    }
                    this._lastPinchDist = dist;
                }
            };
            this._cameraTouchEndHandler = () => { this._lastPinchDist = null; };
            document.addEventListener('touchmove', this._cameraTouchHandler, { passive: true });
            document.addEventListener('touchend', this._cameraTouchEndHandler);

            this._showXRStatus('Camera AR — Tap to move, pinch to resize');
            setTimeout(() => this._removeXRStatus(), 3000);

        } catch (e) {
            console.warn('[XR] Camera AR failed:', e.message);
            this._showXRStatus(`Camera access failed: ${e.message}`);
            setTimeout(() => this._removeXRStatus(), 3000);
        }
    }

    _stopCameraAR() {
        // Stop camera
        if (this._cameraStream) {
            this._cameraStream.getTracks().forEach(t => t.stop());
            this._cameraStream = null;
        }
        if (this._cameraVideo) {
            this._cameraVideo.remove();
            this._cameraVideo = null;
        }

        // Restore renderer
        this.renderer.setClearColor(0x0a0a0f, 1);
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Restore simulation
        this._reparentSimulation(false);
        if (this._simulationAnchor.parent) {
            this.scene.remove(this._simulationAnchor);
        }

        this._xrMode = 'none';
        this.controls.autoRotate = true;

        // Remove touch handlers
        if (this._cameraTouchHandler) {
            document.removeEventListener('touchmove', this._cameraTouchHandler);
            document.removeEventListener('touchend', this._cameraTouchEndHandler);
        }

        // Update button
        if (this._mobileARButton) {
            this._mobileARButton.textContent = 'CAMERA AR';
            this._mobileARButton.style.borderColor = '#f0883e';
            this._mobileARButton.style.color = '#f0883e';
        }
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
                    requiredFeatures: ['local-floor', 'hit-test'],
                    optionalFeatures: ['hand-tracking', 'plane-detection', 'anchors',
                                       'depth-sensing', 'camera-access', 'mesh-detection'],
                });
                this.renderer.xr.setSession(session);
            } catch (e) {
                console.warn('[XR] AR session failed:', e.message);
                // Fallback to camera AR
                this._toggleCameraAR();
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
            if (this._voiceActive) {
                setTimeout(() => { try { this._recognition.start(); } catch {} }, 300);
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

        const chatArea = document.getElementById('chat-input-area');
        if (chatArea) {
            const imageBtn = document.getElementById('chat-image-btn');
            if (imageBtn) imageBtn.after(btn);
            else chatArea.prepend(btn);
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
        this._voiceActive ? this.stopVoice() : this.startVoice();
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

    // ==================== UPDATE LOOP ====================

    update(timestamp, frame) {
        if (this._xrMode === 'ar' && frame) {
            const refSpace = this.renderer.xr.getReferenceSpace();

            // Hit-test: update reticle position
            if (this._hitTestSource && !this._placed) {
                const results = frame.getHitTestResults(this._hitTestSource);
                if (results.length > 0) {
                    const hit = results[0];
                    const pose = hit.getPose(refSpace);
                    if (pose) {
                        this._reticle.visible = true;
                        this._reticle.matrix.fromArray(pose.transform.matrix);
                        // Extract position for placement
                        this._reticle.position.setFromMatrixPosition(this._reticle.matrix);
                    }
                } else {
                    this._reticle.visible = false;
                }
            }

            // Plane detection (Quest 3)
            this._updatePlanes(frame, refSpace);
        }

        if (this._xrMode === 'none') {
            this.controls.update();
        }
    }

    dispose() {
        this.controls.dispose();
        this.stopVoice();
        this._stopCameraAR();
    }
}
