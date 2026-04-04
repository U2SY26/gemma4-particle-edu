#set text(font: "Noto Sans KR", size: 9pt)
#set page(margin: 1.5cm, height: auto)

#align(center)[
  #text(size: 16pt, weight: "bold")[벤치마크 #011]
  #v(2pt)
  #text(size: 11pt, fill: rgb("#58a6ff"))[고대 석조 피라미드 구조 안정성 분석]
]

#v(8pt)

#table(columns: (auto, auto), inset: 6pt,
  [요청], [피라미드 석조 구조],
  [도메인], [architecture],
  [prompt], [피라미드 석조 구조],
  [정확도], [★★★★★ 100%],
  [파티클], [50000],
  [밀집도], [밀집],
)

#v(8pt)
=== 물리값 검증
#table(columns: (auto, auto, auto), inset: 5pt,
  [파라미터], [결과], [판정],
  [gravity], [-9.81 ∈ [-10,-9]], [PASS],
  [springStiffness], [25 ∈ [10,50]], [PASS],
)

#v(4pt)
=== 물리 파라미터 전체
#table(columns: (auto, auto), inset: 4pt,
  [gravity], [-9.81],
  [damping], [0.97],
  [springK], [25],
  [temperature], [293K],
  [viscosity], [0.01],
  [density], [2500],
  [friction], [0.85],
  [bounciness], [0.2],
  [windX], [0],
  [seismic], [0],
  [particles], [50000],
)
