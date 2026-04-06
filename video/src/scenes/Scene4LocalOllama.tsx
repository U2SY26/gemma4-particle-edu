import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const Scene4LocalOllama: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({ frame, fps, config: { damping: 5, stiffness: 200, mass: 0.4 } });

  // 터미널 (빠른 타이핑 — 2x speed)
  const lines = [
    { t: 40, cmd: "$ ollama ps", result: "" },
    { t: 60, cmd: "", result: "gemma4:31b  30.9GB  28GB VRAM  96% GPU" },
    { t: 120, cmd: "$ nvidia-smi", result: "" },
    { t: 140, cmd: "", result: "RTX 5090  76°C  531W  96% UTIL" },
    { t: 220, cmd: "$ uptime", result: "" },
    { t: 240, cmd: "", result: "17 HOURS 43 MINUTES — ZERO RESTARTS" },
  ];

  const stats = [
    { value: "300", label: "SCENARIOS", t: 340, color: theme.colors.accent },
    { value: "97.7%", label: "ACCURACY", t: 360, color: theme.colors.success },
    { value: "0", label: "CLOUD CALLS", t: 380, color: theme.colors.gemma },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#010409", fontFamily: theme.fonts.mono, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff05 2px, #ffffff05 4px)", zIndex: 5, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: 50, left: 70, right: 70, opacity: headerSpring, transform: `translateX(${interpolate(headerSpring, [0, 1], [-60, 0])}px)` }}>
        <div style={{ fontSize: 32, color: theme.colors.gemma, fontWeight: 700, marginBottom: 4 }}>100% LOCAL EXECUTION</div>
        <div style={{ fontSize: 90, fontWeight: 900, color: theme.colors.text, letterSpacing: -4, lineHeight: 1 }}>NO CLOUD.</div>
        <div style={{ fontSize: 90, fontWeight: 900, color: theme.colors.accent, letterSpacing: -4, lineHeight: 1 }}>NO API KEYS.</div>
      </div>

      <div style={{ position: "absolute", top: 300, left: 50, right: 50, bottom: 200, background: "#0d1117", border: `1px solid ${theme.colors.border}`, borderRadius: 12, padding: 28, fontSize: 28, lineHeight: 1.8 }}>
        {lines.map((line, i) => {
          const text = line.cmd || line.result;
          const charCount = Math.max(0, Math.floor((frame - line.t) * 3));
          const displayed = text.slice(0, charCount);
          const isResult = !line.cmd;
          return (
            <div key={i} style={{ color: isResult ? theme.colors.success : theme.colors.text, fontWeight: isResult ? 700 : 400, opacity: frame > line.t ? 1 : 0, minHeight: 36 }}>
              {displayed}
              {frame > line.t && charCount < text.length && frame % 4 < 2 && <span style={{ color: theme.colors.accent }}>_</span>}
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: 30, left: 50, right: 50, display: "flex", gap: 30 }}>
        {stats.map((s) => {
          const sp = spring({ frame: frame - s.t, fps, config: { damping: 5, stiffness: 250, mass: 0.4 } });
          return (
            <div key={s.label} style={{ flex: 1, textAlign: "center", opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.5, 1])})` }}>
              <div style={{ fontSize: 88, fontWeight: 900, color: s.color, lineHeight: 1, textShadow: `0 0 40px ${s.color}44` }}>{s.value}</div>
              <div style={{ fontSize: 24, color: theme.colors.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
