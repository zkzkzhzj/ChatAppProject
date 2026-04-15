# Wiki Lint — 2026-04-15 20:44

## [CRITICAL]

없음.

## [WARNING]

- [LINT-3] `village/character-system.md` — last-verified: 2026-04-13 (2일 전, 위치 공유 기능 추가 후 미갱신. 캐릭터 시스템에 위치 공유 관련 내용 반영 필요 가능성)
- [LINT-6] `village/character-system.md` — PositionHandler/PositionDisconnectListener가 구현되었으나 캐릭터 시스템 Wiki에 위치 공유 관련 설명이 없음
- [LINT-6] `infra/hooks-automation.md` — Codex CLI 기반 리뷰 에이전트 6개가 추가되었으나 hooks-automation Wiki에 반영되지 않음 (last-verified: 2026-04-13)
- [LINT-6] `infra/docker-local.md` — pgvector/pgvector:pg16 이미지 변경이 infra.md에는 반영되었으나 docker-local Wiki에는 미확인 (last-verified: 2026-04-13)

## LGTM

- [LINT-1] 고아 페이지: 전체 12개 페이지 모두 INDEX.md에 등록됨
- [LINT-2] 교차참조 무결성: 모든 `related` 필드의 파일이 실제 존재함
- [LINT-3] 노화 감지: 전체 페이지가 4주 이내 (최대 2일 전). CRITICAL 노화 없음
- [LINT-4] frontmatter 스키마: 전체 12개 페이지 모두 title/tags/related/last-verified 필드 존재
- [LINT-5] 코드-Wiki 불일치: auth-flow.md의 JwtProvider, SecurityConfig, AuthenticatedUser 모두 실제 존재 확인. 위치 공유(PositionHandler, positionBridge)는 websocket-client.md와 phaser-setup.md에 반영됨

## last-verified 현황

| 페이지 | last-verified | 경과 |
|--------|--------------|------|
| identity/auth-flow.md | 2026-04-13 | 2일 |
| identity/guest-policy.md | 2026-04-15 | 오늘 |
| communication/chat-architecture.md | 2026-04-15 | 오늘 |
| communication/npc-conversation.md | 2026-04-15 | 오늘 |
| village/space-system.md | 2026-04-13 | 2일 |
| village/character-system.md | 2026-04-13 | 2일 |
| infra/outbox-pattern.md | 2026-04-13 | 2일 |
| infra/docker-local.md | 2026-04-13 | 2일 |
| infra/hooks-automation.md | 2026-04-13 | 2일 |
| frontend/phaser-setup.md | 2026-04-13 | 2일 |
| frontend/websocket-client.md | 2026-04-15 | 오늘 |
| frontend/asset-guide.md | 2026-04-13 | 2일 |

## 통계
- 전체 페이지: 12개
- CRITICAL: 0개
- WARNING: 4개
- LGTM: 5개 (Lint 1-5 통과)
