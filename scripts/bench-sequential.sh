#!/bin/bash
# 300회 순차 벤치마크 — 1개씩, 90% 미만 자동 재티켓
T="team-dc1757cd"
OLLAMA="http://localhost:11434"
KANBAN="http://localhost:5555"
SYS='Particle sim AI. Fill ALL physics fields with accurate SI values based on your knowledge. ALWAYS ```json {"simulation":{"prompt":"keyword","title":"...","domain":"...","physics":{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,"temperature":293,"density":2.4,"viscosity":0,"friction":0.8,"bounciness":0.3,"windX":0,"turbulence":0,"seismic":0}}}```'

SCENARIOS=(
"이집트 대피라미드|gravity:[-10,-9] density:[2,3] springStiffness:[10,50]"
"에펠탑 철골 트러스|gravity:[-10,-9] density:[7,8] springStiffness:[20,60]"
"자유의 여신상 구리+철골|gravity:[-10,-9] density:[7,9]"
"콜로세움 아치|gravity:[-10,-9] density:[2,3] springStiffness:[15,35]"
"부르즈 칼리파 828m|gravity:[-10,-9] springStiffness:[30,80] density:[2,8]"
"시드니 오페라하우스 셸|gravity:[-10,-9] springStiffness:[10,35] density:[2,3]"
"금문교 현수교|gravity:[-10,-9] springStiffness:[20,70] density:[5,9]"
"피사의 사탑|gravity:[-10,-9] density:[2,3]"
"타지마할 대리석|gravity:[-10,-9] density:[2,3]"
"만리장성|gravity:[-10,-9] density:[2,3] springStiffness:[15,40]"
"보잉 747 비행|gravity:[-10,-9]"
"F-22 전투기 기동|gravity:[-10,-9] windX:[-5,5]"
"스페이스X 로켓 발사|gravity:[-10,-9]"
"자동차 정면충돌|gravity:[-10,-9] bounciness:[0,0.3]"
"잠수함 수중 이동|gravity:[-10,-9] viscosity:[0.5,5]"
"열기구 상승|gravity:[-2,2] density:[0,0.5]"
"우주왕복선 재진입|gravity:[-10,-9] temperature:[1000,5000]"
"화성 탐사 로버|gravity:[-4,-3] temperature:[190,240]"
"국제우주정거장 궤도|gravity:[-0.1,0.1]"
"달 표면 우주인 점프|gravity:[-2,-1]"
"커피잔 대류|gravity:[-10,-9] temperature:[330,380]"
"비눗방울 표면장력|gravity:[-10,-9] viscosity:[0,1]"
"촛불 열대류|gravity:[-10,-9] temperature:[800,1500]"
"얼음 녹는 상전이|temperature:[270,280]"
"도미노 연쇄 반응|gravity:[-10,-9] bounciness:[0.1,0.5]"
"물 분자 H2O|gravity:[-0.1,0.1]"
"NaCl 결정 격자|gravity:[-0.1,0.1] springStiffness:[20,80]"
"DNA 이중나선|gravity:[-0.1,0.1]"
"단백질 알파 헬릭스|gravity:[-0.1,0.1] viscosity:[0.5,5]"
"브라운 운동|gravity:[-0.1,0.1] temperature:[290,310]"
"세포 분열|gravity:[-3,0] viscosity:[1,5]"
"뉴런 시냅스|gravity:[-3,0]"
"적혈구 모세혈관|gravity:[-3,0] viscosity:[1,5]"
"바이러스 캡시드|gravity:[-0.1,0.1]"
"광합성 전자전달|gravity:[-0.1,0.1]"
"판구조론 수렴경계|gravity:[-10,-9] seismic:[3,10]"
"화산 폭발 용암|gravity:[-10,-9] temperature:[1100,1500]"
"지진파 P파 S파|gravity:[-10,-9] seismic:[3,10]"
"해류 열염순환|gravity:[-10,-9] viscosity:[0.5,3]"
"쓰나미 전파|gravity:[-10,-9]"
"토네이도 회전|windX:[5,30] turbulence:[3,15]"
"눈보라 -30도|temperature:[230,250] windX:[5,20]"
"태풍 시뮬레이션|windX:[5,20] turbulence:[5,15]"
"오로라|gravity:[-0.1,0.1] temperature:[150,250]"
"태양계 8행성|gravity:[-0.1,0.1]"
"블랙홀 강착원반|gravity:[-1000,-1]"
"은하 충돌|gravity:[-0.1,0.1]"
"목성 대적반|gravity:[-26,-23] turbulence:[3,15]"
"화성 먼지폭풍|gravity:[-4,-3] windX:[5,30]"
"초신성 폭발|gravity:[-0.1,0.1] temperature:[5000,50000]"
"트러스 다리 하중|gravity:[-10,-9] springStiffness:[20,60]"
"내진 설계 건물|gravity:[-10,-9] seismic:[5,10]"
"풍력 터빈|gravity:[-10,-9] windX:[5,20]"
"댐 수압|gravity:[-10,-9] viscosity:[0.5,3]"
"로렌츠 어트랙터|gravity:[-0.1,0.1] damping:[0.95,1]"
"만델브로 프랙탈|gravity:[-0.1,0.1]"
"피보나치 나선|gravity:[-0.1,0.1]"
"다이아몬드 결정|springStiffness:[40,200] density:[3,4]"
"BCC FCC 결정구조|gravity:[-0.1,0.1]"
"핵융합 플라즈마|temperature:[10000,200000] gravity:[-0.1,0.1]"
"자유낙하 10m|gravity:[-10,-9] damping:[0.9,1]"
"심해 11000m 수압|gravity:[-10,-9] viscosity:[1,10]"
"용암 1200도|temperature:[1100,1500] viscosity:[2,15]"
"꿀 점성 흐름|viscosity:[5,20]"
"수영장 파동|gravity:[-10,-9] viscosity:[0.5,3]"
"뉴턴 요람|bounciness:[0.7,1] friction:[0,0.3]"
"초전도 마이스너|gravity:[-0.1,0.1] temperature:[0,100]"
"물 끓는점 373K|temperature:[360,380]"
"수은 액체금속|density:[10,15]"
"지진 규모 7|seismic:[5,10] gravity:[-10,-9]"
"헬륨 풍선 상승|gravity:[0,5] density:[0,0.5]"
)

