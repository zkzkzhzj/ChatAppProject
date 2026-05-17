---
title: 캐릭터 시스템
tags: [village, character, equipment, sprite]
related: [village/space-system.md, identity/guest-policy.md]
last-verified: 2026-04-15
---

> ⚠️ NOTICE (2026-05-16 / 트랙 `ctx-refresh-post-village-3d`): 이 페이지의 **캐릭터 렌더링·스프라이트 결정은 Phaser 2D 시점**.
> `village-3d` 트랙 (2026-05-13 머지) 이후 캐릭터는 **Three.js 박스 placeholder + RemotePlayer** 로 렌더 (`frontend/src/three/character/`).
> 도메인 모델 (Character / Equipment / 게스트 기본 캐릭터) 자체는 변경 X — 백엔드 결박 그대로.
> 본문의 **스프라이트 시트 / 32x48 프레임** 결정은 **사실 X**.
> 후속 트랙 (`village-3d-step3-character-model`, Quaternius Ultimate Modular Men) 에서 본문 신규.

# 캐릭터 시스템

## 도메인 모델

### Character

| 속성 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| userId | Long | 소유자 (1:1, ID 참조) |

### CharacterEquipment (DB 스키마만 존재, 코드 미구현)

| 속성 | 타입 | 설명 |
|------|------|------|
| characterId | Long | 캐릭터 |
| itemDefinitionId | Long | 장착 아이템 (Economy 도메인) |
| slot | String | HEAD / BODY / ACCESSORY |

## 게스트 기본 캐릭터

게스트는 DB에 캐릭터를 저장하지 않는다. `Character.defaultGuest()`가 즉시 반환.

```java
// 게스트 → 200 + 기본 캐릭터
// 회원 → 200 + DB에서 조회한 캐릭터
```

## 생성 흐름

회원가입 시 Kafka 이벤트로 자동 생성. [공간 시스템](space-system.md) 참조.

## API

| 엔드포인트 | 설명 | 게스트 |
|-----------|------|--------|
| `GET /api/v1/village/characters/me` | 내 캐릭터 조회 | 200 (기본 캐릭터) |

## 실시간 위치 공유

캐릭터는 마을 내에서 실시간으로 위치를 공유한다. 위치 데이터는 비영속(DB 저장 없음)이며 STOMP WebSocket으로만 전파된다.

### 구성 요소

| 클래스 | 패키지 | 역할 |
|--------|--------|------|
| `PositionHandler` | `village.adapter.in.websocket` | `/app/village/position`으로 수신한 좌표를 `/topic/village/positions`로 broadcast |
| `PositionRequest` | 〃 | 클라이언트 전송 DTO (`x`, `y`) |
| `PositionBroadcast` | 〃 | broadcast DTO (`id`, `userType`, `x`, `y`) |
| `PositionDisconnectListener` | 〃 | STOMP 세션 종료 시 `userType=LEAVE` broadcast로 퇴장 알림 |

### 흐름

```text
클라이언트 → /app/village/position (PositionRequest)
    → PositionHandler → /topic/village/positions (PositionBroadcast)

세션 종료 → PositionDisconnectListener → /topic/village/positions (userType=LEAVE)
```

게스트 포함 모든 인증된 유저가 위치 전송 가능. `AuthenticatedUser.displayId()`를 식별자로 사용한다.

## 향후 계획

- CharacterEquipment 도메인 구현 (장비 장착/해제)
- Phaser.js에서 캐릭터 스프라이트 렌더링 + 장비 반영
- 캐릭터 이동 애니메이션
