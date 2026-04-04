import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock THREE and addons before importing NeonRenderer.
// jsdom has no WebGL, so we stub out all Three.js constructors/methods.
// ---------------------------------------------------------------------------

const mockDispose = vi.fn();
const mockSetSize = vi.fn();
const mockSetPixelRatio = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockLookAt = vi.fn();
const mockUpdateProjectionMatrix = vi.fn();
const mockAddPass = vi.fn();
const mockComposerRender = vi.fn();
const mockComposerSetSize = vi.fn();
const mockSceneAdd = vi.fn();
const mockSceneRemove = vi.fn();
const mockSetScalar = vi.fn();
const mockUpdateMatrix = vi.fn();
const mockSetMatrixAt = vi.fn();
const mockSetColorAt = vi.fn();
const mockSetDrawRange = vi.fn();

// Shared position/target mock objects
function createVec3Mock(x = 0, y = 0, z = 0) {
  return { x, y, z, set: vi.fn() };
}

vi.mock('three', () => {
  const Color = vi.fn().mockImplementation(() => ({
    setRGB: vi.fn(),
  }));

  const Vector2 = vi.fn().mockImplementation((x, y) => ({
    x, y, set: vi.fn(),
  }));

  const Object3D = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    scale: { setScalar: mockSetScalar },
    matrix: {},
    updateMatrix: mockUpdateMatrix,
  }));

  const SphereGeometry = vi.fn().mockImplementation(() => ({
    dispose: mockDispose,
  }));

  const MeshStandardMaterial = vi.fn().mockImplementation(() => ({
    dispose: mockDispose,
  }));

  const BufferGeometry = vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    setDrawRange: mockSetDrawRange,
    attributes: { position: { needsUpdate: false } },
    dispose: mockDispose,
  }));

  const BufferAttribute = vi.fn().mockImplementation(() => ({}));

  const InstancedBufferAttribute = vi.fn().mockImplementation(() => ({
    setUsage: vi.fn(),
    needsUpdate: false,
  }));

  const LineBasicMaterial = vi.fn().mockImplementation(() => ({
    dispose: mockDispose,
  }));

  const InstancedMesh = vi.fn().mockImplementation(() => ({
    count: 0,
    instanceMatrix: { setUsage: vi.fn(), needsUpdate: false },
    instanceColor: null,
    setMatrixAt: mockSetMatrixAt,
    setColorAt: mockSetColorAt,
    geometry: { dispose: mockDispose },
    material: { dispose: mockDispose },
  }));

  const LineSegments = vi.fn().mockImplementation(() => ({
    geometry: {
      setAttribute: vi.fn(),
      setDrawRange: mockSetDrawRange,
      attributes: { position: { needsUpdate: false } },
      dispose: mockDispose,
    },
    material: { dispose: mockDispose },
  }));

  const cameraPosition = createVec3Mock(0, 5, 20);
  const PerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: cameraPosition,
    aspect: 1,
    lookAt: mockLookAt,
    updateProjectionMatrix: mockUpdateProjectionMatrix,
  }));

  const WebGLRenderer = vi.fn().mockImplementation(() => ({
    setSize: mockSetSize,
    setPixelRatio: mockSetPixelRatio,
    toneMapping: 0,
    toneMappingExposure: 1,
    domElement: {},
    dispose: mockDispose,
  }));

  const Scene = vi.fn().mockImplementation(() => ({
    background: null,
    add: mockSceneAdd,
    remove: mockSceneRemove,
  }));

  const AmbientLight = vi.fn().mockImplementation(() => ({}));

  const DirectionalLight = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
  }));

  return {
    Color,
    Vector2,
    Object3D,
    SphereGeometry,
    MeshStandardMaterial,
    BufferGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    LineBasicMaterial,
    InstancedMesh,
    LineSegments,
    PerspectiveCamera,
    WebGLRenderer,
    Scene,
    AmbientLight,
    DirectionalLight,
    DynamicDrawUsage: 35048,
    ReinhardToneMapping: 2,
  };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: createVec3Mock(),
    enableDamping: false,
    dampingFactor: 0,
    update: mockUpdate,
    dispose: mockDispose,
  })),
}));

