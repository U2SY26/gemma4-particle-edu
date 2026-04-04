#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #008]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Diamond Crystalline Structure Simulation]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [다이아몬드 sp3 결정],
  [도메인], [materials],
  [prompt], [diamond sp3 crystal],
  [정확도], [★★★★★ 100%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [springStiffness], [40 ∈ [40,200]], [PASS],
  [density], [3.5 ∈ [3,4]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [40],
  [temperature], [293K],
  [viscosity], [0.1],
  [density], [3.5],
  [friction], [0.8],
  [bounciness], [0.2],
  [windX], [0],
  [seismic], [0],
  [particles], [25000],
)
