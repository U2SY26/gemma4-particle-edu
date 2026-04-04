#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #003]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[Jupiter Atmosphere Simulation]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [목성 대기 24.79 m/s²],
  [도메인], [astronomy],
  [prompt], [Jupiter atmosphere],
  [정확도], [★★★★★ 100%],
  [파티클], [25000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [gravity], [-24.79 ∈ [-26,-23]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-24.79],
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
