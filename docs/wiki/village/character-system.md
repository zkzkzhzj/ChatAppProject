---
title: 캐릭터 시스템
tags: [village, character, equipment, sprite]
related: [village/space-system.md, identity/guest-policy.md]
last-verified: 2026-04-13
---

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

## 향후 계획

- CharacterEquipment 도메인 구현 (장비 장착/해제)
- Phaser.js에서 캐릭터 스프라이트 렌더링 + 장비 반영
- 캐릭터 이동 애니메이션
