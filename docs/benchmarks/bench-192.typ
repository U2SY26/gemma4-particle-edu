#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #192]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Bobsleigh Curve Inertial Force Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [봅슬레이 곡선 구간 주행 시 썰매를 트랙 바깥쪽으로 밀어내는 물리적 힘],
  [Step 2: 재료], [Inertia],
  [Step 3: 밀도], [7874 kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [273 K],
  [Step 6: 특수], [{}],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=3.71)], [PASS],
  [gravity_dir], [하강 OK (y=3.71)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [273K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -9.81 m/s²
온도: 273 K
시뮬 안정성: ✓ 안정
