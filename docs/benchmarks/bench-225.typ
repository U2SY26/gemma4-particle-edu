#set text(size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #225]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Spherical Harmonics Basis Functions on Sphere Surface]
  #v(2pt)
  #text(size: 10pt)[Model: gemma4:26b]
]

#v(8pt)

=== DAG 마이크로스텝
#table(columns: (auto, auto), inset: 6pt,
  [Step 1: 식별], [구의 표면에서 함수를 분해하고 표현하기 위해 사용되는 수학적 기저 함수 세트.],
  [Step 2: 재료], [구면조화함수],
  [Step 3: 밀도], [구면조화함수(Spherical Har kg/m³],
  [Step 4: 중력], [-9.81 m/s²],
  [Step 5: 온도], [구면 조화함수(Spherical Ha K],
  [Step 6: 특수], [{}],
)

=== 물리 시뮬 검증 (Verlet 100프레임)
#table(columns: (auto, auto, auto), inset: 5pt,
  [검증 항목], [결과], [판정],
  [stability], [안정 (y=3.71)], [PASS],
  [gravity_dir], [하강 OK (y=3.71)], [PASS],
  [damping], [damping=0.97 OK], [PASS],
  [temperature], [0K OK], [PASS],
  [particle_count], [25000 OK], [PASS],
)

=== 종합
정확도: ★★★★★ 100%
파티클: 25000
중력: -9.81 m/s²
온도: ? K
시뮬 안정성: ✓ 안정
