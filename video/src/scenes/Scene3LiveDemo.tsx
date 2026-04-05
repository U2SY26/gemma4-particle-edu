import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/**
 * Scene 3 — Live Demo 30초
 * TODO: Playwright로 캡처한 스크린샷 5장을 public/screens/에 넣고 <Img> 로 전환
 * 현재는 플레이스홀더 (텍스트 + 단계 표시)
 */
export const Scene3LiveDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const steps = [
    { t: 60, text: "1. vercel.app 접속" },
    { t: 180, text: "2. 시나리오 입력: '로마 수도교'" },
    { t: 360, text: "3. Gemma 4가 물리 파라미터 생성" },
    { t: 540, text: "4. 3D 시뮬레이션 실시간 렌더" },
    { t: 720, text: "5. 학생이 파라미터 조절하며 학습" },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        fontFamily: theme.fonts.heading,
        padding: 80,
      }}
    >
      <div
        style={{
          fontSize: 32,
          color: theme.colors.accent,
          opacity: headerOpacity,
          marginBottom: 24,
          fontFamily: theme.fonts.mono,
        }}
      >
        ▶ LIVE DEMO
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: theme.colors.text,
          opacity: headerOpacity,
          marginBottom: 64,
        }}
      >
        gemma4-particle-edu.vercel.app
      </div>

      {/* 브라우저 목업 */}
      <div
        style={{
          flex: 1,
          background: theme.colors.bgAlt,
          border: `2px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: 40,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* 브라우저 상단바 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
            <div
              key={c}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>

        {/* 단계 표시 */}
        {steps.map((s, i) => {
          const opacity = interpolate(
            frame,
            [s.t, s.t + 20],
            [0, 1],
            { extrapolateRight: "clamp" }
          );
          return (
            <div
              key={i}
              style={{
                fontSize: 48,
                color: theme.colors.text,
                opacity,
                fontFamily: theme.fonts.mono,
              }}
            >
              {s.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
