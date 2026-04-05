#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #287]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Reusable Launch Vehicle Physics Simulation]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [우주로 물체를 실어 나르는 재사용 가능한 발사체],
  [Step 2: 재료], [steel],
  [Step 3: 밀도], [7850 kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [스페이스X 로켓의 환경 온도는 로켓이 K],
  [Step 6: 특수], [```json
{
  "gravity": 9.81,
  "max_wind],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=16.29)], [PASS],
  [gravity_dir], [상승 OK], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [293K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: 9.81 m/s²
온도: 293 K
시뮬 안정성: ✓ 안정
