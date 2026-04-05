#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #294]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Pulsar Electromagnetic Pulse Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [주기적인 전자기파 펄스를 방출하며 빠르게 회전하는 중성자별],
  [Step 2: 재료], [neutron],
  [Step 3: 밀도], [? kg/m³],
  [Step 4: 중력], [-2 \times 10^{12} m/s²],
  [Step 5: 온도], [1000000 K],
  [Step 6: 특수], [```json
{
  "magnetic_field_gauss": 1e12],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [폭발 (y=-555555545.6)], [FAIL],
  [gravity_dir], [하강 OK (y=-555555545.56)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [1000000K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★☆ 80%
파티클: 25000
중력: -2000000000000 m/s²
온도: 1000000 K
시뮬 안정성: ✗ 폭발
