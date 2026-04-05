#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #124]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Zeolite Porous Structure Molecular Separation Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [제올라이트의 다공성 구조를 이용해 특정 분자를 표면에 붙여 분리하는 현상],
  [Step 2: 재료], [zeolite],
  [Step 3: 밀도], [2200 kg/m³],
  [Step 4: 중력], [0 m/s²],
  [Step 5: 온도], [293 K],
  [Step 6: 특수], [```json
{
  "temperature": "low",
  "pre],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=10.00)], [PASS],
  [gravity_dir], [무중력 OK (drift=0.000)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [293K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: ? m/s²
온도: 293 K
시뮬 안정성: ✓ 안정
