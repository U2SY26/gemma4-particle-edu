import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene2Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 로고 드롭 애니메이션
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });
  const logoY = interpolate(logoSpring, [0, 1], [-200, 0]);

  // 타이틀 글자별 등장
  const titleChars = "Gemma 4 Particle Edu".split("");
  const subtitleOpacity = interpolate(frame, [120, 160], [0, 1], {
    extrapolateRight: "clamp",
  });
  const tagsOpacity = interpolate(frame, [200, 240], [0, 1], {
    extrapolateRight: "clamp",
  });
  const tagsY = interpolate(
    spring({ frame: frame - 200, fps, config: { damping: 12 } }),
    [0, 1],
    [30, 0]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fonts.heading,
      }}
    >
      {/* 배경 파티클 그리드 효과 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${theme.colors.border} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.3,
        }}
      />

      {/* 메인 타이틀 */}
      <div
        style={{
          textAlign: "center",
          transform: `translateY(${logoY}px)`,
          opacity: logoSpring,
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 24 }}>🪐</div>
        <h1
          style={{
            fontSize: 140,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.gemma} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          {titleChars.map((ch, i) => {
            const charOpacity = interpolate(
              frame,
              [30 + i * 3, 45 + i * 3],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            return (
              <span key={i} style={{ opacity: charOpacity }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            );
          })}
        </h1>
        <div
          style={{
            fontSize: 42,
            color: theme.colors.textMuted,
            marginTop: 24,
            opacity: subtitleOpacity,
            fontWeight: 400,
          }}
        >
          무료 · 오픈소스 · 로컬 실행
        </div>
      </div>

      {/* 태그 */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          display: "flex",
          gap: 32,
          opacity: tagsOpacity,
          transform: `translateY(${tagsY}px)`,
        }}
      >
        {["Ollama", "Gemma 4 31B", "Three.js", "Verlet Physics"].map((tag) => (
          <div
            key={tag}
            style={{
              padding: "16px 32px",
              border: `2px solid ${theme.colors.accent}`,
              borderRadius: 50,
              fontSize: 28,
              color: theme.colors.accent,
              background: `${theme.colors.accent}15`,
              fontFamily: theme.fonts.mono,
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
