import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene6Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const audiences = [
    { icon: "🎓", title: "STUDENTS", desc: "No $20/mo subscription", color: theme.colors.accent, t: 20 },
    { icon: "👩‍🏫", title: "TEACHERS", desc: "Instant lab materials", color: theme.colors.success, t: 80 },
    { icon: "🏫", title: "SCHOOLS", desc: "Works offline", color: theme.colors.gemma, t: 140 },
    { icon: "🌍", title: "GLOBAL", desc: "Privacy. No internet needed.", color: theme.colors.warning, t: 200 },
  ];

  const headerSpring = spring({ frame, fps, config: { damping: 5, stiffness: 250, mass: 0.4 } });
  const finalOpacity = interpolate(frame, [380, 410], [0, 1], { extrapolateRight: "clamp" });
  const finalScale = spring({ frame: frame - 380, fps, config: { damping: 5, stiffness: 200, mass: 0.4 } });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.heading, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 20%, ${theme.colors.accent}0a 0%, transparent 50%)` }} />

      <div style={{ position: "absolute", top: 50, left: 70, opacity: headerSpring, transform: `translateX(${interpolate(headerSpring, [0, 1], [-60, 0])}px)` }}>
        <div style={{ fontSize: 110, fontWeight: 900, color: theme.colors.text, letterSpacing: -4, lineHeight: 1 }}>WHO IS</div>
        <div style={{ fontSize: 110, fontWeight: 900, color: theme.colors.accent, letterSpacing: -4, lineHeight: 1 }}>THIS FOR?</div>
      </div>

      <div style={{ position: "absolute", top: 290, left: 50, right: 50, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {audiences.map((a) => {
          const s = spring({ frame: frame - a.t, fps, config: { damping: 5, stiffness: 250, mass: 0.4 } });
          const fadeOut = interpolate(frame, [a.t + 200, a.t + 220], [1, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={a.title} style={{
              background: `${a.color}0a`, border: `3px solid ${a.color}`, borderRadius: 16, padding: "28px 32px",
              opacity: s * fadeOut, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
              display: "flex", alignItems: "center", gap: 20, boxShadow: `0 0 30px ${a.color}11`,
            }}>
              <div style={{ fontSize: 64 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 48, fontWeight: 900, color: a.color, lineHeight: 1 }}>{a.title}</div>
                <div style={{ fontSize: 28, color: theme.colors.text, marginTop: 6 }}>{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, textAlign: "center", opacity: finalOpacity, transform: `scale(${interpolate(finalScale, [0, 1], [0.7, 1])})` }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: theme.colors.accent }}>EDUCATION SHOULD BE FREE.</div>
      </div>
    </AbsoluteFill>
  );
};
