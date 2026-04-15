# Wiki Log

> 모든 Wiki 변경의 시간순 기록. append only.

---

## [2026-04-15] lint | Wiki 정기 점검

- `infra/outbox-pattern.md` — 현재 등록된 이벤트 테이블에 `npc.conversation.summarize` 토픽 추가 (Phase 5에서 구현되었으나 누락)
- `infra/docker-local.md` — PostgreSQL 역할에 pgvector 확장 언급 추가

## [2026-04-14] update | NPC 대화 페이지 — LLM 선택 결과 및 프로덕션 전략 반영

- `communication/npc-conversation.md` — 6개 모델 비교 결과, EXAONE 3.5 선택, 프로덕션 API 전략, pgvector 맥락 유지 계획, 어댑터 구조 현행화
- tags에 `llm`, `ollama`, `exaone`, `pgvector` 추가

## [2026-04-13] update | 프론트엔드 Wiki 갱신 (채팅 UI 반영)

- `frontend/phaser-setup.md` — Scale.RESIZE 풀스크린, noAudio, Phaser↔React 브릿지 구조, 채팅 컴포넌트 트리 추가
- `frontend/websocket-client.md` — @stomp/stompjs Client 기반으로 갱신, connectWithAuth/subscribeToChatRoom/sendChatMessage 반영, useStomp hook 추가

## [2026-04-13] lint | Wiki 정기 점검

- CRITICAL: 0개, WARNING: 0개, LGTM: 6개 (전항목 통과)
- 12페이지 모두 건강. 미구현 도메인(economy, notification, safety)은 빈 디렉토리로 갭 아님

## [2026-04-13] add | 훅 자동화 페이지 추가

- `infra/hooks-automation.md` 신규 생성: Stop/UserPromptSubmit/PreToolUse/PostToolUse 훅 구성
- INDEX.md Infra 카탈로그에 등록

## [2026-04-13] init | Wiki 초기 구축

- 11개 페이지 생성: identity(2), communication(2), village(2), infra(2), frontend(3)
- INDEX.md 생성: 페이지 카탈로그 + Operations(Ingest/Query/Lint) + 스키마 정의
- Karpathy LLM Wiki 패턴 적용: 3-Layer 구조, Operations, log.md
- 에셋 리서치 결과 반영: 32x32 픽셀, Cainos/Cup Nooble 추천, Tiled 워크플로우
