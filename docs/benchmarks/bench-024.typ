#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #024]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[적혈구 모세혈관 흐름 (RBC Capillary Flow)]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [적혈구 모세혈관 흐름],
  [도메인], [biology],
  [prompt], [Red blood cell capillary flow],
  [정확도], [★★☆☆☆ 47%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [viscosity], [0.5 ∉ [1,5]], [MISS],
  [gravity], [-9.81 ∉ [-3,0]], [MISS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [20],
  [temperature], [310K],
  [viscosity], [0.5],
  [density], [2.4],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [0],
  [seismic], [0],
  [particles], [25000],
)
