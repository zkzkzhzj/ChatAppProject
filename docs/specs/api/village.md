# API 명세 - Village

> Base URL: `/api/v1/village`
> 공통 규칙: `overview.md` 참조

Village API는 런타임 마을/도서관 경험을 보조하는 방문 집계, 대시보드, 건의 표면만 제공한다. 기본 아바타와 위치 공유는 WebSocket 런타임 상태이며 DB에 저장되는 사용자별 설정 API를 제공하지 않는다.

---

## POST `/api/v1/village/visits/today` - 오늘 방문 기록

인증 필요. 회원과 게스트 모두 가능하다. 서버는 `AuthenticatedUser.displayId()`를 방문자 키로 사용하고, KST 기준 오늘 날짜에 대해 `(visit_date, visitor_key)` unique insert로 하루 1회만 집계한다.

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
| guestCount | long | 오늘 게스트 방문 수 |
| memberCount | long | 오늘 회원 방문 수 |
| totalCount | long | 오늘 전체 방문 수 |
| confessionCount | long | 오늘 등록된 고백 수 |

---

## GET `/api/v1/village/dashboard/today` - 오늘 대시보드 조회

인증 없이 조회 가능하다. 마을 입구 대시보드에 표시할 오늘 집계 정보를 반환한다.

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

## GET `/api/v1/village/suggestions` - 건의 게시글 조회

인증 없이 조회 가능하다. 사용자가 남긴 최근 건의사항을 반환한다.

| Query | 타입 | 기본값 | 제약 |
|-------|------|--------|------|
| limit | int | 20 | 1~50 |

**Response** `200 OK`

```json
[
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
]
```

---

## POST `/api/v1/village/suggestions` - 건의사항 등록

인증 필요. 로그인한 회원만 등록 가능하며 게스트는 조회만 가능하다.

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
| VILLAGE_004 | 400 | 제목이나 내용이 비어 있거나 길이 제한 초과 |
| VILLAGE_005 | 403 | 게스트 또는 미인증 사용자가 등록 시도 |
