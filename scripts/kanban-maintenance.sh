#!/usr/bin/env bash
# kanban-maintenance.sh — 주기적 중복 티켓 정리 + sim Agent heartbeat
# 사용: ./scripts/kanban-maintenance.sh
# 크론 주기: 20분 (30분 자동 unclaim 임계 이내)

set -u

TEAM="team-5c22f8c3"
AGENT="agent-ac919e8d"
KANBAN="http://localhost:5555"
HEARTBEAT_TID="T-4599D4"
LOG="/tmp/kanban-maintenance.log"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"

exec >> "$LOG" 2>&1
echo ""
echo "=== $NOW kanban-maintenance ==="

# ---- 0. 팀 상태 체크 + 자동 복원 (Archived→Active) ----
TEAM_STATUS=$(curl -s "$KANBAN/api/teams/$TEAM" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    print(d['board']['team']['status'])
except: print('UNKNOWN')")

if [ "$TEAM_STATUS" = "Archived" ]; then
  curl -s -X PUT "$KANBAN/api/teams/$TEAM/status" \
    -H "Content-Type: application/json" \
    -d '{"status":"Active"}' > /dev/null
  echo "TEAM_RESTORE: Archived→Active (auto-recovered)"
fi

# ---- 1. 중복 티켓 정리 (같은 #번호 중 상태/아티팩트 우선순위 최고 하나만 남김) ----
python3 - <<PYEOF
import json, subprocess, re
KANBAN="$KANBAN"; TEAM="$TEAM"

def curl(method, path, body=None):
    cmd=['curl','-s','-X',method,f'{KANBAN}{path}']
    if body:
        cmd+=['-H','Content-Type: application/json','-d',json.dumps(body)]
    r=subprocess.run(cmd,capture_output=True,text=True)
    try: return json.loads(r.stdout)
    except: return {}

board=curl('GET',f'/api/teams/{TEAM}').get('board',{})
tickets=board.get('tickets',[])
arts=curl('GET',f'/api/teams/{TEAM}/artifacts').get('artifacts',[])
arts_by={}
for a in arts:
    arts_by[a['ticket_id']]=arts_by.get(a['ticket_id'],0)+1

sp={'Done':5,'Review':4,'InProgress':3,'Backlog':2,'Blocked':1}
by_num={}
for t in tickets:
    m=re.search(r'#(\d+)',t['title'])
    if m: by_num.setdefault(int(m.group(1)),[]).append(t)

deleted=0
for n,lst in by_num.items():
    if len(lst)<=1: continue
    slst=sorted(lst,key=lambda t:(
        sp.get(t['status'],0),
        arts_by.get(t['ticket_id'],0),
        t.get('completed_at') or '',
        t.get('created_at') or ''
    ),reverse=True)
    for l in slst[1:]:
        r=curl('DELETE',f'/api/tickets/{l["ticket_id"]}')
        if r.get('ok'): deleted+=1

print(f'DEDUP: deleted={deleted} kept_unique={len(by_num)} total_tickets_now={len(tickets)-deleted}')
PYEOF

# ---- 2. sim Agent heartbeat (unclaim → re-claim) ----
curl -s -X PUT "$KANBAN/api/tickets/$HEARTBEAT_TID/unclaim" \
  -H "Content-Type: application/json" > /dev/null

CLAIM_RES=$(curl -s -X PUT "$KANBAN/api/tickets/$HEARTBEAT_TID/claim" \
  -H "Content-Type: application/json" \
  -d "{\"member_id\":\"$AGENT\"}")

if echo "$CLAIM_RES" | grep -q '"ok": true'; then
  LAST=$(curl -s "$KANBAN/api/teams/$TEAM" | python3 -c "
import json,sys
b=json.load(sys.stdin)['board']
for m in b['members']:
    if m['member_id']=='$AGENT': print(m['last_activity_at'])")
  echo "HEARTBEAT: OK last_activity=$LAST"
else
  echo "HEARTBEAT: FAIL $CLAIM_RES"
fi

echo "=== done ==="
