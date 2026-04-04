#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #019]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[끓는 물과 기포 시뮬레이션]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [물 끓는점 373K 기포],
  [도메인], [chemistry],
  [prompt], [물 끓는점 373K 기포],
  [정확도], [★★★★★ 100%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [temperature], [373 ∈ [360,380]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [20],
  [temperature], [373K],
  [viscosity], [1],
  [density], [1],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [0],
  [seismic], [0],
  [particles], [25000],
)
