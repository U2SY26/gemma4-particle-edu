import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene3LiveDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 영상 페이드 인/아웃
  const videoIn = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const videoOut = interpolate(frame, [700, 730], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 오버레이 키워드 (빠른 팝인 — stiffness 높게)
  const labels = [
    { text: "LIVE DEMO", t: 5, color: theme.colors.accent, size: 36, x: 60, y: 30 },
    { text: "GEMMA 4 + OLLAMA", t: 60, color: theme.colors.success, size: 32, x: 60, y: 80 },
    { text: "REAL-TIME 3D", t: 250, color: theme.colors.gemma, size: 44, x: 1400, y: 950 },
    { text: "25,000 PARTICLES", t: 400, color: theme.colors.accent, size: 36, x: 1400, y: 1000 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {/* 실제 앱 녹화 영상 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: videoIn * videoOut,
          borderRadius: 0,
          overflow: "hidden",
        }}
      >
        <OffthreadVideo
          src={staticFile("screens/demo-recording.mp4")}
          startFrom={60}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          volume={0}
        />
      </div>

      {/* 상단 그라데이션 오버레이 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 150,
          background: `linear-gradient(180deg, ${theme.colors.bg}cc 0%, transparent 100%)`,
        }}
      />

      {/* 하단 그라데이션 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: `linear-gradient(0deg, ${theme.colors.bg}cc 0%, transparent 100%)`,
        }}
      />

      {/* 오버레이 라벨 (빠른 팝인) */}
      {labels.map((l, i) => {
        const s = spring({ frame: frame - l.t, fps, config: { damping: 6, stiffness: 250, mass: 0.5 } });
        const fadeOut = interpolate(frame, [l.t + 150, l.t + 170], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: l.x,
              top: l.y,
              fontSize: l.size,
              fontWeight: 900,
              color: l.color,
              fontFamily: theme.fonts.mono,
              opacity: s * fadeOut,
              transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`,
              textShadow: `0 2px 20px ${theme.colors.bg}`,
            }}
          >
            {l.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
