#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #293]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Supernova Explosion Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [거대한 별이 수명을 다하며 일으키는 강력한 폭발 현상],
  [Step 2: 재료], [plasma],
  [Step 3: 밀도], [1025 kg/m³],
  [Step 4: 중력], [10^{12} m/s²],
  [Step 5: 온도], [10^9 K],
  [Step 6: 특수], [```json
{
  "stellar_mass_threshold_sola],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [폭발 (y=277777787.8)], [FAIL],
  [gravity_dir], [상승 OK], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [1000000000K INVALID], [FAIL],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★☆☆ 60%
파티클: 25000
중력: 1000000000000 m/s²
온도: 1000000000 K
시뮬 안정성: ✗ 폭발
