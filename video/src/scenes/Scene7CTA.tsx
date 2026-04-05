import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

/**
 * Scene 7 — Call to Action 20초
 * GitHub + Live Demo URL + 마지막 메시지
 */
export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 12 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);

  const linksOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateRight: "clamp",
  });

  const finalLineOpacity = interpolate(frame, [180, 230], [0, 1], {
    extrapolateRight: "clamp",
  });
  const finalLineScale = spring({
    frame: frame - 180,
    fps,
    config: { damping: 10, stiffness: 60 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, #1a2942 0%, ${theme.colors.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fonts.heading,
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: theme.colors.text,
          opacity: titleSpring,
          transform: `translateY(${titleY}px)`,
          marginBottom: 80,
          textAlign: "center",
        }}
      >
        지금 바로 체험하세요
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 32,
          opacity: linksOpacity,
          fontFamily: theme.fonts.mono,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 48,
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>🌐 Live Demo</span>
          <span style={{ color: theme.colors.accent }}>
            gemma4-particle-edu.vercel.app
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 48,
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>📦 Code</span>
          <span style={{ color: theme.colors.accent }}>
            github.com/U2SY26/gemma4-particle-edu
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 48,
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>⚡ Stack</span>
          <span style={{ color: theme.colors.text }}>
            Ollama + Gemma 4 31B + Three.js
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 120,
          fontSize: 48,
          fontWeight: 700,
          color: theme.colors.gemma,
          opacity: finalLineOpacity,
          transform: `scale(${finalLineScale})`,
          textAlign: "center",
        }}
      >
        무료 · 오픈소스 · 로컬 실행
      </div>
    </AbsoluteFill>
  );
};
