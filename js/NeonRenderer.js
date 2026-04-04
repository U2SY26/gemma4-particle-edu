// Dynamic imports for Three.js — resolved at init() time so that a missing
// or broken import does not prevent the rest of the app from loading.
let THREE = null;
let OrbitControls = null;
let EffectComposer = null;
let RenderPass = null;
let UnrealBloomPass = null;

async function loadThreeJS() {
  try {
    THREE = await import('/node_modules/three/build/three.module.js');
    const controls = await import('/node_modules/three/examples/jsm/controls/OrbitControls.js');
    OrbitControls = controls.OrbitControls;
    const composer = await import('/node_modules/three/examples/jsm/postprocessing/EffectComposer.js');
    EffectComposer = composer.EffectComposer;
    const rp = await import('/node_modules/three/examples/jsm/postprocessing/RenderPass.js');
    RenderPass = rp.RenderPass;
    const bloom = await import('/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js');
    UnrealBloomPass = bloom.UnrealBloomPass;
  } catch (err) {
    console.warn('Three.js loading failed:', err.message);
  }
}

const DEFAULT_OPTIONS = {
  bloomStrength: 1.5,
  antialias: true,
};

const BACKGROUND_COLOR = 0x0a0a0f;
const MAX_PARTICLES = 4096;
const MAX_SPRINGS = 8192;

/**
 * Stress-to-color mapping.
 * stress 0 = green (safe), 0.5 = yellow (warning), 1 = red (yield/failure).
 * Values are clamped to [0, 1].
 */
function stressToColor(stress) {
  const t = Math.max(0, Math.min(1, stress));
  // green -> yellow -> red  (HSL hue: 120 -> 60 -> 0)
  const r = t < 0.5 ? t * 2 : 1;
  const g = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
  const b = 0;
  return { r, g, b };
}