vi.mock('three/addons/postprocessing/EffectComposer.js', () => ({
  EffectComposer: vi.fn().mockImplementation(() => ({
    addPass: mockAddPass,
    render: mockComposerRender,
    setSize: mockComposerSetSize,
  })),
}));

vi.mock('three/addons/postprocessing/RenderPass.js', () => ({
  RenderPass: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: vi.fn().mockImplementation(() => ({
    strength: 1.5,
    resolution: { set: vi.fn() },
  })),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER all mocks are set up.
// ---------------------------------------------------------------------------
import NeonRenderer, { stressToColor } from '../../js/NeonRenderer.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NeonRenderer', () => {
  /** @type {NeonRenderer} */
  let renderer;
  const fakeCanvas = { width: 1024, height: 768 };

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new NeonRenderer(fakeCanvas);
  });

  // -- Constructor ----------------------------------------------------------

  describe('constructor', () => {
    it('stores default options when none provided', () => {
      expect(renderer._options.bloomStrength).toBe(1.5);
      expect(renderer._options.antialias).toBe(true);
    });

    it('merges custom options with defaults', () => {
      const custom = new NeonRenderer(fakeCanvas, { bloomStrength: 2.5 });
      expect(custom._options.bloomStrength).toBe(2.5);
      expect(custom._options.antialias).toBe(true);
    });

    it('stores canvas dimensions', () => {
      expect(renderer._width).toBe(1024);
      expect(renderer._height).toBe(768);
    });

    it('starts with internal refs as null before init', () => {
      expect(renderer._renderer).toBeNull();
      expect(renderer._scene).toBeNull();
      expect(renderer._camera).toBeNull();
      expect(renderer._composer).toBeNull();
    });

    it('defaults to not disposed', () => {
      expect(renderer._disposed).toBe(false);
    });
  });

  // -- init -----------------------------------------------------------------

  describe('init', () => {
    it('returns a Promise', () => {
      const result = renderer.init();
      expect(result).toBeInstanceOf(Promise);
    });

    it('creates renderer, scene, camera, controls, and composer', async () => {
      await renderer.init();
      expect(renderer._renderer).not.toBeNull();
      expect(renderer._scene).not.toBeNull();
      expect(renderer._camera).not.toBeNull();
      expect(renderer._controls).not.toBeNull();
      expect(renderer._composer).not.toBeNull();
      expect(renderer._bloomPass).not.toBeNull();
    });

    it('creates particle instanced mesh', async () => {
      await renderer.init();
      expect(renderer._particleMesh).not.toBeNull();
    });

    it('creates spring line segments', async () => {
      await renderer.init();
      expect(renderer._springLines).not.toBeNull();
    });
  });

  // -- setBloom --------------------------------------------------------------

  describe('setBloom', () => {
    it('updates internal bloom strength before init', () => {
      renderer.setBloom(3.0);
      expect(renderer._bloomStrength).toBe(3.0);
    });

    it('updates bloom pass strength after init', async () => {
      await renderer.init();
      renderer.setBloom(2.5);
      expect(renderer._bloomStrength).toBe(2.5);
      expect(renderer._bloomPass.strength).toBe(2.5);
    });
  });

  // -- setCamera / getCamera -------------------------------------------------

  describe('setCamera / getCamera', () => {
    it('round-trips camera position and target before init', () => {
      const pos = { x: 10, y: 20, z: 30 };
      const tgt = { x: 1, y: 2, z: 3 };
      renderer.setCamera(pos, tgt);

      const cam = renderer.getCamera();
      expect(cam.position).toEqual(pos);
      expect(cam.target).toEqual(tgt);
    });

    it('round-trips after init (reads from THREE objects)', async () => {
      await renderer.init();
      const pos = { x: 5, y: 10, z: 15 };
      const tgt = { x: -1, y: 0, z: 1 };
      renderer.setCamera(pos, tgt);

      // The mock camera.position is a plain object with a set() spy,
      // and getCamera reads from it, so verify setCamera called set().
      expect(renderer._camera.position.set).toHaveBeenCalledWith(5, 10, 15);
      expect(renderer._controls.target.set).toHaveBeenCalledWith(-1, 0, 1);
    });

    it('does not mutate the original position/target objects', () => {
      const pos = { x: 1, y: 2, z: 3 };
      const tgt = { x: 4, y: 5, z: 6 };
      renderer.setCamera(pos, tgt);
      pos.x = 999;
      tgt.x = 999;

      expect(renderer._cameraPosition.x).toBe(1);
      expect(renderer._cameraTarget.x).toBe(4);
    });
  });

  // -- resize ----------------------------------------------------------------

  describe('resize', () => {
    it('updates stored width and height', () => {
      renderer.resize(1920, 1080);
      expect(renderer._width).toBe(1920);
      expect(renderer._height).toBe(1080);
    });

    it('updates camera aspect and renderer size after init', async () => {
      await renderer.init();
      renderer.resize(800, 600);

      expect(renderer._camera.aspect).toBe(800 / 600);
      expect(mockUpdateProjectionMatrix).toHaveBeenCalled();
      expect(mockSetSize).toHaveBeenCalledWith(800, 600);
      expect(mockComposerSetSize).toHaveBeenCalledWith(800, 600);
    });
  });

  // -- render ----------------------------------------------------------------

  describe('render', () => {
    it('does not throw with empty arrays', async () => {
      await renderer.init();
      expect(() => renderer.render([], [])).not.toThrow();
    });

    it('does not throw with undefined arguments', async () => {
      await renderer.init();
      expect(() => renderer.render()).not.toThrow();
    });

    it('calls composer.render', async () => {
      await renderer.init();
      renderer.render([], []);
      expect(mockComposerRender).toHaveBeenCalled();
    });

    it('does nothing after dispose', async () => {
      await renderer.init();
      renderer.dispose();
      mockComposerRender.mockClear();
      renderer.render([], []);
      expect(mockComposerRender).not.toHaveBeenCalled();
    });
  });

  // -- getRenderer -----------------------------------------------------------

  describe('getRenderer', () => {
    it('returns null before init', () => {
      expect(renderer.getRenderer()).toBeNull();
    });

    it('returns the WebGLRenderer after init', async () => {
      await renderer.init();
      expect(renderer.getRenderer()).not.toBeNull();
    });
  });

  // -- dispose ---------------------------------------------------------------

  describe('dispose', () => {
    it('sets disposed flag', () => {
      renderer.dispose();
      expect(renderer._disposed).toBe(true);
    });

    it('nullifies internal references', async () => {
      await renderer.init();
      renderer.dispose();
      expect(renderer._renderer).toBeNull();
      expect(renderer._scene).toBeNull();
      expect(renderer._camera).toBeNull();
      expect(renderer._controls).toBeNull();
      expect(renderer._composer).toBeNull();
      expect(renderer._bloomPass).toBeNull();
      expect(renderer._particleMesh).toBeNull();
      expect(renderer._springLines).toBeNull();
    });

    it('calls dispose on controls and renderer', async () => {
      await renderer.init();
      renderer.dispose();
      // mockDispose is shared across mocks; just verify it was called
      expect(mockDispose).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// stressToColor (pure function, no WebGL needed)
// ---------------------------------------------------------------------------

describe('stressToColor', () => {
  it('returns green at stress=0', () => {
    const c = stressToColor(0);
    expect(c.r).toBeCloseTo(0);
    expect(c.g).toBeCloseTo(1);
    expect(c.b).toBe(0);
  });

  it('returns yellow at stress=0.5', () => {
    const c = stressToColor(0.5);
    expect(c.r).toBeCloseTo(1);
    expect(c.g).toBeCloseTo(1);
    expect(c.b).toBe(0);
  });

  it('returns red at stress=1', () => {
    const c = stressToColor(1);
    expect(c.r).toBeCloseTo(1);
    expect(c.g).toBeCloseTo(0);
    expect(c.b).toBe(0);
  });

  it('clamps negative stress to green', () => {
    const c = stressToColor(-0.5);
    expect(c.r).toBeCloseTo(0);
    expect(c.g).toBeCloseTo(1);
  });

  it('clamps stress > 1 to red', () => {
    const c = stressToColor(2.0);
    expect(c.r).toBeCloseTo(1);
    expect(c.g).toBeCloseTo(0);
  });

  it('interpolates smoothly at stress=0.25 (orange-green)', () => {
    const c = stressToColor(0.25);
    expect(c.r).toBeCloseTo(0.5);
    expect(c.g).toBeCloseTo(1);
    expect(c.b).toBe(0);
  });
});
