#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #194]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[번지점프 고무줄 탄성 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [번지점프 줄이 늘어났다가 원래 상태로 돌아오려는 물리적 성질],
  [Step 2: 재료], [rubber],
  [Step 3: 밀도], [1100 kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [293 K],
  [Step 6: 특수], [```json
{
  "gravity": 9.8,
  "damping_c],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=10.54)], [PASS],
  [gravity_dir], [상승 OK], [PASS],
  [damping], [damping=0.5 OK], [PASS],
  [temperature], [20K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: 9.8 m/s²
온도: 20 K
시뮬 안정성: ✓ 안정
