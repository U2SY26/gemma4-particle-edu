export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene 길이 (seconds) — v3: 호흡 짧게
export const SCENE_DURATIONS = {
  hook: 14,
  title: 17,
  liveDemo: 25,
  localOllama: 24,
  benchmark: 36,
  impact: 21,
  cta: 18,
} as const;

export const TOTAL_SECONDS = Object.values(SCENE_DURATIONS).reduce(
  (a, b) => a + b,
  0
);
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;
