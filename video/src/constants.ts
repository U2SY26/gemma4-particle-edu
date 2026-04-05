export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene 길이 (seconds)
export const SCENE_DURATIONS = {
  hook: 15,
  title: 20,
  liveDemo: 30,
  localOllama: 25,
  benchmark: 40,
  impact: 30,
  cta: 20,
} as const;

export const TOTAL_SECONDS = Object.values(SCENE_DURATIONS).reduce(
  (a, b) => a + b,
  0
);
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;
