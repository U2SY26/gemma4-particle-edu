---
name: ollama-integration
description: Ollama + Gemma 4 연동 가이드. API 호출, 스트리밍, 시스템 프롬프트, JSON 파라미터 파싱.
---

# Ollama + Gemma 4 연동 가이드

## Ollama API 기본

### 모델 실행
```bash
ollama pull gemma4
ollama run gemma4
```

### API 엔드포인트
- 기본: `http://localhost:11434`
- 생성: `POST /api/generate`
- 채팅: `POST /api/chat`
- 상태: `GET /api/tags`

### 채팅 API 호출
```javascript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    stream: true
  })
});
```

### 스트리밍 응답 처리
```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (!line) continue;
    const json = JSON.parse(line);
    if (json.message?.content) {
      // 스트리밍 텍스트 처리
    }
  }
}
```

## 시스템 프롬프트 설계

시스템 프롬프트는 두 가지를 동시에 출력해야 함:
1. 자연어 교육 설명
2. 시뮬레이션 파라미터 JSON

### JSON 스키마
```json
{
  "simulation": {
    "prompt": "bridge",
    "physics": {
      "gravity": -9.81,
      "damping": 0.97,
      "springStiffness": 30,
      "density": 7.8,
      "yieldStrength": 85,
      "seismic": 6,
      "seismicFreq": 2.5,
      "temperature": 293,
      "windX": 0,
      "foundation": 7
    }
  }
}
```

### 파라미터 범위 (SimulationManager.js 기준)
| 파라미터 | 범위 | 단위 | 설명 |
|----------|------|------|------|
| gravity | -25 ~ 10 | m/s² | 중력 가속도 |
| damping | 0.80 ~ 0.999 | - | 속도 감쇠 |
| springStiffness | 2 ~ 60 | GPa 스케일 | 스프링 강성 |
| density | 0.1 ~ 20 | ×1000 kg/m³ | 재료 밀도 |
| yieldStrength | 0 ~ 100 | ×1e6 Pa | 항복 강도 |
| temperature | 5 ~ 5000 | K | 온도 |
| seismic | 0 ~ 10 | m/s² | 지진 가속도 |
| foundation | 0.5 ~ 10 | m | 기초 깊이 |
| windX/Y/Z | -15 ~ 15 | m/s² | 바람 |
| friction | 0 ~ 1 | - | 마찰 계수 |
| bounciness | 0 ~ 1 | - | 반발 계수 |

## Express.js 프록시 패턴

```javascript
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4',
        messages,
        stream: true
      })
    });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Pipe Ollama stream to client
    ollamaRes.body.pipe(res);
  } catch (err) {
    res.status(503).json({ error: 'Ollama not available' });
  }
});
```

## 연결 상태 체크

```javascript
async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    const data = await res.json();
    return data.models?.some(m => m.name.startsWith('gemma4'));
  } catch {
    return false;
  }
}
```

## 폴백 전략
- Ollama 미연결 시 → 기존 키워드 기반 NLP (_processNaturalLanguage)
- UI에 "AI 오프라인 — Ollama 연결 필요" 상태 표시
- 기본 시뮬레이션(프리셋)은 AI 없이도 동작
