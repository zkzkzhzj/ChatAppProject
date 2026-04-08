# API 명세 — Village

> Base URL: `/api/v1/village`
> 공통 규칙: `overview.md` 참조

---

## GET `/api/v1/village/characters/me` — 내 캐릭터 조회

인증 선택 (게스트/회원 모두 허용).

- **게스트**: DB 저장 없이 임시 캐릭터 반환. `id`, `userId`, `updatedAt` 모두 `null`.
- **회원**: DB에 저장된 캐릭터 반환. 가입 직후 Kafka 이벤트로 자동 생성된다.

**Response** `200 OK`

```json
{
  "id": 1,
  "userId": 42,
  "updatedAt": "2026-04-08T12:00:00"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | Long | 게스트는 null |
| userId | Long | 게스트는 null |
| updatedAt | LocalDateTime | 게스트는 null |

---

## GET `/api/v1/village/spaces/me` — 내 공간 조회

인증 필요 (회원 전용). 게스트 접근 시 403.

회원 가입 직후 기본 공간이 자동 생성된다 (Kafka 이벤트 기반).

**Response** `200 OK`

```json
{
  "id": 1,
  "userId": 42,
  "isDefault": true,
  "theme": "FOREST",
  "createdAt": "2026-04-08T12:00:00",
  "updatedAt": "2026-04-08T12:00:00"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | Long | 공간 ID |
| userId | Long | 소유자 ID |
| isDefault | boolean | 기본 공간 여부 |
| theme | SpaceTheme | `FOREST` / `OCEAN` / `CITY` |
| createdAt | LocalDateTime | |
| updatedAt | LocalDateTime | |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| VILLAGE_003 | 403 | 게스트는 개인 공간 없음 |
| VILLAGE_002 | 404 | 공간 미존재 (정상 상태에서는 가입 즉시 생성됨) |
