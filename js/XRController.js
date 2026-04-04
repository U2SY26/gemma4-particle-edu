/**
 * XRController — WebXR VR support on top of NeonRenderer.
 *
 * Provides a thin event-driven wrapper around the WebXR Device API.
 * Falls back gracefully when the browser does not support WebXR.
 */

const VALID_EVENTS = ['select', 'squeeze', 'enter', 'exit'];

export default class XRController {
  /**
   * @param {import('./NeonRenderer.js').default} renderer — NeonRenderer instance
   */
  constructor(renderer) {
    /** @type {import('./NeonRenderer.js').default} */
    this._renderer = renderer;

    /** @type {XRSession | null} */
    this._session = null;

    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map(VALID_EVENTS.map((e) => [e, new Set()]));

    // Bound handlers so we can add/remove them from the session.
    this._onSelect = () => this._emit('select');
    this._onSqueeze = () => this._emit('squeeze');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Check whether the current browser exposes the WebXR API.
   * @returns {boolean}
   */
  isSupported() {
    return typeof navigator !== 'undefined' && navigator.xr != null;
  }

  /**
   * Request an immersive-vr session and wire up the renderer.
   * Rejects with a descriptive error if WebXR is not available.
   * @returns {Promise<void>}
   */
  async enterVR() {
    if (!this.isSupported()) {
      throw new Error('WebXR is not supported in this browser');
    }

    const glRenderer = this._renderer.getRenderer();
    if (!glRenderer) {
      throw new Error('WebGLRenderer is not available — call NeonRenderer.init() first');
    }

    const session = await navigator.xr.requestSession('immersive-vr');
    this._session = session;

    glRenderer.xr.enabled = true;

    await session.requestReferenceSpace('local-floor');

    // Controller input events
    session.addEventListener('select', this._onSelect);
    session.addEventListener('squeeze', this._onSqueeze);

    // Clean-up when the session ends externally (e.g. user removes headset)
    session.addEventListener('end', () => {
      this._teardownSession();
    });

    this._emit('enter');
  }

  /**
   * End the current XR session (no-op if no session is active).
   */
  exitVR() {
    if (this._session) {
      this._session.end();
      this._teardownSession();
    }
  }

  /**
   * Register an event listener.
   * @param {'select' | 'squeeze' | 'enter' | 'exit'} event
   * @param {Function} callback
   */
  on(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.add(callback);
    }
  }

  /**
   * Remove a previously registered event listener.
   * @param {'select' | 'squeeze' | 'enter' | 'exit'} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   */
  _emit(event) {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        cb();
      }
    }
  }

  /**
   * Clean-up after a session ends (called by exitVR and the session 'end' listener).
   * @private
   */
  _teardownSession() {
    if (this._session) {
      this._session.removeEventListener('select', this._onSelect);
      this._session.removeEventListener('squeeze', this._onSqueeze);
      this._session = null;
    }

    const glRenderer = this._renderer.getRenderer();
    if (glRenderer) {
      glRenderer.xr.enabled = false;
    }

    this._emit('exit');
  }
}
