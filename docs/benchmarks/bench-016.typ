#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #016]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[토네이도 회전 구조 시뮬레이션]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [토네이도 회전 구조],
  [도메인], [weather],
  [prompt], [Tornado Rotation Structure],
  [정확도], [★★★★☆ 90%],
  [파티클], [50000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [windX], [0 ∉ [5,30]], [MISS],
  [turbulence], [0.5 ∉ [3,15]], [MISS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [20],
  [temperature], [293K],
  [viscosity], [0.01],
  [density], [1.225],
  [friction], [0.8],
  [bounciness], [0.2],
  [windX], [0],
  [seismic], [0],
  [particles], [50000],
)
