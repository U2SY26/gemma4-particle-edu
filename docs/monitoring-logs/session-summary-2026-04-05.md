# Gemma4 31B × 300 시나리오 벤치마크 — 세션 기록 요약
## 2026-04-05 (시뮬 진행 중)

### 실행 환경
- **GPU**: NVIDIA RTX 5090 (32.6 GB VRAM, 531W max)
- **모델**: gemma4:31b (Q4_K_M, 30.9 GB, 28 GB VRAM 점유)
- **엔진**: Ollama 로컬 (localhost:11434)
- **스크립트**: scripts/dag-benchmark.js × 2 프로세스 병렬
- **시작**: 2026-04-05 15:34 KST

### 핵심 성능 지표 (00:07 KST 기준, 148/300 = 49.3%)
| 지표 | 값 |
|------|-----|
| 5항목 ALL PASS | 292/299 (**97.7%**) |
| 평균 정확도 | **99.4%** |
| 100% 정확도 | 292개 |
| FAIL | 7개 (극한물리 도메인 한정) |
| 폭발 | 5개 (커밋 3dae7bc cap 이후 신규 0) |
| 재료 다양성 | 10+ 종 (water, steel, plasma, air, concrete, wood, metal, stone, protein, limestone...) |
| 시나리오 도메인 | 건축, 운송, 천체, 생물, 나노, 양자, 기상, 유체, 열역학, 기계, 전자기, 해양 |

### FAIL 7건 상세
| # | 시나리오 | 정확도 | 폭발 | 도메인 |
|---|---------|-------|------|--------|
| 015 | 블랙홀 강착원반 | 80% | Y | 천체 |
| 149 | Ultra-Strong Magnetic Field | 80% | N | 양자 |
| 242 | Proton Quark Structure | 80% | N | 양자 |
| 283 | Fullerene C60 | 80% | N | 나노 |
| 293 | Supernova Explosion | 60% | Y | 천체 |
| 294 | Pulsar EM Pulse | 80% | Y | 천체 |
| 295 | Extreme Gamma-Ray Burst | 60% | Y | 천체 |

핵심 인사이트: **정상 도메인 = 100%, 극한 물리 = 60~80%**.

### GPU 가동 기록
```
76°C | 96% GPU | 92% VRAM (29.9/32.6 GB) | 531W
```
8시간+ 연속 가동, 열적 스로틀링으로 점진적 둔화 관찰됨.

### 시간별 처리 속도 (req/h)
```
15:00  277  시작(웜업)
16:00  229
17:00  197
18:00  360  ⭐ 피크
19:00  343
20:00  283
21:00  306
22:00  236
23:00  138  ⚠️ 둔화
```

### 26B vs 31B 비교
| 모델 | 시나리오 | PASS율 |
|------|---------|-------|
| gemma4:26b | 300/300 | 98.7% (296) |
| gemma4:31b | 299 (진행중) | 97.7% (292) |

### 칸반 자동 감시 체계
- Claude CronCreate: 매시 :07 헬스체크 + 매 20분 dedup/heartbeat
- OS crontab: */15 kanban-maintenance + */10 os-healthcheck
- 4겹 감시 이중화, 267개 파일 복구 사고 대응 완료
- team-5c22f8c3 Archived→Active 소급 등록 완료

### 핵심 사건 타임라인
| 시각 | 사건 |
|------|------|
| 15:34 | dag-benchmark.js 2 프로세스 시작 |
| 18:06 | 267개 bench 파일 삭제 발견 → git restore 복구 |
| 18:07 | team-5c22f8c3 Archived→Active 전환 |
| 18:10 | 소급 등록 10 티켓 Review 전환 |
| 18:43 | kanban-maintenance.sh 작성 + OS crontab 등록 |
| 18:52 | os-healthcheck.sh 작성 + 이중화 완료 |
| 19:50 | 중간 점검 #1 — 75/300 (25%) |
| 20:21 | 중간 점검 #2 — 87/300 (29%) |
| 00:07 | 사이클 #6 — 148/300 (49.3%) |
| ~08:00 | 예상 완료 시각 (ETA) |

### Kaggle 제출용 활용 포인트
1. **Technical Depth**: 300 시나리오 × 7-step DAG + Verlet 100프레임 자동 검증
2. **Accuracy**: 99.4% 평균, 292/299 ALL PASS
3. **Diversity**: 12 도메인, 10+ 재료, Gemma4가 시나리오별로 적절한 물리값 생성
4. **Robustness**: 8시간+ 무중단, RTX 5090 96% 풀로드, 열적 둔화에도 안정
5. **Monitoring**: 4겹 자동 감시, 사고 대응(파일 복구, 칸반 소급) 완료
6. **Video Evidence**: GPU 96% 가동 + ollama ps + journalctl 로그 + bench 결과 테이블

### 로그 파일 위치
- `docs/monitoring-logs/kanban-maintenance.log` — dedup + heartbeat 전체 기록
- `docs/monitoring-logs/gemma4-os-healthcheck.log` — OS 헬스체크 전체 기록
- `docs/monitoring-logs/session-summary-2026-04-05.md` — 이 파일
- `docs/benchmarks/bench-*.typ` — 개별 벤치마크 결과 (Typst)
- `docs/benchmark-report.typ` — 구버전 리포트 (8B, 20 시나리오, 별개)
