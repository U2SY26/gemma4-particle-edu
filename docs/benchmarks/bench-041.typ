#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #041]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[러시아 정교회 성당 구조 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [화려한 양파 모양 돔이 특징인 러시아 정교회 성당],
  [Step 2: 재료], [brick],
  [Step 3: 밀도], [1900 kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [279 K],
  [Step 6: 특수], [{}],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=3.71)], [PASS],
  [gravity_dir], [하강 OK (y=3.71)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [279K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -9.81 m/s²
온도: 279 K
시뮬 안정성: ✓ 안정
