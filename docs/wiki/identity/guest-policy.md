---
title: 게스트 정책
tags: [identity, guest, policy]
related: [identity/auth-flow.md, village/character-system.md, village/space-system.md]
last-verified: 2026-04-15
---

# 게스트 정책

## 원칙

게스트는 **마을 구경은 가능하지만, 소통과 정착은 불가능**하다.
"구경해보고 마음에 들면 회원가입"이 유입 전략의 핵심.

## 게스트가 할 수 있는 것 / 없는 것

| 기능 | 게스트 | 회원 | 비고 |
|------|--------|------|------|
| 마을 둘러보기 | O | O | |
| 캐릭터 보기 | O (기본 캐릭터) | O | 게스트는 `Character.defaultGuest()` — DB 저장 없음 |
| 내 공간 조회 | X (403) | O | `GuestNoPersonalSpaceException` |
| NPC 채팅 | X (403) | O | `GuestChatNotAllowedException` |
| 아이템 구매 | X | O | Economy Phase에서 구현 예정 |
| 공간 꾸미기 | X | O | 회원 전용 |

## API 응답

| 엔드포인트 | 게스트 응답 |
|-----------|-----------|
| `GET /api/v1/village/characters/me` | 200 + 기본 캐릭터 JSON |
| `GET /api/v1/village/spaces/me` | 403 `VILLAGE_003` (게스트는 개인 공간을 가질 수 없습니다) |
| `POST /api/v1/chat/messages` | 403 `COMM_003` (게스트는 채팅 기능을 사용할 수 없습니다) |
| STOMP `/app/chat/village` | 403 `COMM_003` (게스트는 채팅 기능을 사용할 수 없습니다) |

## 설계 결정 (ADR-005)

게스트 캐릭터를 DB에 저장하지 않는 이유:

- 게스트는 일시적 존재. DB에 쌓이면 정리가 필요
- `defaultGuest()`로 즉시 반환하면 조회 비용 없음
- 회원 전환 시 Kafka 이벤트로 캐릭터/공간이 자동 생성됨
