---
title: NPC 대화
tags: [communication, npc, ai, claude-api]
related: [communication/chat-architecture.md]
last-verified: 2026-04-13
---

# NPC 대화

## 현재 상태 (Phase 3)

NPC 응답은 **하드코딩**. `HardcodedNpcResponseAdapter`가 고정 메시지를 반환한다.

```java
// communication/adapter/out/npc/HardcodedNpcResponseAdapter.java
// GenerateNpcResponsePort 인터페이스 구현
```

## AI 교체 계획 (Phase 5)

`GenerateNpcResponsePort` 인터페이스는 이미 정의되어 있다. Phase 5에서 구현체만 교체하면 된다.

```
현재: HardcodedNpcResponseAdapter (하드코딩)
  ↓ Phase 5
교체: ClaudeNpcResponseAdapter (Claude API 호출)
```

### 교체 시 고려사항

| 항목 | 내용 |
|------|------|
| API | Claude API (Anthropic SDK) |
| 컨텍스트 | 이전 대화 이력을 Cassandra에서 조회하여 프롬프트에 포함 |
| 페르소나 | NPC마다 성격/말투 설정 (프롬프트 엔지니어링) |
| 비용 | 토큰 사용량 제어 — 대화 이력 윈도우 제한 |
| 대안 | Anthropic Managed Agents로 장기 세션 NPC 구현 가능 (2026-04 베타) |

## NPC의 서비스 내 역할

- 마을의 주민. 단순 상담 봇이 아니라, 마을에 살며 유저를 반겨주는 존재
- 초기: 유저가 적을 때 빈 마을 방지
- 성장기: 보조 역할로 전환 (유저 간 대화가 주가 됨)
