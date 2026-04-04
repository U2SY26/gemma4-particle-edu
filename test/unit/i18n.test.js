import { describe, it, expect, vi } from 'vitest';
import I18n from '../../js/i18n.js';

describe('I18n', () => {
  it('t("chat.title") returns correct Korean translation', () => {
    const i18n = new I18n('ko');
    expect(i18n.t('chat.title')).toBe('AI 채팅');
  });

  it('t("sim.particles", { count: 500 }) returns "파티클 500개"', () => {
    const i18n = new I18n('ko');
    expect(i18n.t('sim.particles', { count: 500 })).toBe('파티클 500개');
  });

  it('setLocale("en") switches to English', () => {
    const i18n = new I18n('ko');
    i18n.setLocale('en');
    expect(i18n.t('chat.title')).toBe('AI Chat');
  });

  it('t("nonexistent.key") returns "nonexistent.key"', () => {
    const i18n = new I18n('ko');
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('getLocale() returns current locale', () => {
    const i18n = new I18n('ko');
    expect(i18n.getLocale()).toBe('ko');
    i18n.setLocale('en');
    expect(i18n.getLocale()).toBe('en');
  });

  it('getAvailableLocales() returns ["ko", "en"]', () => {
    const i18n = new I18n('ko');
    expect(i18n.getAvailableLocales()).toEqual(['ko', 'en']);
  });

  it('on("localeChange") callback fires on setLocale', () => {
    const i18n = new I18n('ko');
    const callback = vi.fn();
    i18n.on('localeChange', callback);
    i18n.setLocale('en');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ locale: 'en', prev: 'ko' });
  });

  it('defaults to "ko" locale when constructed without arguments', () => {
    const i18n = new I18n();
    expect(i18n.getLocale()).toBe('ko');
    expect(i18n.t('app.title')).toBe('Gemma 4 입자 교육');
  });

  it('handles multiple parameter interpolation', () => {
    const i18n = new I18n('en');
    expect(i18n.t('status.model', { name: 'gemma-4' })).toBe('Model: gemma-4');
  });

  it('preserves unmatched placeholders when param is missing', () => {
    const i18n = new I18n('ko');
    expect(i18n.t('sim.particles')).toBe('파티클 {{count}}개');
  });

  it('English locale has matching structure', () => {
    const i18n = new I18n('en');
    expect(i18n.t('app.title')).toBe('Gemma 4 Particle Edu');
    expect(i18n.t('sim.particles', { count: 100 })).toBe('100 particles');
    expect(i18n.t('chat.placeholder')).toBe('Ask a physics question...');
  });
});
