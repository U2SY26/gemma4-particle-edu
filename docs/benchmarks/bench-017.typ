#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #017]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Magnitude 7 Earthquake Impact on Concrete Structure]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [콘크리트 건물 진도7 지진],
  [도메인], [engineering],
  [prompt], [콘크리트 건물 진도7 지진],
  [정확도], [★★★★★ 100%],
  [파티클], [50000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [seismic], [10 ∈ [5,10]], [PASS],
  [gravity], [-9.81 ∈ [-10,-9]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [30],
  [temperature], [293K],
  [viscosity], [0],
  [density], [2.4],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [0],
  [seismic], [10],
  [particles], [50000],
)
