#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #141]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[명왕성 하트 모양 질소 빙하 지형 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [명왕성 표면의 하트 모양 질소 빙하 지형],
  [Step 2: 재료], [Nitrogen],
  [Step 3: 밀도], [1.25 kg/m³],
  [Step 4: 중력], [-0.62 m/s²],
  [Step 5: 온도], [40 K],
  [Step 6: 특수], [```json
{
  "temperature": "extremely lo],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=9.60)], [PASS],
  [gravity_dir], [하강 OK (y=9.60)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [40K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -0.62 m/s²
온도: 40 K
시뮬 안정성: ✓ 안정
