# API 명세 — Identity

> Base URL: `/api/v1/auth`
> 공통 규칙: `overview.md` 참조

---

## POST `/api/v1/auth/register` — 이메일 회원가입

인증 불필요 (Public).

회원가입 완료 시 `user.registered` Kafka 이벤트가 발행되어 캐릭터와 공간이 비동기로 생성된다.

**Request**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| email | String | 필수, 이메일 형식 |
| password | String | 필수, 8~64자 |

**Response** `201 Created`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**에러**

| 코드 | HTTP | 사유 |
|------|------|------|
| IDENTITY_001 | 409 | 이미 사용 중인 이메일 |
| VALIDATION_ERROR | 400 | 필드 형식 오류 |

---

## POST `/api/v1/auth/guest` — 게스트 토큰 발급

인증 불필요 (Public). DB 저장 없음.

발급된 JWT의 claim에 `role=GUEST`가 포함된다.
게스트 토큰으로는 채팅, 공간 조회 등 일부 기능이 제한된다.

**Request** 없음

**Response** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```
