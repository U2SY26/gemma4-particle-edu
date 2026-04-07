#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #295]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[초거대 질량 항성 붕괴 및 블랙홀 엔진 기반 고에너지 전자기 폭발 시뮬레이션]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:31b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [우주에서 가장 강력한 고에너지 전자기 방사선 폭발],
  [Step 2: 재료], [plasma],
  [Step 3: 밀도], [1025 kg/m³],
  [Step 4: 중력], [0 m/s²],
  [Step 5: 온도], [1000000000 K],
  [Step 6: 특수], [특수 파라미터 있음],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=10.00)], [PASS],
  [gravity_dir], [무중력 OK (drift=0.000)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [1000000000K INVALID], [FAIL],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★☆ 80%
파티클: 25000
중력: ? m/s²
온도: 1000000000 K
시뮬 안정성: ✓ 안정
