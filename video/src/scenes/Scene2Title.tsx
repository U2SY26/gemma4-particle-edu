import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene2Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 8, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoGlow = interpolate(frame, [0, 60, 120], [0, 1, 0.6]);

  const subtitleOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" });

  const tags = ["Ollama", "Gemma 4 31B", "Three.js", "Verlet Physics"];
  const tagBaseFrame = 200;

  // 배경 회전 그리드
  const gridRotate = interpolate(frame, [0, 600], [0, 15]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fonts.heading,
        overflow: "hidden",
      }}
    >
      {/* 회전 그리드 배경 */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          backgroundImage: `linear-gradient(${theme.colors.accent}11 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.accent}11 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          transform: `rotate(${gridRotate}deg)`,
        }}
      />

      {/* 글로우 서클 */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.colors.accent}22 0%, transparent 70%)`,
          opacity: logoGlow,
          transform: `scale(${1 + logoGlow * 0.3})`,
        }}
      />

      {/* 메인 타이틀 */}
      <div
        style={{
          textAlign: "center",
          transform: `scale(${logoScale})`,
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontSize: 160,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${theme.colors.accent} 0%, #a855f7 50%, ${theme.colors.gemma} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
            letterSpacing: -6,
            lineHeight: 0.9,
            textShadow: `0 0 120px ${theme.colors.accent}44`,
          }}
        >
          GEMMA 4
        </h1>
        <h1
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: theme.colors.text,
            margin: 0,
            marginTop: -10,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          PARTICLE EDU
        </h1>
      </div>

      {/* 서브타이틀 */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          fontSize: 56,
          color: theme.colors.textMuted,
          opacity: subtitleOpacity,
          fontWeight: 400,
          letterSpacing: 8,
          textTransform: "uppercase",
        }}
      >
        FREE &middot; OPEN SOURCE &middot; LOCAL
      </div>

      {/* 태그 */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          display: "flex",
          gap: 24,
        }}
      >
        {tags.map((tag, i) => {
          const tagSpring = spring({
            frame: frame - tagBaseFrame - i * 8,
            fps,
            config: { damping: 12 },
          });
          return (
            <div
              key={tag}
              style={{
                padding: "14px 28px",
                border: `2px solid ${theme.colors.accent}`,
                borderRadius: 50,
                fontSize: 26,
                color: theme.colors.accent,
                background: `${theme.colors.accent}15`,
                fontFamily: theme.fonts.mono,
                opacity: tagSpring,
                transform: `translateY(${interpolate(tagSpring, [0, 1], [20, 0])}px)`,
              }}
            >
              {tag}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
