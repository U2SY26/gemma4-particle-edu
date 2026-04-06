import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene6Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const audiences = [
    { icon: "🎓", title: "STUDENTS", desc: "No $20/mo subscription", color: theme.colors.accent, t: 40 },
    { icon: "👩‍🏫", title: "TEACHERS", desc: "Instant lab materials", color: theme.colors.success, t: 160 },
    { icon: "🏫", title: "SCHOOLS", desc: "Works offline", color: theme.colors.gemma, t: 280 },
    { icon: "🌍", title: "GLOBAL", desc: "Privacy. No internet needed.", color: theme.colors.warning, t: 400 },
  ];

  // 대형 헤더
  const headerSpring = spring({ frame, fps, config: { damping: 10 } });

  // 마지막 강조 문구
  const finalOpacity = interpolate(frame, [600, 650], [0, 1], { extrapolateRight: "clamp" });
  const finalScale = spring({ frame: frame - 600, fps, config: { damping: 8, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.heading, overflow: "hidden" }}>
      {/* 배경 그라데이션 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 80% 20%, ${theme.colors.accent}0a 0%, transparent 50%)`,
        }}
      />

      {/* 대형 헤더 */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          opacity: headerSpring,
          transform: `translateX(${interpolate(headerSpring, [0, 1], [-80, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 900, color: theme.colors.text, letterSpacing: -4, lineHeight: 1 }}>
          WHO IS
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: theme.colors.accent, letterSpacing: -4, lineHeight: 1 }}>
          THIS FOR?
        </div>
      </div>

      {/* 4 카드 그리드 */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 60,
          right: 60,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
        }}
      >
        {audiences.map((a) => {
          const s = spring({ frame: frame - a.t, fps, config: { damping: 10, stiffness: 100 } });
          return (
            <div
              key={a.title}
              style={{
                background: `${a.color}0a`,
                border: `3px solid ${a.color}`,
                borderRadius: 20,
                padding: "36px 40px",
                opacity: s,
                transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                display: "flex",
                alignItems: "center",
                gap: 24,
                boxShadow: `0 0 40px ${a.color}11`,
              }}
            >
              <div style={{ fontSize: 72 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 52, fontWeight: 900, color: a.color, lineHeight: 1 }}>{a.title}</div>
                <div style={{ fontSize: 30, color: theme.colors.text, marginTop: 8 }}>{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 마지막 강조 */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: finalOpacity,
          transform: `scale(${interpolate(finalScale, [0, 1], [0.8, 1])})`,
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 900, color: theme.colors.accent }}>
          EDUCATION SHOULD BE FREE.
        </div>
      </div>
    </AbsoluteFill>
  );
};
