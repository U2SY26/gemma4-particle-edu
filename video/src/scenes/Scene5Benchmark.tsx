import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const R = { total: 300, pass: 293, passRate: 99.4, materials: 90, fail: 7 };

export const Scene5Benchmark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 카운트업
  const countProgress = interpolate(frame, [30, 180], [0, 1], { extrapolateRight: "clamp" });
  const count = Math.floor(countProgress * R.total);
  const passCount = Math.floor(countProgress * R.pass);
  const accCount = (countProgress * R.passRate).toFixed(1);

  // 재료 바
  const materials = [
    { name: "steel", count: 28 },
    { name: "water", count: 26 },
    { name: "plasma", count: 22 },
    { name: "air", count: 12 },
    { name: "concrete", count: 10 },
    { name: "silicon", count: 8 },
    { name: "dna", count: 7 },
    { name: "carbon", count: 6 },
  ];

  // FAIL 타이핑 (빠른)
  const failText = "FAIL: black hole · supernova · gamma-ray burst · pulsar · quark · magnetic field · plasma jet";
  const failChars = Math.max(0, Math.floor((frame - 800) * 2));

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.heading, overflow: "hidden" }}>
      {/* 배경 그라데이션 펄스 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${theme.colors.accent}08 0%, transparent 60%)`,
          opacity: interpolate(frame, [0, 60, 120], [0, 0.8, 0.4]),
        }}
      />

      {/* 상단: 대형 카운터 */}
      <div style={{ display: "flex", padding: "50px 60px 0", gap: 40 }}>
        <StatBlock value={String(count)} suffix="/300" label="SCENARIOS" color={theme.colors.accent} frame={frame} startFrame={30} fps={fps} />
        <StatBlock value={String(passCount)} suffix="" label="PERFECT" color={theme.colors.success} frame={frame} startFrame={60} fps={fps} />
        <StatBlock value={accCount} suffix="%" label="PASS RATE" color={theme.colors.gemma} frame={frame} startFrame={90} fps={fps} />
        <StatBlock value="~90" suffix="" label="MATERIALS" color="#a855f7" frame={frame} startFrame={120} fps={fps} />
      </div>

      {/* 중단: 재료 바 그래프 */}
      <div style={{ padding: "30px 60px", flex: 1 }}>
        <div style={{ fontSize: 28, color: theme.colors.textMuted, marginBottom: 16, fontFamily: theme.fonts.mono }}>
          MATERIAL DIVERSITY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {materials.map((m, i) => {
            const barProgress = interpolate(frame, [300 + i * 12, 400 + i * 12], [0, 1], { extrapolateRight: "clamp" });
            const w = barProgress * (m.count / 28) * 100;
            return (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 100, fontSize: 24, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, textAlign: "right" }}>
                  {m.name}
                </div>
                <div style={{ flex: 1, height: 28, background: theme.colors.bgAlt, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${w}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.gemma})`,
                      borderRadius: 4,
                      boxShadow: `0 0 20px ${theme.colors.accent}33`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 24, color: theme.colors.text, fontFamily: theme.fonts.mono, width: 50 }}>
                  {Math.floor(barProgress * m.count)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단: FAIL 타이핑 */}
      <div style={{ padding: "0 60px 50px" }}>
        <div
          style={{
            fontSize: 32,
            color: theme.colors.warning,
            fontFamily: theme.fonts.mono,
            opacity: frame > 780 ? 1 : 0,
          }}
        >
          {failText.slice(0, failChars)}
          {frame > 780 && failChars < failText.length && frame % 4 < 2 && (
            <span style={{ color: theme.colors.warning }}>|</span>
          )}
        </div>
        {frame > 950 && (
          <div style={{ fontSize: 48, color: theme.colors.success, fontWeight: 900, marginTop: 16 }}>
            FOR EDUCATION — RELIABLE ACROSS 300 SCENARIOS.
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const StatBlock: React.FC<{
  value: string; suffix: string; label: string; color: string;
  frame: number; startFrame: number; fps: number;
}> = ({ value, suffix, label, color, frame, startFrame, fps }) => {
  const s = spring({ frame: frame - startFrame, fps, config: { damping: 8, stiffness: 100 } });
  return (
    <div style={{ flex: 1, textAlign: "center", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)` }}>
      <div style={{ fontSize: 110, fontWeight: 900, color, lineHeight: 1, fontFamily: theme.fonts.mono, textShadow: `0 0 60px ${color}33` }}>
        {value}<span style={{ fontSize: 48, color: theme.colors.textMuted }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 24, color: theme.colors.textMuted, marginTop: 8, letterSpacing: 4 }}>{label}</div>
    </div>
  );
};
