import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 문구 페이드 인
  const line1Opacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line2Opacity = interpolate(frame, [70, 100], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line3Opacity = interpolate(frame, [160, 195], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line3Scale = spring({
    frame: frame - 160,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const exitFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  // 배경 그라데이션 이동
  const bgShift = interpolate(frame, [0, durationInFrames], [0, 100]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + bgShift / 5}% ${50 - bgShift / 10}%, #1f2937 0%, ${theme.colors.bg} 60%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fonts.heading,
        opacity: exitFade,
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: theme.colors.text,
          maxWidth: 1400,
        }}
      >
        <div
          style={{
            fontSize: 48,
            color: theme.colors.textMuted,
            opacity: line1Opacity,
            marginBottom: 24,
          }}
        >
          Claude Artifacts는 유료입니다.
        </div>
        <div
          style={{
            fontSize: 48,
            color: theme.colors.textMuted,
            opacity: line2Opacity,
            marginBottom: 60,
          }}
        >
          인터랙티브 시뮬레이션 교육,
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: theme.colors.accent,
            opacity: line3Opacity,
            transform: `scale(${line3Scale})`,
            letterSpacing: -2,
          }}
        >
          무료 대안이 있습니다.
        </div>
      </div>
    </AbsoluteFill>
  );
};
