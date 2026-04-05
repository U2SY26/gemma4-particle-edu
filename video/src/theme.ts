// 공통 테마 — GitHub Dark + Gemma 블루 액센트
export const theme = {
  colors: {
    bg: "#0d1117",
    bgAlt: "#161b22",
    border: "#30363d",
    text: "#e6edf3",
    textMuted: "#8b949e",
    accent: "#58a6ff", // Gemma 블루
    accentGlow: "#1f6feb",
    success: "#3fb950",
    warning: "#d29922",
    danger: "#f85149",
    gemma: "#ff6b6b", // Gemma 공식 오렌지 빨강
  },
  fonts: {
    heading: "'Noto Sans KR', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
} as const;
