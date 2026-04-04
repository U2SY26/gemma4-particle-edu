#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #012]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Eiffel Tower Truss Structure Simulation]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [에펠탑 철골 트러스],
  [도메인], [architecture],
  [prompt], [에펠탑 철골 트러스],
  [정확도], [★★★☆☆ 50%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [density], [2.4 ∉ [7,8]], [MISS],
  [springStiffness], [20 ∈ [20,60]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [20],
  [temperature], [293K],
  [viscosity], [0],
  [density], [2.4],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [0],
  [seismic], [0],
  [particles], [25000],
)
