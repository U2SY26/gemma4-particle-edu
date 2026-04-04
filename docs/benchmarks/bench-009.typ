#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #009]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Jupiter Atmospheric Gas Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [목성의 대기를 구성하고 있는 수소와 헬륨 등의 기체 성분],
  [Step 2: 재료], [gas],
  [Step 3: 밀도], [1.225 kg/m³],
  [Step 4: 중력], [-24.79 m/s²],
  [Step 5: 온도], [165 K],
  [Step 6: 특수], [```json
{
  "pressure": "high",
  "tempe],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=-5.88)], [PASS],
  [gravity_dir], [하강 OK (y=-5.88)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [165K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -24.79 m/s²
온도: 165 K
시뮬 안정성: ✓ 안정
