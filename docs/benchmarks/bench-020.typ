#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #020]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Mars Dust Simulation]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [화성 3.72 m/s² 먼지],
  [도메인], [astronomy],
  [prompt], [Mars Dust],
  [정확도], [★★★★☆ 74%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [gravity], [-3.72 ∈ [-4,-3]], [PASS],
  [temperature], [293 ∉ [190,240]], [MISS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-3.72],
  [damping], [0.97],
  [springK], [20],
  [temperature], [293K],
  [viscosity], [0],
  [density], [2.4],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [2],
  [seismic], [0],
  [particles], [25000],
)
