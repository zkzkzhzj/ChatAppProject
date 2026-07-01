# Wiki Log

> 모든 Wiki 변경의 시간순 기록. append only.

---

## [2026-07-02] update | 현재 Wiki의 Phaser 참조 정리

- `frontend/phaser-setup.md`를 현재 구조 문서가 아닌 과거 Phaser 2D 프로토타입 기록으로 축소했다.
- `frontend/websocket-client.md`, `INDEX.md`에서 현재 WebSocket/프론트엔드 구조를 Three.js scene 기준으로 갱신했다.
- 현재 프론트엔드 작업 라우팅에서 Phaser Wiki를 활성 구조 문서로 보지 않도록 정리했다.

## [2026-06-23] update | 개인화/Economy 제거 후 Wiki 현재형 정리

- issue #151 기준으로 저장형 개인 공간, 캐릭터 장비, 꾸미기, 포인트/아이템 Economy는 현재 제품 범위에서 제거됨.
- Village Wiki 카탈로그는 런타임 마을/도서관 presence 문서로 재해석하고, 에셋 가이드는 Three.js 런타임 자산 기준으로 갱신.

## [2026-06-08] update | 일반 채팅 AI 대화 폐기 반영

- `communication/deprecated-general-chat-ai-conversation.md`로 폐기 문서를 정리.
- 일반 채팅 자동 응답, 멘션 대상 조회, 대화 요약, 임베딩 저장은 현재 런타임에서 제거됨.

## [2026-04-15] lint | Wiki 정기 점검 (2차)

- CRITICAL: 0개, WARNING: 4개, LGTM: 5개
- WARNING: character-system에 위치 공유 미반영, hooks-automation에 Codex CLI 리뷰 에이전트 미반영, docker-local pgvector 이미지 미확인
- 전체 12개 페이지 모두 4주 이내. 고아 페이지·교차참조·스키마 모두 통과.

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
