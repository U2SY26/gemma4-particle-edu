import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

/**
 * Scene 6 — Impact 30초
 * 교육 트랙 ($10K) 메시지 — "누가 왜 쓰는가"
 */
export const Scene6Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const audiences = [
    {
      icon: "🎓",
      title: "학생",
      desc: "집에서 Claude 대신 직접 실험",
      color: theme.colors.accent,
      start: 60,
    },
    {
      icon: "👩‍🏫",
      title: "교사",
      desc: "수업 실습 자료 즉석 생성",
      color: theme.colors.success,
      start: 180,
    },
    {
      icon: "🏫",
      title: "학교",
      desc: "오프라인 · 프라이버시 보장 · 무료",
      color: theme.colors.gemma,
      start: 300,
    },
    {
      icon: "🌍",
      title: "개발도상국",
      desc: "인터넷 없어도 로컬에서 돌아감",
      color: theme.colors.warning,
      start: 420,
    },
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
          marginBottom: 16,
          fontFamily: theme.fonts.mono,
        }}
      >
        ▶ FUTURE OF EDUCATION
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
        누가 쓰는가
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          flex: 1,
        }}
      >
        {audiences.map((a) => {
          const appearSpring = spring({
            frame: frame - a.start,
            fps,
            config: { damping: 14, stiffness: 90 },
          });
          const translateX = interpolate(appearSpring, [0, 1], [-50, 0]);
          return (
            <div
              key={a.title}
              style={{
                background: theme.colors.bgAlt,
                border: `2px solid ${a.color}`,
                borderRadius: 20,
                padding: 48,
                opacity: appearSpring,
                transform: `translateX(${translateX}px)`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 100, marginBottom: 16 }}>{a.icon}</div>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: a.color,
                  marginBottom: 16,
                }}
              >
                {a.title}
              </div>
              <div
                style={{
                  fontSize: 32,
                  color: theme.colors.text,
                  lineHeight: 1.4,
                }}
              >
                {a.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
