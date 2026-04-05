import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/**
 * Scene 4 — Gemma 4 Local via Ollama 25초
 * 핵심 메시지: "이건 진짜 로컬에서 돌고 있는 31B 모델이야"
 * Ollama Special Tech Track $10K 증명 장면
 */
export const Scene4LocalOllama: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 터미널 라인들이 순차적으로 타이핑
  const terminalLines = [
    { t: 40, text: "$ ollama ps", color: theme.colors.text },
    {
      t: 100,
      text: "NAME          SIZE      VRAM       PROCESSOR",
      color: theme.colors.textMuted,
    },
    {
      t: 130,
      text: "gemma4:31b    30.9 GB   28 GB      100% GPU",
      color: theme.colors.success,
    },
    { t: 220, text: "", color: theme.colors.text },
    { t: 250, text: "$ journalctl -u ollama --since '1 hour ago' | wc -l", color: theme.colors.text },
    { t: 340, text: "335 API requests", color: theme.colors.success },
    { t: 420, text: "", color: theme.colors.text },
    { t: 450, text: "$ curl localhost:11434/api/ps", color: theme.colors.text },
    { t: 520, text: '{ "model": "gemma4:31b", "size_vram": 28GB }', color: theme.colors.accent },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        fontFamily: theme.fonts.mono,
        padding: 80,
      }}
    >
      <div
        style={{
          fontSize: 32,
          color: theme.colors.gemma,
          opacity: headerOpacity,
          marginBottom: 16,
        }}
      >
        ▶ LOCAL GEMMA 4 — NO CLOUD, NO API KEYS
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: theme.colors.text,
          opacity: headerOpacity,
          marginBottom: 48,
          fontFamily: theme.fonts.heading,
        }}
      >
        진짜 로컬에서 돌아가는 31B 모델
      </div>

      {/* 터미널 */}
      <div
        style={{
          flex: 1,
          background: "#010409",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12,
          padding: 40,
          fontSize: 32,
          lineHeight: 1.6,
        }}
      >
        {terminalLines.map((line, i) => {
          const opacity = interpolate(
            frame,
            [line.t, line.t + 15],
            [0, 1],
            { extrapolateRight: "clamp" }
          );
          return (
            <div
              key={i}
              style={{
                opacity,
                color: line.color,
                fontFamily: theme.fonts.mono,
                minHeight: 40,
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
