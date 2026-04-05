#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #144]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Titan Methane Lake Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [토성 위성 타이탄 표면의 액체 메탄 호수],
  [Step 2: 재료], [methane],
  [Step 3: 밀도], [0.717 kg/m³],
  [Step 4: 중력], [-1.35 m/s²],
  [Step 5: 온도], [94 K],
  [Step 6: 특수], [```json
{
  "temperature_kelvin": 94,
  ],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=10.87)], [PASS],
  [gravity_dir], [상승 OK], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [94K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: 1.35 m/s²
온도: 94 K
시뮬 안정성: ✓ 안정
