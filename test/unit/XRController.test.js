import { describe, it, expect, vi, beforeEach } from 'vitest';
import XRController from '../../js/XRController.js';

// ---------------------------------------------------------------------------
// Helpers — mock NeonRenderer & navigator.xr
// ---------------------------------------------------------------------------

function createMockRenderer(xrEnabled = false) {
  const glRenderer = { xr: { enabled: xrEnabled } };
  return {
    getRenderer: vi.fn(() => glRenderer),
    _glRenderer: glRenderer,
  };
}

function createMockSession() {
  const listeners = {};
  return {
    requestReferenceSpace: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    removeEventListener: vi.fn((event, cb) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== cb);
      }
    }),
    end: vi.fn(),
    // Expose internal listeners for testing
    _listeners: listeners,
  };
}

function installNavigatorXR(session) {
  Object.defineProperty(globalThis.navigator, 'xr', {
    value: {
      requestSession: vi.fn().mockResolvedValue(session),
    },
    writable: true,
    configurable: true,
  });
}

function removeNavigatorXR() {
  Object.defineProperty(globalThis.navigator, 'xr', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('XRController', () => {
  let mockNeon;
  let mockSession;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNeon = createMockRenderer();
    mockSession = createMockSession();
    removeNavigatorXR();
  });

  // -- Constructor ----------------------------------------------------------

  describe('constructor', () => {
    it('stores the renderer reference', () => {
      const xr = new XRController(mockNeon);
      expect(xr._renderer).toBe(mockNeon);
    });

    it('starts with no active session', () => {
      const xr = new XRController(mockNeon);
      expect(xr._session).toBeNull();
    });
  });

  // -- isSupported ----------------------------------------------------------

  describe('isSupported', () => {
    it('returns false when navigator.xr is undefined', () => {
      removeNavigatorXR();
      const xr = new XRController(mockNeon);
      expect(xr.isSupported()).toBe(false);
    });

    it('returns true when navigator.xr exists', () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      expect(xr.isSupported()).toBe(true);
    });
  });

  // -- enterVR --------------------------------------------------------------

  describe('enterVR', () => {
    it('rejects when WebXR is not supported', async () => {
      removeNavigatorXR();
      const xr = new XRController(mockNeon);
      await expect(xr.enterVR()).rejects.toThrow('WebXR is not supported');
    });

    it('rejects when WebGLRenderer is not available', async () => {
      installNavigatorXR(mockSession);
      const noRenderer = { getRenderer: vi.fn(() => null) };
      const xr = new XRController(noRenderer);
      await expect(xr.enterVR()).rejects.toThrow('WebGLRenderer is not available');
    });

    it('calls requestSession with immersive-vr', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      expect(navigator.xr.requestSession).toHaveBeenCalledWith('immersive-vr');
    });

    it('enables xr on the WebGLRenderer', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      const glRenderer = mockNeon.getRenderer();
      expect(glRenderer.xr.enabled).toBe(true);
    });

    it('requests local-floor reference space', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      expect(mockSession.requestReferenceSpace).toHaveBeenCalledWith('local-floor');
    });

    it('emits enter event', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      const enterCb = vi.fn();
      xr.on('enter', enterCb);
      await xr.enterVR();
      expect(enterCb).toHaveBeenCalledTimes(1);
    });

    it('stores the session', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      expect(xr._session).toBe(mockSession);
    });

    it('registers select and squeeze listeners on the session', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      const eventNames = mockSession.addEventListener.mock.calls.map((c) => c[0]);
      expect(eventNames).toContain('select');
      expect(eventNames).toContain('squeeze');
    });
  });

  // -- exitVR ---------------------------------------------------------------

  describe('exitVR', () => {
    it('calls session.end()', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      xr.exitVR();
      expect(mockSession.end).toHaveBeenCalled();
    });

    it('disables xr on the WebGLRenderer', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      xr.exitVR();
      const glRenderer = mockNeon.getRenderer();
      expect(glRenderer.xr.enabled).toBe(false);
    });

    it('emits exit event', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      const exitCb = vi.fn();
      xr.on('exit', exitCb);
      await xr.enterVR();
      xr.exitVR();
      expect(exitCb).toHaveBeenCalledTimes(1);
    });

    it('clears the session reference', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      xr.exitVR();
      expect(xr._session).toBeNull();
    });

    it('is a no-op when no session is active', () => {
      const xr = new XRController(mockNeon);
      expect(() => xr.exitVR()).not.toThrow();
    });

    it('removes select and squeeze listeners from the session', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      await xr.enterVR();
      xr.exitVR();
      const removedEvents = mockSession.removeEventListener.mock.calls.map((c) => c[0]);
      expect(removedEvents).toContain('select');
      expect(removedEvents).toContain('squeeze');
    });
  });

  // -- on / off event management --------------------------------------------

  describe('on / off', () => {
    it('registers and fires a listener', () => {
      const xr = new XRController(mockNeon);
      const cb = vi.fn();
      xr.on('select', cb);
      xr._emit('select');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('removes a listener with off()', () => {
      const xr = new XRController(mockNeon);
      const cb = vi.fn();
      xr.on('select', cb);
      xr.off('select', cb);
      xr._emit('select');
      expect(cb).not.toHaveBeenCalled();
    });

    it('supports multiple listeners on the same event', () => {
      const xr = new XRController(mockNeon);
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      xr.on('enter', cb1);
      xr.on('enter', cb2);
      xr._emit('enter');
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('does not throw for unknown event names', () => {
      const xr = new XRController(mockNeon);
      expect(() => xr.on('unknown', vi.fn())).not.toThrow();
      expect(() => xr.off('unknown', vi.fn())).not.toThrow();
    });

    it('forwards session select events to on() listeners', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      const selectCb = vi.fn();
      xr.on('select', selectCb);
      await xr.enterVR();

      // Simulate the session firing a 'select' event
      const sessionSelectHandler = mockSession.addEventListener.mock.calls.find(
        (c) => c[0] === 'select'
      )[1];
      sessionSelectHandler();

      expect(selectCb).toHaveBeenCalledTimes(1);
    });

    it('forwards session squeeze events to on() listeners', async () => {
      installNavigatorXR(mockSession);
      const xr = new XRController(mockNeon);
      const squeezeCb = vi.fn();
      xr.on('squeeze', squeezeCb);
      await xr.enterVR();

      // Simulate the session firing a 'squeeze' event
      const sessionSqueezeHandler = mockSession.addEventListener.mock.calls.find(
        (c) => c[0] === 'squeeze'
      )[1];
      sessionSqueezeHandler();

      expect(squeezeCb).toHaveBeenCalledTimes(1);
    });
  });
});
