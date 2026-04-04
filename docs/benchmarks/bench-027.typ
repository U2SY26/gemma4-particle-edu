#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #027]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Swimming Pool Wave Dynamics]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [수영장 파동 역학],
  [도메인], [physics],
  [prompt], [수영장 파동 역학],
  [정확도], [★★★★★ 100%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [viscosity], [1 ∈ [0.5,3]], [PASS],
  [gravity], [-9.81 ∈ [-10,-9]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [20],
  [temperature], [293K],
  [viscosity], [1],
  [density], [1],
  [friction], [0.8],
  [bounciness], [0.3],
  [windX], [0],
  [seismic], [0],
  [particles], [25000],
)
