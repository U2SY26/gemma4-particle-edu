import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

/**
 * Scene 5 — 300 Benchmark Results 40초
 * TODO: 시뮬 완료 후 실제 결과 JSON을 로드해서 숫자 교체
 * 현재는 중간 점검 숫자 사용 (2026-04-05 19:50 기준)
 *
 * 최종본용 자리:
 *   const finalResults = {
 *     total: 300,
 *     pass: 292,
 *     accuracy: 99.4,
 *     materials: 11,
 *     exploded: 5,
 *     duration: "9h 30m",
 *     model: "gemma4:31b"
 *   };
 */
const MID_RESULTS = {
  total: 299, // 현재 진행률
  pass: 292,
  accuracy: 99.4,
  materials: 11,
  exploded: 5,
  model: "gemma4:31b",
};

export const Scene5Benchmark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 카운트업 애니메이션
  const countProgress = interpolate(frame, [30, 120], [0, 1], {
    extrapolateRight: "clamp",
  });
  const count = Math.floor(countProgress * MID_RESULTS.total);
  const passCount = Math.floor(countProgress * MID_RESULTS.pass);
  const accuracyCount = (countProgress * MID_RESULTS.accuracy).toFixed(1);

  // 통계 카드들
  const statsAppear = spring({
    frame: frame - 150,
    fps,
    config: { damping: 14 },
  });

  // 하단 재료 바
  const matBarOpacity = interpolate(frame, [300, 360], [0, 1], {
    extrapolateRight: "clamp",
  });

  const materials = [
    { name: "water", count: 22 },
    { name: "steel", count: 15 },
    { name: "plasma", count: 14 },
    { name: "air", count: 11 },
    { name: "concrete", count: 9 },
    { name: "wood", count: 8 },
    { name: "metal", count: 7 },
    { name: "stone", count: 6 },
    { name: "protein", count: 6 },
    { name: "limestone", count: 5 },
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
          color: theme.colors.success,
          opacity: headerOpacity,
          marginBottom: 16,
          fontFamily: theme.fonts.mono,
        }}
      >
        ▶ BENCHMARK — 300 PHYSICS SCENARIOS
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: theme.colors.text,
          opacity: headerOpacity,
          marginBottom: 48,
        }}
      >
        Gemma 4 31B 물리 정확도 검증
      </div>

      {/* 메인 카운터 */}
      <div
        style={{
          display: "flex",
          gap: 40,
          marginBottom: 48,
        }}
      >
        <StatCard
          label="총 시나리오"
          value={String(count)}
          suffix="/300"
          color={theme.colors.accent}
          opacity={statsAppear}
        />
        <StatCard
          label="PASS"
          value={String(passCount)}
          suffix={` (${Math.round((passCount / count) * 100) || 0}%)`}
          color={theme.colors.success}
          opacity={statsAppear}
        />
        <StatCard
          label="평균 정확도"
          value={accuracyCount}
          suffix="%"
          color={theme.colors.gemma}
          opacity={statsAppear}
        />
      </div>

      {/* 재료 다양성 바 */}
      <div
        style={{
          flex: 1,
          background: theme.colors.bgAlt,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12,
          padding: 40,
          opacity: matBarOpacity,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: theme.colors.text,
            marginBottom: 24,
            fontFamily: theme.fonts.mono,
          }}
        >
          재료 다양성 — 11종 이상 식별
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {materials.map((m, i) => {
            const barOpacity = interpolate(
              frame,
              [360 + i * 8, 380 + i * 8],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const barWidth = interpolate(
              frame,
              [360 + i * 8, 420 + i * 8],
              [0, (m.count / 22) * 100],
              { extrapolateRight: "clamp" }
            );
            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: barOpacity,
                  fontFamily: theme.fonts.mono,
                  fontSize: 24,
                }}
              >
                <div style={{ width: 150, color: theme.colors.textMuted }}>
                  {m.name}
                </div>
                <div
                  style={{
                    height: 24,
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.gemma})`,
                    borderRadius: 4,
                  }}
                />
                <div style={{ color: theme.colors.text }}>{m.count}x</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  suffix: string;
  color: string;
  opacity: number;
}> = ({ label, value, suffix, color, opacity }) => (
  <div
    style={{
      flex: 1,
      background: theme.colors.bgAlt,
      border: `2px solid ${color}`,
      borderRadius: 16,
      padding: 40,
      opacity,
    }}
  >
    <div
      style={{
        fontSize: 28,
        color: theme.colors.textMuted,
        marginBottom: 16,
        fontFamily: theme.fonts.mono,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 96,
        fontWeight: 800,
        color,
        lineHeight: 1,
        fontFamily: theme.fonts.mono,
      }}
    >
      {value}
      <span
        style={{
          fontSize: 40,
          color: theme.colors.textMuted,
          fontWeight: 400,
        }}
      >
        {suffix}
      </span>
    </div>
  </div>
);
