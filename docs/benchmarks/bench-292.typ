#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #292]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Low Earth Orbit Space Station Trajectory Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [지구 저궤도를 따라 이동하는 우주정거장의 경로],
  [Step 2: 재료], [None],
  [Step 3: 밀도], [None은 물질이 아니므로 밀도를 정 kg/m³],
  [Step 4: 중력], [-8.7 m/s²],
  [Step 5: 온도], [123~393 K],
  [Step 6: 특수], [```json
{
  "orbital_velocity_km_s": 7.6],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=15.57)], [PASS],
  [gravity_dir], [상승 OK], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [258K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: 8.7 m/s²
온도: 258 K
시뮬 안정성: ✓ 안정
