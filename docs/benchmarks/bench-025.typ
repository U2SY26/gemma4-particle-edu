#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #025]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[고온 플라즈마 핵융합 시뮬레이션 (100 Million K)]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [핵융합 1억도 플라즈마],
  [도메인], [quantum],
  [prompt], [핵융합 1억도 플라즈마],
  [정확도], [☆☆☆☆☆ 0%],
  [파티클], [30000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [temperature], [100000000 ∉ [50000,200000]], [MISS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.95],
  [springK], [30],
  [temperature], [100000000K],
  [viscosity], [0.05],
  [density], [1],
  [friction], [0.6],
  [bounciness], [0.2],
  [windX], [0],
  [seismic], [0],
  [particles], [30000],
)
