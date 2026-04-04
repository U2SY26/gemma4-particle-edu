#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #018]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[블랙홀 강착원반 물리 시뮬레이션]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [블랙홀 강착원반],
  [도메인], [astronomy],
  [prompt], [블랙홀 강착원반],
  [정확도], [★★★★★ 100%],
  [파티클], [50000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [gravity], [-100 ∈ [-1000,-1]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-100],
  [damping], [0.95],
  [springK], [50],
  [temperature], [10000K],
  [viscosity], [5],
  [density], [1000],
  [friction], [1.2],
  [bounciness], [0.2],
  [windX], [0],
  [seismic], [1],
  [particles], [50000],
)
