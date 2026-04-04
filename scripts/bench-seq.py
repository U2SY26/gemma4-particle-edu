#!/usr/bin/env python3
"""Sequential benchmark — 1 at a time, auto-rework <90%, kanban + typst"""
import json, re, time, os, sys

OLLAMA = os.environ.get('OLLAMA_BASE', 'http://localhost:11434')
MODEL = os.environ.get('OLLAMA_MODEL', 'gemma4')
KANBAN = 'http://localhost:5555'
TEAM = 'team-dc1757cd'
DOCS = os.path.join(os.path.dirname(__file__), '..', 'docs', 'benchmarks')
os.makedirs(DOCS, exist_ok=True)

SYS_PROMPT = (
    "Particle sim AI. Fill ALL physics fields with accurate SI values. "
    "ALWAYS respond with ```json "
    '{"simulation":{"prompt":"keyword","title":"...","domain":"...","physics":'
    '{"gravity":-9.81,"damping":0.97,"springStiffness":20,"particleCount":25000,'
    '"temperature":293,"density":2.4,"viscosity":0,"friction":0.8,"bounciness":0.3,'
    '"windX":0,"turbulence":0,"seismic":0}}}```'
)

SCENARIOS = [
    ("이집트 대피라미드", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [10,50]}),
    ("에펠탑 철골 트러스", {"gravity": [-10,-9], "density": [7,8], "springStiffness": [20,60]}),
    ("자유의 여신상", {"gravity": [-10,-9], "density": [7,9]}),
    ("콜로세움 아치", {"gravity": [-10,-9], "density": [2,3], "springStiffness": [15,35]}),
    ("부르즈 칼리파", {"gravity": [-10,-9], "springStiffness": [30,80]}),
    ("시드니 오페라하우스", {"gravity": [-10,-9], "springStiffness": [10,35], "density": [2,3]}),
    ("금문교 현수교", {"gravity": [-10,-9], "springStiffness": [20,70]}),
    ("피사의 사탑", {"gravity": [-10,-9], "density": [2,3]}),
    ("타지마할", {"gravity": [-10,-9], "density": [2,3]}),
    ("만리장성", {"gravity": [-10,-9], "springStiffness": [15,40]}),
    ("보잉 747 비행", {"gravity": [-10,-9]}),
    ("F-22 전투기", {"gravity": [-10,-9]}),
    ("스페이스X 로켓 발사", {"gravity": [-10,-9]}),
    ("자동차 정면충돌", {"gravity": [-10,-9], "bounciness": [0,0.3]}),
    ("잠수함 수중 이동", {"gravity": [-10,-9], "viscosity": [0.5,5]}),
    ("열기구 상승", {"gravity": [-2,2]}),
    ("우주왕복선 재진입", {"temperature": [1000,5000]}),
    ("화성 로버", {"gravity": [-4,-3]}),
    ("ISS 무중력", {"gravity": [-0.1,0.1]}),
    ("달 표면 점프", {"gravity": [-2,-1]}),
    ("커피잔 대류", {"temperature": [330,380]}),
    ("비눗방울", {"gravity": [-10,-9]}),
    ("촛불 열대류", {"temperature": [800,1500]}),
    ("얼음 녹는 상전이", {"temperature": [270,280]}),
    ("도미노 연쇄반응", {"gravity": [-10,-9]}),
    ("물 분자 H2O", {"gravity": [-0.1,0.1]}),
    ("NaCl 결정격자", {"gravity": [-0.1,0.1]}),
    ("DNA 이중나선", {"gravity": [-0.1,0.1]}),
    ("단백질 알파헬릭스", {"gravity": [-0.1,0.1]}),
    ("브라운 운동", {"gravity": [-0.1,0.1]}),
    ("세포 분열", {"gravity": [-3,0]}),
    ("뉴런 시냅스", {"gravity": [-3,0]}),
    ("적혈구 모세혈관", {"viscosity": [1,5]}),
    ("바이러스 캡시드", {"gravity": [-0.1,0.1]}),
    ("광합성 전자전달", {"gravity": [-0.1,0.1]}),
    ("판구조론", {"seismic": [3,10]}),
    ("화산 용암", {"temperature": [1100,1500]}),
    ("지진파 전파", {"seismic": [3,10]}),
    ("해류 열염순환", {"viscosity": [0.5,3]}),
    ("쓰나미", {"gravity": [-10,-9]}),
    ("토네이도", {"windX": [5,30], "turbulence": [3,15]}),
    ("눈보라 -30도", {"temperature": [230,250]}),
    ("태풍", {"windX": [5,20], "turbulence": [5,15]}),
    ("오로라", {"gravity": [-0.1,0.1]}),
    ("태양계 궤도", {"gravity": [-0.1,0.1]}),
    ("블랙홀 강착원반", {"gravity": [-1000,-1]}),
    ("은하 충돌", {"gravity": [-0.1,0.1]}),
    ("목성 대적반", {"gravity": [-26,-23]}),
    ("화성 먼지폭풍", {"gravity": [-4,-3]}),
    ("초신성 폭발", {"temperature": [5000,50000]}),
    ("트러스 다리", {"springStiffness": [20,60]}),
    ("내진 건물", {"seismic": [5,10]}),
    ("풍력 터빈", {"windX": [5,20]}),
    ("댐 수압", {"viscosity": [0.5,3]}),
    ("로렌츠 어트랙터", {"gravity": [-0.1,0.1]}),
    ("피보나치 나선", {"gravity": [-0.1,0.1]}),
    ("다이아몬드 결정", {"springStiffness": [40,200], "density": [3,4]}),
    ("핵융합 플라즈마", {"temperature": [10000,200000]}),
    ("자유낙하 10m", {"gravity": [-10,-9]}),
    ("심해 수압", {"viscosity": [1,10]}),
    ("용암 1200도", {"temperature": [1100,1500]}),
    ("꿀 점성", {"viscosity": [5,20]}),
    ("수영장 파동", {"viscosity": [0.5,3]}),
    ("뉴턴 요람", {"bounciness": [0.7,1]}),
    ("초전도 마이스너", {"gravity": [-0.1,0.1], "temperature": [0,100]}),
    ("끓는물 373K", {"temperature": [360,380]}),
    ("수은 액체금속", {"density": [10,15]}),
    ("지진 규모7", {"seismic": [5,10]}),
    ("맨하튼 도시", {"gravity": [-10,-9]}),
    ("DNA 복제 포크", {"gravity": [-0.1,0.1]}),
    ("심장 혈류 순환", {"viscosity": [1,5]}),
]

