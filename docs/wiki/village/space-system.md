---
title: 공간 시스템
tags: [village, space, decoration, phaser]
related: [village/character-system.md, identity/guest-policy.md]
last-verified: 2026-04-13
---

# 공간 시스템

## 개요

**공간 꾸미기가 유저 유입의 핵심 전략이다.** 귀여운 아이템으로 "내 안식처"를 만드는 경험을 제공한다.

## 도메인 모델

### Space

| 속성 | 타입 | 설명 |
|------|------|------|
| id | Long | PK |
| userId | Long | 소유자 (ID 참조, FK 아님) |
| isDefault | boolean | 기본 공간 여부 |
| theme | SpaceTheme | 공간 테마 (현재 DEFAULT만) |

### SpaceTheme (Enum)

현재 `DEFAULT`만 존재. 향후 테마 추가 예정.

### SpacePlacement (DB 스키마만 존재, 코드 미구현)

| 속성 | 타입 | 설명 |
|------|------|------|
| spaceId | Long | 배치된 공간 |
| itemDefinitionId | Long | 배치된 아이템 (Economy 도메인) |
| positionX, positionY | int | 배치 좌표 |

## 생성 흐름

```
회원가입 → Kafka "user.registered"
  → UserRegisteredEventConsumer (멱등성 보장)
  → InitializeUserVillageService
    → Character 생성 + Space(isDefault=true, theme=DEFAULT) 생성
```

## API

| 엔드포인트 | 설명 | 게스트 |
|-----------|------|--------|
| `GET /api/v1/village/spaces/me` | 내 기본 공간 조회 | 403 |

## 향후 계획

- SpacePlacement 도메인 구현 (아이템 배치/제거)
- 테마 추가 (SpaceTheme 확장)
- Phaser.js에서 공간 렌더링 + 아이템 드래그&드롭 배치
