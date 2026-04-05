#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #037]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Venice Coastal & Canal Hydrodynamics]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [이탈리아 아드리아해의 운하와 섬으로 이루어진 역사적인 도시],
  [Step 2: 재료], [water],
  [Step 3: 밀도], [1000 kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [288 K],
  [Step 6: 특수], [```json
{
  "tidal_amplitude": 7,
  "soi],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=3.71)], [PASS],
  [gravity_dir], [하강 OK (y=3.71)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [288K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -9.81 m/s²
온도: 288 K
시뮬 안정성: ✓ 안정
