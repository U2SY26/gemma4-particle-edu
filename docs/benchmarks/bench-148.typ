#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #148]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[프록시마 켄타우리 b 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [지구에서 가장 가까운 곳에 위치한 외계 행성],
  [Step 2: 재료], [Rock],
  [Step 3: 밀도], [2700 kg/m³],
  [Step 4: 중력], [-11.0 m/s²],
  [Step 5: 온도], [234 K],
  [Step 6: 특수], [```json
{
  "mass_earth_ratio": 1.07,
  ],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=2.95)], [PASS],
  [gravity_dir], [하강 OK (y=2.95)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [234K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -11 m/s²
온도: 234 K
시뮬 안정성: ✓ 안정
