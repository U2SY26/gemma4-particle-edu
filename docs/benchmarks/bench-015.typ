#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #015]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[블랙홀 주변 고온 플라스마 강착 원반 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [블랙홀 주변을 회전하며 빨려 들어가는 고온 가스 원반],
  [Step 2: 재료], [plasma],
  [Step 3: 밀도], [1025 kg/m³],
  [Step 4: 중력], [$-10^{12}$ (별질량 블랙홀  m/s²],
  [Step 5: 온도], [10000000 K],
  [Step 6: 특수], [특수 파라미터 있음],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [폭발 (y=-277777767.8)], [FAIL],
  [gravity_dir], [하강 OK (y=-277777767.78)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [10000000K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★☆ 80%
파티클: 25000
중력: -1000000000000 m/s²
온도: 10000000 K
시뮬 안정성: ✗ 폭발
