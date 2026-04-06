import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene3LiveDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 스크린샷 전환
  const screen1In = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const screen1Out = interpolate(frame, [420, 450], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screen2In = interpolate(frame, [460, 490], [0, 1], { extrapolateRight: "clamp" });

  // 타이핑 효과 — 시나리오 입력
  const typingText = '"Roman aqueduct under seismic stress"';
  const typedChars = Math.min(
    typingText.length,
    Math.max(0, Math.floor((frame - 150) * 0.8))
  );

  // 키워드 팝업
  const keywords = [
    { text: "MATERIAL: STONE", t: 250, color: theme.colors.accent },
    { text: "DENSITY: 2500 kg/m³", t: 290, color: theme.colors.success },
    { text: "PARTICLES: 25,000", t: 330, color: theme.colors.gemma },
    { text: "ACCURACY: 100%", t: 370, color: theme.colors.success },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.heading }}>
      {/* 헤더 */}
      <div style={{ position: "absolute", top: 40, left: 80, zIndex: 10 }}>
        <div style={{ fontSize: 36, color: theme.colors.accent, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
          LIVE DEMO
        </div>
      </div>

      {/* 스크린샷 1: Vercel */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 40,
          right: 40,
          bottom: 200,
          opacity: screen1In * screen1Out,
          borderRadius: 16,
          overflow: "hidden",
          border: `3px solid ${theme.colors.border}`,
          boxShadow: `0 0 60px ${theme.colors.accent}22`,
        }}
      >
        <Img src={staticFile("screens/demo-main.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* 스크린샷 2: 로컬 */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 40,
          right: 40,
          bottom: 200,
          opacity: screen2In,
          borderRadius: 16,
          overflow: "hidden",
          border: `3px solid ${theme.colors.success}`,
          boxShadow: `0 0 60px ${theme.colors.success}33`,
        }}
      >
        <Img src={staticFile("screens/demo-local.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: theme.colors.success,
            color: "#000",
            padding: "12px 28px",
            borderRadius: 8,
            fontSize: 32,
            fontWeight: 900,
            fontFamily: theme.fonts.mono,
          }}
        >
          LOCAL OLLAMA
        </div>
      </div>

      {/* 타이핑 입력 */}
      {frame > 140 && frame < 420 && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: 80,
            right: 80,
            background: `${theme.colors.bg}ee`,
            padding: "20px 40px",
            borderRadius: 12,
            border: `2px solid ${theme.colors.accent}`,
            fontSize: 44,
            color: theme.colors.accent,
            fontFamily: theme.fonts.mono,
            fontWeight: 600,
          }}
        >
          &gt; {typingText.slice(0, typedChars)}
          {frame % 20 < 10 && <span style={{ color: theme.colors.accent }}>|</span>}
        </div>
      )}

      {/* 키워드 팝업 */}
      <div style={{ position: "absolute", bottom: 30, left: 80, display: "flex", gap: 20, zIndex: 20 }}>
        {keywords.map((kw, i) => {
          const s = spring({ frame: frame - kw.t, fps, config: { damping: 10, stiffness: 150 } });
          return (
            <div
              key={i}
              style={{
                padding: "12px 24px",
                background: `${kw.color}22`,
                border: `2px solid ${kw.color}`,
                borderRadius: 8,
                fontSize: 28,
                fontWeight: 700,
                color: kw.color,
                fontFamily: theme.fonts.mono,
                opacity: s,
                transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`,
              }}
            >
              {kw.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
