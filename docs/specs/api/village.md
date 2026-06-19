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
  "theme": "DEFAULT",
  "createdAt": "2026-04-08T12:00:00",
  "updatedAt": "2026-04-08T12:00:00"
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| id | Long | 공간 ID |
| userId | Long | 소유자 ID |
| isDefault | boolean | 기본 공간 여부 |
| theme | SpaceTheme | `DEFAULT` (현재 구현). `FOREST` / `OCEAN` / `CITY`는 공간 꾸미기 Phase에서 추가 예정 |
| createdAt | LocalDateTime | |
| updatedAt | LocalDateTime | |

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| VILLAGE_003 | 403 | 게스트는 개인 공간 없음 |
| VILLAGE_002 | 404 | 공간 미존재 (정상 상태에서는 가입 즉시 생성됨) |

---

## POST `/api/v1/village/visits/today` -- 오늘 방문 기록

인증 필요. 회원과 게스트 모두 가능하다. 서버는 `AuthenticatedUser.displayId()`를 방문자 키로 사용하고,
KST 기준 오늘 날짜에 대해 `(visit_date, visitor_key)` unique insert로 하루 1회만 집계한다.

**Response** `200 OK`

```json
{
  "date": "2026-06-19",
  "added": true,
  "guestCount": 7,
  "memberCount": 3,
  "totalCount": 10,
  "confessionCount": 4
}
```

| 필드 | 타입 | 비고 |
|------|------|------|
| date | LocalDate | KST 기준 집계일 |
| added | boolean | 이번 호출에서 새 방문으로 추가됐는지 |
| guestCount | long | 오늘 방문한 손님 수 |
| memberCount | long | 오늘 방문한 이웃 수 |
| totalCount | long | 오늘 총 방문 수 |
| confessionCount | long | 오늘 등록된 마음 수 |

---

## GET `/api/v1/village/dashboard/today` -- 오늘 전광판 조회

인증 없이 조회 가능하다. 마을 입구 전광판에 표시할 오늘 집계 정보를 반환한다.

**Response** `200 OK`

```json
{
  "date": "2026-06-19",
  "guestCount": 7,
  "memberCount": 3,
  "totalCount": 10,
  "confessionCount": 4
}
```

---

## GET `/api/v1/village/suggestions` -- 건의 게시판 조회

인증 없이 조회 가능하다. 누구나 최근 건의사항을 볼 수 있다.

| Query | 타입 | 기본값 | 제약 |
|-------|------|--------|------|
| limit | int | 20 | 1~50 |

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "authorType": "GUEST",
    "title": "건의 제목",
    "body": "건의 내용",
    "status": "OPEN",
    "adminComment": null,
    "createdAt": "2026-06-19T12:00:00",
    "updatedAt": "2026-06-19T12:00:00"
  }
]
```

---

## POST `/api/v1/village/suggestions` -- 건의사항 등록

인증 필요. 로그인한 회원만 등록 가능하다. 게스트는 조회만 가능하며 댓글/답변 입력은 아직 열지 않는다.

**Request**

```json
{
  "title": "건의 제목",
  "body": "건의 내용"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| title | String | 필수, 최대 120자 |
| body | String | 필수, 최대 1000자 |

**Response** `201 Created`

```json
{
  "id": 1,
  "authorType": "MEMBER",
  "title": "건의 제목",
  "body": "건의 내용",
  "status": "OPEN",
  "adminComment": null,
  "createdAt": "2026-06-19T12:00:00",
  "updatedAt": "2026-06-19T12:00:00"
}
```

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| VILLAGE_004 | 400 | 제목/내용이 비어 있거나 길이 제한 초과 |
| VILLAGE_005 | 403 | 게스트 또는 미인증 사용자가 등록 시도 |