export default class NeonRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ bloomStrength?: number, antialias?: boolean }} options
   */
  constructor(canvas, options = {}) {
    this._canvas = canvas;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    this._bloomStrength = this._options.bloomStrength;
    this._width = canvas?.width ?? 800;
    this._height = canvas?.height ?? 600;

    // Three.js objects (created in init)
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._composer = null;
    this._bloomPass = null;

    // Particle rendering (InstancedMesh)
    this._particleMesh = null;
    this._particleCount = 0;

    // Spring rendering (LineSegments)
    this._springLines = null;
    this._springPositions = null;
    this._springCount = 0;

    // Camera state for getCamera when controls not available
    this._cameraPosition = { x: 0, y: 5, z: 20 };
    this._cameraTarget = { x: 0, y: 0, z: 0 };

    this._disposed = false;
  }

  /**
   * Initialize the Three.js renderer, scene, camera, post-processing, and controls.
   * @returns {Promise<void>}
   */
  async init() {
    // Dynamically load Three.js (keeps the static import clean for bundler-less browsers)
    await loadThreeJS();
    if (!THREE) {
      throw new Error('NeonRenderer: Three.js could not be loaded');
    }

    // Renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: this._options.antialias,
    });
    this._renderer.setSize(this._width, this._height);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    this._renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    // Scene
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(BACKGROUND_COLOR);

    // Camera
    this._camera = new THREE.PerspectiveCamera(
      60,
      this._width / this._height,
      0.1,
      1000
    );
    this._camera.position.set(
      this._cameraPosition.x,
      this._cameraPosition.y,
      this._cameraPosition.z
    );
    this._camera.lookAt(
      this._cameraTarget.x,
      this._cameraTarget.y,
      this._cameraTarget.z
    );

    // OrbitControls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.target.set(
      this._cameraTarget.x,
      this._cameraTarget.y,
      this._cameraTarget.z
    );
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.08;
    this._controls.update();

    // Ambient light (dim, neon look)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this._scene.add(ambientLight);

    // Directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this._scene.add(dirLight);

    // Post-processing: bloom
    this._composer = new EffectComposer(this._renderer);
    const renderPass = new RenderPass(this._scene, this._camera);
    this._composer.addPass(renderPass);

    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this._width, this._height),
      this._bloomStrength, // strength
      0.4,                 // radius
      0.85                 // threshold
    );
    this._composer.addPass(this._bloomPass);

    // Pre-allocate InstancedMesh for particles
    this._initParticleMesh();

    // Pre-allocate LineSegments for springs
    this._initSpringLines();
  }

  /** Create the InstancedMesh for rendering particles. */
  _initParticleMesh() {
    const geometry = new THREE.SphereGeometry(1, 16, 12);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4,
    });

    this._particleMesh = new THREE.InstancedMesh(
      geometry,
      material,
      MAX_PARTICLES
    );
    this._particleMesh.count = 0;
    this._particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Per-instance color
    this._particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 3),
      3
    );
    this._particleMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    this._scene.add(this._particleMesh);
  }

  /** Create the LineSegments for rendering springs. */
  _initSpringLines() {
    const posArray = new Float32Array(MAX_SPRINGS * 2 * 3); // 2 vertices per spring, 3 floats each
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posArray, 3)
    );
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.5,
    });

    this._springLines = new THREE.LineSegments(geometry, material);
    this._springPositions = posArray;
    this._scene.add(this._springLines);
  }

  /**
   * Render one frame with the given particles and springs.
   * @param {Array<{ id: any, x: number, y: number, z: number, mass: number, radius: number, material?: string, stress?: number, fixed?: boolean }>} particles
   * @param {Array<{ idA: any, idB: any }>} springs
   */
  render(particles = [], springs = []) {
    if (this._disposed) return;

    this._updateParticles(particles);
    this._updateSprings(springs, particles);

    if (this._controls) {
      this._controls.update();
    }

    if (this._composer) {
      this._composer.render();
    }
  }

  /** Update instanced mesh transforms and colors from particle data. */
  _updateParticles(particles) {
    if (!this._particleMesh) return;

    const count = Math.min(particles.length, MAX_PARTICLES);
    this._particleMesh.count = count;
    this._particleCount = count;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const radius = p.radius ?? 0.1;

      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      this._particleMesh.setMatrixAt(i, dummy.matrix);

      // Stress color mapping
      const stress = p.stress ?? 0;
      const sc = stressToColor(stress);
      color.setRGB(sc.r, sc.g, sc.b);
      this._particleMesh.setColorAt(i, color);
    }

    this._particleMesh.instanceMatrix.needsUpdate = true;
    if (this._particleMesh.instanceColor) {
      this._particleMesh.instanceColor.needsUpdate = true;
    }
  }

  /** Update line segments from spring + particle data. */
  _updateSprings(springs, particles) {
    if (!this._springLines) return;

    const count = Math.min(springs.length, MAX_SPRINGS);
    this._springCount = count;

    // Build lookup from particle id -> particle for fast access
    const lookup = new Map();
    for (const p of particles) {
      lookup.set(p.id, p);
    }

    const pos = this._springPositions;
    let idx = 0;

    for (let i = 0; i < count; i++) {
      const s = springs[i];
      const a = lookup.get(s.idA);
      const b = lookup.get(s.idB);
      if (!a || !b) {
        // Missing endpoint -- collapse to zero-length segment
        pos[idx] = 0; pos[idx + 1] = 0; pos[idx + 2] = 0;
        pos[idx + 3] = 0; pos[idx + 4] = 0; pos[idx + 5] = 0;
      } else {
        pos[idx]     = a.x; pos[idx + 1] = a.y; pos[idx + 2] = a.z;
        pos[idx + 3] = b.x; pos[idx + 4] = b.y; pos[idx + 5] = b.z;
      }
      idx += 6;
    }

    this._springLines.geometry.setDrawRange(0, count * 2);
    this._springLines.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Resize the renderer and camera to the given dimensions.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this._width = width;
    this._height = height;

    if (this._camera) {
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
    }
    if (this._renderer) {
      this._renderer.setSize(width, height);
    }
    if (this._composer) {
      this._composer.setSize(width, height);
    }
    if (this._bloomPass) {
      this._bloomPass.resolution.set(width, height);
    }
  }

  /**
   * Set bloom post-processing intensity.
   * @param {number} intensity
   */
  setBloom(intensity) {
    this._bloomStrength = intensity;
    if (this._bloomPass) {
      this._bloomPass.strength = intensity;
    }
  }

  /**
   * Set camera position and look-at target.
   * @param {{ x: number, y: number, z: number }} position
   * @param {{ x: number, y: number, z: number }} target
   */
  setCamera(position, target) {
    this._cameraPosition = { ...position };
    this._cameraTarget = { ...target };

    if (this._camera) {
      this._camera.position.set(position.x, position.y, position.z);
      this._camera.lookAt(target.x, target.y, target.z);
    }
    if (this._controls) {
      this._controls.target.set(target.x, target.y, target.z);
      this._controls.update();
    }
  }

  /**
   * Get current camera position and target.
   * @returns {{ position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } }}
   */
  getCamera() {
    if (this._camera && this._controls) {
      const pos = this._camera.position;
      const tgt = this._controls.target;
      return {
        position: { x: pos.x, y: pos.y, z: pos.z },
        target: { x: tgt.x, y: tgt.y, z: tgt.z },
      };
    }
    return {
      position: { ...this._cameraPosition },
      target: { ...this._cameraTarget },
    };
  }

  /**
   * Get the underlying Three.js WebGLRenderer.
   * @returns {THREE.WebGLRenderer | null}
   */
  getRenderer() {
    return this._renderer;
  }

  /**
   * Dispose all Three.js resources and clean up.
   */
  dispose() {
    this._disposed = true;

    if (this._controls) {
      this._controls.dispose();
      this._controls = null;
    }
    if (this._particleMesh) {
      this._particleMesh.geometry.dispose();
      this._particleMesh.material.dispose();
      this._scene?.remove(this._particleMesh);
      this._particleMesh = null;
    }
    if (this._springLines) {
      this._springLines.geometry.dispose();
      this._springLines.material.dispose();
      this._scene?.remove(this._springLines);
      this._springLines = null;
    }
    if (this._composer) {
      this._composer = null;
    }
    if (this._bloomPass) {
      this._bloomPass = null;
    }
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = null;
    }
    this._scene = null;
    this._camera = null;
    this._springPositions = null;
  }
}

// Also export the helper for testing
export { stressToColor };
