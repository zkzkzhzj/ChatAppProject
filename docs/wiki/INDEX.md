# Wiki — 마음의 고향

> 이 프로젝트의 정규 지식 베이스. LLM이 유지보수하는 위키.
> 새 세션 시작 시 이 INDEX를 읽어 프로젝트 전체 지식을 빠르게 파악한다.
>
> **3-Layer 구조** (Karpathy LLM Wiki 패턴):
> - **Raw Sources**: 코드, migration SQL, application.yml, ADR — 불변의 원천
> - **Wiki**: LLM이 생성·갱신하는 마크다운 페이지 — 이 디렉토리
> - **Schema**: CLAUDE.md + 이 INDEX — 위키 구조와 운영 규칙을 정의
>
> **knowledge vs wiki**: `docs/knowledge/`는 시간순 리서치 노트(append only), `docs/wiki/`는 토픽별 최신 상태(덮어쓰기 갱신).

---

## 페이지 카탈로그

### Identity
| 페이지 | 한 줄 요약 | tags |
|--------|-----------|------|
| [인증 흐름](identity/auth-flow.md) | JWT 인증, 게스트/회원 분기, Security 설정 | `identity, jwt, security, guest` |
| [게스트 정책](identity/guest-policy.md) | 게스트가 할 수 있는 것 / 없는 것 | `identity, guest, policy` |

### Communication
| 페이지 | 한 줄 요약 | tags |
|--------|-----------|------|
| [채팅 아키텍처](communication/chat-architecture.md) | REST + WebSocket + Cassandra 전체 흐름 | `communication, websocket, cassandra, chat` |
| [NPC 대화](communication/npc-conversation.md) | NPC 채팅 흐름, 하드코딩 → AI 교체 계획 | `communication, npc, ai` |

### Village
| 페이지 | 한 줄 요약 | tags |
|--------|-----------|------|
| [공간 시스템](village/space-system.md) | 공간 생성, 꾸미기, 테마 | `village, space, decoration` |
| [캐릭터 시스템](village/character-system.md) | 캐릭터 생성, 장비, 게스트 기본 캐릭터 | `village, character, equipment` |

### Infra
| 페이지 | 한 줄 요약 | tags |
|--------|-----------|------|
| [Outbox + Kafka 이벤트](infra/outbox-pattern.md) | Transactional Outbox, Kafka 이벤트 흐름, 멱등성 | `infra, outbox, kafka, idempotency` |
| [로컬 인프라](infra/docker-local.md) | Docker Compose 구성, 서비스별 설정 | `infra, docker, postgres, redis, cassandra, kafka` |
| [Claude Code 훅 자동화](infra/hooks-automation.md) | 훅 기반 서브에이전트 라우팅, docs 검증, handover 갱신 | `infra, hooks, automation, subagent, ai-native` |

### Frontend
| 페이지 | 한 줄 요약 | tags |
|--------|-----------|------|
| [Phaser.js + Next.js 통합](frontend/phaser-setup.md) | Phaser 설정, Next.js 통합 구조, 현재 상태 | `frontend, phaser, nextjs` |
| [WebSocket 클라이언트](frontend/websocket-client.md) | STOMP 연결, 메시지 송수신, 인증 | `frontend, websocket, stomp` |
| [에셋 가이드](frontend/asset-guide.md) | 에셋 소스, 규격, 라이선스, 스타일 방향 | `frontend, assets, pixel-art, tiled` |

---

## Operations

### Ingest (수집)
새로운 기능 구현이나 구조 변경 시:
1. 관련 Wiki 페이지를 찾는다 (tags 검색: `Grep "tags:.*keyword" docs/wiki/`)
2. 변경 내용을 해당 페이지에 반영한다 (최신 상태 유지)
3. 새 토픽이면 페이지를 생성한다 (frontmatter 필수)
4. INDEX.md 카탈로그를 갱신한다
5. 관련 페이지의 `related` 링크를 업데이트한다
6. log.md에 기록한다

### Query (질의)
Wiki를 대상으로 질문할 때:
1. INDEX.md에서 관련 페이지를 찾는다
2. tags로 추가 관련 페이지를 검색한다 (`Grep "tags:.*keyword"`)
3. 여러 페이지를 종합하여 답변한다
4. 답변 과정에서 발견한 갭이 있으면 해당 페이지를 보강한다

### Lint (검증)
정기적으로 Wiki 상태를 점검한다 (`/wiki-lint` 스킬):
1. **모순 탐지**: 페이지 간 상충하는 설명
2. **노화 감지**: `last-verified`가 4주 이상 지난 페이지
3. **고아 페이지**: INDEX.md에 등록되지 않은 페이지
4. **교차참조 누락**: `related`에 있지만 실제 파일이 없는 링크
5. **코드-Wiki 불일치**: Wiki에 기술된 내용이 실제 코드와 다른 경우
6. **데이터 갭**: 구현되었지만 Wiki에 없는 시스템

---

## Wiki 페이지 스키마

각 페이지는 반드시 아래 frontmatter를 포함한다:

```yaml
---
title: 페이지 제목
tags: [tag1, tag2, tag3]        # Grep 검색용. 도메인명 + 기술명 포함
related: [카테고리/파일명.md]     # docs/wiki/ 기준 상대 경로. Claude가 바로 Read 가능
last-verified: YYYY-MM-DD       # 마지막으로 코드와 일치 확인한 날짜
---
```

### 태그 규칙
- 도메인: `identity`, `communication`, `village`, `infra`, `frontend`
- 기술: `jwt`, `websocket`, `cassandra`, `kafka`, `phaser`, `stomp`
- 개념: `guest`, `npc`, `outbox`, `idempotency`, `pixel-art`

---

## 변경 이력

[log.md](log.md) — 모든 Wiki 변경의 시간순 기록