PASS=0; FAIL=0; REWORK=0; TOTAL=${#SCENARIOS[@]}
echo "=== 순차 벤치마크 $TOTAL회 (90% 미만 자동 재티켓) ==="

for i in "${!SCENARIOS[@]}"; do
  IFS='|' read -r QUERY CHECKS <<< "${SCENARIOS[$i]}"
  NUM=$((i+1))

  for ATTEMPT in 1 2; do
    LABEL="$NUM"
    [ $ATTEMPT -eq 2 ] && LABEL="${NUM}-R"

    printf "[%3s] %-30s " "$LABEL" "${QUERY:0:28}"

    # 칸반 티켓
    TID=$(curl -s -X POST "$KANBAN/api/teams/$T/tickets" -H "Content-Type: application/json" \
      -d "{\"title\":\"#$LABEL: $QUERY\",\"priority\":\"$([ $ATTEMPT -eq 2 ] && echo high || echo medium)\"}" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('ticket',{}).get('ticket_id',''))" 2>/dev/null)
    [ -n "$TID" ] && curl -s -X PUT "$KANBAN/api/tickets/$TID/claim" -H "Content-Type: application/json" -d '{"member_id":"gemma4"}' > /dev/null 2>&1

    # Gemma4
    RESP=$(curl -s --max-time 120 -X POST "$OLLAMA/api/chat" -H "Content-Type: application/json" \
      -d "{\"model\":\"gemma4\",\"stream\":false,\"messages\":[{\"role\":\"system\",\"content\":\"$SYS\"},{\"role\":\"user\",\"content\":\"$QUERY 시뮬레이션 해줘\"}]}" 2>/dev/null)

    SCORE=$(echo "$RESP" | python3 -c "
import json,sys,re
try:
    d=json.load(sys.stdin); c=d['message']['content']
    m=re.search(r'\x60\x60\x60json\s*([\s\S]*?)\x60\x60\x60',c)
    if not m: print('0|FAIL|No JSON|0'); sys.exit()
    sim=json.loads(m.group(1))['simulation']; p=sim.get('physics',{})
    checks='$CHECKS'.split()
    ok=0; total=0
    for chk in checks:
        k,rng=chk.split(':')
        lo,hi=[float(x) for x in rng.strip('[]').split(',')]
        v=p.get(k)
        total+=1
        if v is not None and lo<=float(v)<=hi: ok+=1
    avg=int(ok/total*100) if total else 0
    stars='★'*round(avg/20)+'☆'*(5-round(avg/20))
    pc=p.get('particleCount','?')
    title=sim.get('title','?')[:30]
    print(f'{avg}|{stars}|{title}|{pc}')
    # Typst
    with open(f'docs/benchmarks/bench-{\"$LABEL\".zfill(3) if len(\"$LABEL\")<4 else \"$LABEL\"}.typ','w') as f:
        f.write(f'벤치마크 #{\"$LABEL\"}: {\"$QUERY\"}\\n{title}\\n{stars} {avg}%\\nparticles={pc}')
except Exception as e: print(f'0|FAIL|{e}|0')
" 2>/dev/null)

    PCT=$(echo "$SCORE" | cut -d'|' -f1)
    STARS=$(echo "$SCORE" | cut -d'|' -f2)
    TITLE=$(echo "$SCORE" | cut -d'|' -f3)
    PC=$(echo "$SCORE" | cut -d'|' -f4)

    echo "$STARS $PCT% $TITLE [${PC}p]"

    # 칸반 완료
    [ -n "$TID" ] && {
      curl -s -X POST "$KANBAN/api/tickets/$TID/artifacts" -H "Content-Type: application/json" \
        -d "{\"creator_member_id\":\"gemma4\",\"title\":\"$STARS $PCT%\",\"content\":\"$TITLE | ${PC}p\",\"artifact_type\":\"result\"}" > /dev/null 2>&1
      curl -s -X PUT "$KANBAN/api/tickets/$TID/status" -H "Content-Type: application/json" -d '{"status":"Review"}' > /dev/null 2>&1
      curl -s -X PUT "$KANBAN/api/tickets/$TID/status" -H "Content-Type: application/json" -d '{"status":"Done"}' > /dev/null 2>&1
    }

    # 90% 이상이면 통과, 미만이면 재시도
    if [ "$PCT" -ge 90 ] 2>/dev/null; then
      PASS=$((PASS+1))
      break
    elif [ $ATTEMPT -eq 1 ]; then
      echo "      ↳ 90% 미만 → 재티켓"
      REWORK=$((REWORK+1))
    else
      FAIL=$((FAIL+1))
    fi

    sleep 1
  done
done

echo ""
echo "=== 결과 ==="
echo "PASS (≥90%): $PASS/$TOTAL"
echo "FAIL (<90% 재시도 후): $FAIL"
echo "재작업: $REWORK"
