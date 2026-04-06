import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 8, stiffness: 100 } });

  const links = [
    { icon: "🌐", label: "DEMO", value: "gemma4-particle-edu.vercel.app", t: 80, color: theme.colors.accent },
    { icon: "📦", label: "CODE", value: "github.com/U2SY26/gemma4-particle-edu", t: 120, color: theme.colors.success },
    { icon: "🐳", label: "DOCKER", value: "docker compose up → localhost:3000", t: 160, color: "#2496ed" },
  ];

  // 배경 펄스
  const pulse = Math.sin(frame * 0.03) * 0.15 + 0.85;

  // 마지막 문구
  const finalSpring = spring({ frame: frame - 350, fps, config: { damping: 6, stiffness: 60 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #1a2942 0%, ${theme.colors.bg} 60%)`,
        fontFamily: theme.fonts.heading,
        overflow: "hidden",
      }}
    >
      {/* 배경 글로우 */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.colors.accent}15 0%, transparent 60%)`,
          transform: `scale(${pulse})`,
        }}
      />

      {/* 대형 CTA */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [60, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: theme.colors.text,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          TRY IT
        </div>
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.gemma})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          NOW.
        </div>
      </div>

      {/* 링크 목록 */}
      <div style={{ position: "absolute", top: 460, left: 120, right: 120, display: "flex", flexDirection: "column", gap: 28 }}>
        {links.map((l) => {
          const s = spring({ frame: frame - l.t, fps, config: { damping: 12 } });
          return (
            <div
              key={l.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`,
              }}
            >
              <div style={{ fontSize: 48 }}>{l.icon}</div>
              <div style={{ fontSize: 32, color: theme.colors.textMuted, width: 100, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
                {l.label}
              </div>
              <div style={{ fontSize: 40, color: l.color, fontFamily: theme.fonts.mono, fontWeight: 600 }}>
                {l.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 마지막 한 줄 */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: finalSpring,
          transform: `scale(${interpolate(finalSpring, [0, 1], [0.7, 1])})`,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: 12,
            color: theme.colors.text,
          }}
        >
          FREE &middot; OPEN SOURCE &middot; LOCAL
        </div>
      </div>
    </AbsoluteFill>
  );
};
