#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #150]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Relativistic Plasma Jet Simulation of a Supermassive Black Hole]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [초거대 질량 블랙홀에서 뿜어져 나오는 고에너지 입자 흐름.],
  [Step 2: 재료], [plasma],
  [Step 3: 밀도], [1025 kg/m³],
  [Step 4: 중력], [$-\infty$ m/s²],
  [Step 5: 온도], [10^12 K],
  [Step 6: 특수], [```json
{
  "supermassive_black_hole": "],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [폭발 (y=-277777777767.8)], [FAIL],
  [gravity_dir], [하강 OK (y=-277777777767.78)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [1000000000000K INVALID], [FAIL],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★☆☆ 60%
파티클: 25000
중력: -1000000000000000 m/s²
온도: 1000000000000 K
시뮬 안정성: ✗ 폭발