try:
    import urllib.request
    def fetch(url, data=None):
        req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                     headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except: return None
except: pass

def call_gemma(query):
    data = {"model": MODEL, "stream": False, "messages": [
        {"role": "system", "content": SYS_PROMPT},
        {"role": "user", "content": f"{query} 시뮬레이션 해줘"},
    ]}
    resp = fetch(f"{OLLAMA}/api/chat", data)
    if not resp: return None, ""
    content = resp.get("message", {}).get("content", "")
    m = re.search(r'```json\s*([\s\S]*?)```', content)
    if not m: return None, content
    try:
        sim = json.loads(m.group(1))["simulation"]
        return sim, content
    except: return None, content

def score(physics, expect):
    ok, total = 0, 0
    details = []
    for k, (lo, hi) in expect.items():
        v = physics.get(k)
        total += 1
        if v is not None and lo <= float(v) <= hi:
            ok += 1
            details.append(f"{k}={v} ✓")
        else:
            details.append(f"{k}={v} ✗ [{lo},{hi}]")
    pct = int(ok / total * 100) if total else 0
    stars = "★" * round(pct / 20) + "☆" * (5 - round(pct / 20))
    return pct, stars, details

def kanban_ticket(title, prio="medium"):
    r = fetch(f"{KANBAN}/api/teams/{TEAM}/tickets", {"title": title, "priority": prio})
    return r.get("ticket", {}).get("ticket_id") if r and r.get("ok") else None

def kanban_done(tid, artifact):
    if not tid: return
    fetch(f"{KANBAN}/api/tickets/{tid}/claim", {"member_id": "gemma4"})
    fetch(f"{KANBAN}/api/tickets/{tid}/artifacts",
          {"creator_member_id": "gemma4", "title": artifact[:50], "content": artifact, "artifact_type": "result"})
    fetch(f"{KANBAN}/api/tickets/{tid}/status", {"status": "Review"})
    fetch(f"{KANBAN}/api/tickets/{tid}/status", {"status": "Done"})

def main():
    total = len(SCENARIOS)
    passed, failed, reworked = 0, 0, 0
    print(f"=== 순차 벤치마크 {total}회 (90% 미만 자동 재티켓) ===\n")

    for i, (query, expect) in enumerate(SCENARIOS):
        num = i + 1
        for attempt in range(1, 3):
            label = f"{num}" if attempt == 1 else f"{num}-R"
            prio = "medium" if attempt == 1 else "high"

            sys.stdout.write(f"[{label:>5}] {query:<28} ")
            sys.stdout.flush()

            # 칸반 티켓
            tid = kanban_ticket(f"#{label}: {query}", prio)

            # Gemma4
            sim, raw = call_gemma(query)
            if not sim:
                print(f"✗ No JSON")
                kanban_done(tid, f"FAIL: No JSON")
                if attempt == 1:
                    print(f"       ↳ 재티켓")
                    reworked += 1
                    time.sleep(1)
                    continue
                else:
                    failed += 1
                    break

            p = sim.get("physics", {})
            pct, stars, details = score(p, expect)
            pc = p.get("particleCount", "?")
            title = sim.get("title", "?")[:30]

            print(f"{stars} {pct}% | {title} [{pc}p]")
            for d in details:
                if "✗" in d: print(f"       {d}")

            # Typst
            typ_path = os.path.join(DOCS, f"bench-{str(num).zfill(3)}.typ")
            with open(typ_path, "w") as f:
                f.write(f"벤치마크 #{label}: {query}\n{title}\n{stars} {pct}%\nparticles={pc}\n" + "\n".join(details))

            # 칸반 완료
            kanban_done(tid, f"{stars} {pct}% | {title} | {pc}p | {typ_path}")

            if pct >= 90:
                passed += 1
                break
            elif attempt == 1:
                print(f"       ↳ 90% 미만 → 재티켓")
                reworked += 1
                time.sleep(1)
            else:
                failed += 1

        time.sleep(1)

    print(f"\n=== 결과 ===")
    print(f"PASS (≥90%): {passed}/{total}")
    print(f"FAIL: {failed}/{total}")
    print(f"재작업: {reworked}")

if __name__ == "__main__":
    main()
