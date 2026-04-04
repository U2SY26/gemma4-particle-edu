import ko from './locales/ko.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };

const locales = { ko, en };

/**
 * Lightweight i18n module for gemma4-particle-edu.
 * Supports Korean (ko) and English (en) with dot-notation keys
 * and {{param}} interpolation.
 */
export default class I18n {
  /**
   * @param {'ko'|'en'} defaultLocale
   */
  constructor(defaultLocale = 'ko') {
    this._locale = defaultLocale;
    this._listeners = {};
  }

  /**
   * Translate a key with optional parameter interpolation.
   * @param {string} key - Dot-notation key, e.g. 'chat.title'
   * @param {Object} [params] - Interpolation values, e.g. { count: 500 }
   * @returns {string} Translated string, or the key itself if not found
   */
  t(key, params) {
    const messages = locales[this._locale];
    if (!messages) return key;

    const value = this._resolve(messages, key);
    if (value === undefined) return key;

    if (params) {
      return this._interpolate(value, params);
    }
    return value;
  }

  /**
   * Switch the active locale. Fires 'localeChange' event.
   * @param {string} locale
   */
  setLocale(locale) {
    const prev = this._locale;
    this._locale = locale;
    this._emit('localeChange', { locale, prev });
  }

  /**
   * @returns {string} Current locale code
   */
  getLocale() {
    return this._locale;
  }

  /**
   * @returns {string[]} Available locale codes
   */
  getAvailableLocales() {
    return Object.keys(locales);
  }

  /**
   * Register an event listener.
   * @param {string} event - Event name, e.g. 'localeChange'
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }

  // --- private helpers ---

  /**
   * Resolve a dot-notation key against a nested object.
   * @param {Object} obj
   * @param {string} key
   * @returns {string|undefined}
   */
  _resolve(obj, key) {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Replace {{paramName}} placeholders in a string.
   * @param {string} str
   * @param {Object} params
   * @returns {string}
   */
  _interpolate(str, params) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, name) => {
      return params[name] !== undefined ? String(params[name]) : match;
    });
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param {*} data
   */
  _emit(event, data) {
    const callbacks = this._listeners[event];
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}
