#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #213]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Koch Snowflake Snow Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [삼각형의 각 변을 반복적으로 분할하여 만드는 프랙탈 도형],
  [Step 2: 재료], [snow],
  [Step 3: 밀도], [100 kg/m³],
  [Step 4: 중력], [0 m/s²],
  [Step 5: 온도], [코흐 눈송이는 수학적 개념(프랙탈)으 K],
  [Step 6: 특수], [```json
{}
```],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=10.00)], [PASS],
  [gravity_dir], [무중력 OK (drift=0.000)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [0K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: ? m/s²
온도: ? K
시뮬 안정성: ✓ 안정
