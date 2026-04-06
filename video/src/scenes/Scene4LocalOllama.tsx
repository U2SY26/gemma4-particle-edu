import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene4LocalOllama: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 대형 헤더
  const headerSpring = spring({ frame, fps, config: { damping: 10 } });

  // 터미널 라인 (빠른 타이핑)
  const lines = [
    { t: 80, cmd: "$ ollama ps", result: "" },
    { t: 110, cmd: "", result: "gemma4:31b  30.9GB  28GB VRAM  96% GPU" },
    { t: 200, cmd: "$ nvidia-smi", result: "" },
    { t: 230, cmd: "", result: "RTX 5090  76°C  531W  96% UTIL" },
    { t: 350, cmd: "$ uptime", result: "" },
    { t: 380, cmd: "", result: "17 HOURS 43 MINUTES — ZERO RESTARTS" },
  ];

  // 대형 통계
  const stats = [
    { value: "300", label: "SCENARIOS", t: 470, color: theme.colors.accent },
    { value: "97.7%", label: "ACCURACY", t: 510, color: theme.colors.success },
    { value: "0", label: "CLOUD CALLS", t: 550, color: theme.colors.gemma },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#010409", fontFamily: theme.fonts.mono, overflow: "hidden" }}>
      {/* 스캔라인 효과 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff05 2px, #ffffff05 4px)",
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      {/* 대형 헤더 */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          right: 80,
          opacity: headerSpring,
          transform: `translateX(${interpolate(headerSpring, [0, 1], [-100, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 36, color: theme.colors.gemma, fontWeight: 700, marginBottom: 8 }}>
          100% LOCAL EXECUTION
        </div>
        <div style={{ fontSize: 100, fontWeight: 900, color: theme.colors.text, letterSpacing: -4, lineHeight: 1 }}>
          NO CLOUD.
        </div>
        <div style={{ fontSize: 100, fontWeight: 900, color: theme.colors.accent, letterSpacing: -4, lineHeight: 1 }}>
          NO API KEYS.
        </div>
      </div>

      {/* 터미널 영역 */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 60,
          right: 60,
          bottom: 220,
          background: "#0d1117",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12,
          padding: 32,
          fontSize: 30,
          lineHeight: 1.8,
        }}
      >
        {lines.map((line, i) => {
          const text = line.cmd || line.result;
          const charCount = Math.max(0, Math.floor((frame - line.t) * 1.5));
          const displayed = text.slice(0, charCount);
          const isResult = !line.cmd;
          return (
            <div
              key={i}
              style={{
                color: isResult ? theme.colors.success : theme.colors.text,
                fontWeight: isResult ? 700 : 400,
                opacity: frame > line.t ? 1 : 0,
                minHeight: 40,
              }}
            >
              {displayed}
              {frame > line.t && charCount < text.length && frame % 6 < 3 && (
                <span style={{ color: theme.colors.accent }}>_</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 대형 통계 */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 60,
          right: 60,
          display: "flex",
          gap: 40,
        }}
      >
        {stats.map((s) => {
          const sp = spring({ frame: frame - s.t, fps, config: { damping: 8, stiffness: 120 } });
          return (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: "center",
                opacity: sp,
                transform: `scale(${interpolate(sp, [0, 1], [0.5, 1])})`,
              }}
            >
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: s.color,
                  lineHeight: 1,
                  textShadow: `0 0 40px ${s.color}44`,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 28, color: theme.colors.textMuted, marginTop: 8 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
