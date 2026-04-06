import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const bgAngle = interpolate(frame, [0, durationInFrames], [0, 360]);

  // 빠른 키워드 팝인 (짧은 간격, 높은 stiffness)
  const words = [
    { text: "PHYSICS EDUCATION", t: 5, color: theme.colors.textMuted, size: 72 },
    { text: "IS BROKEN.", t: 30, color: theme.colors.danger, size: 130 },
    { text: "$20/mo FOR AI SIMS?", t: 80, color: theme.colors.warning, size: 80 },
    { text: "FREE ALTERNATIVE.", t: 160, color: theme.colors.accent, size: 180 },
  ];

  const exitFade = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgAngle}deg at 50% 50%, #0d1117 0%, #1a1a2e 25%, #0d1117 50%, #16213e 75%, #0d1117 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fonts.heading,
        opacity: exitFade,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${theme.colors.accent}22 2px, transparent 2px)`,
          backgroundSize: "60px 60px",
          opacity: 0.4,
          transform: `translateY(${-frame * 0.5}px)`,
        }}
      />
      {words.map((w, i) => {
        const s = spring({ frame: frame - w.t, fps, config: { damping: 5, stiffness: 250, mass: 0.4 } });
        const fadeOut = interpolate(frame, [w.t + 100, w.t + 115], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const keep = i === words.length - 1 ? 1 : fadeOut;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${15 + i * 20}%`,
              width: "100%",
              textAlign: "center",
              fontSize: w.size,
              fontWeight: 900,
              color: w.color,
              opacity: s * keep,
              transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`,
              letterSpacing: w.size > 100 ? -6 : -2,
              lineHeight: 1,
              textShadow: w.size > 100 ? `0 0 80px ${w.color}44` : "none",
            }}
          >
            {w.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
