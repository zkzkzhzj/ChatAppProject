# REST API 공통 규칙 — 마음의 고향

---

## 인증

인증이 필요한 엔드포인트는 HTTP 요청 헤더에 JWT Bearer 토큰을 포함해야 한다.

```
Authorization: Bearer <accessToken>
```

토큰은 `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, 또는 `POST /api/v1/auth/guest`로 발급받는다.

---

## Base URL

```
/api/v1
```

---

## 에러 응답 형식

모든 에러는 아래 형식으로 반환한다.

```json
{
  "errorCode": "IDENTITY_001",
  "message": "이미 사용 중인 이메일입니다",
  "timestamp": "2026-04-15T12:00:00.000Z"
}
```

| HTTP Status | 의미 |
|-------------|------|
| 400 | 요청 형식 오류, 유효성 검증 실패 |
| 401 | 인증 없음 (토큰 미포함 또는 만료) |
| 403 | 권한 없음 (게스트 접근 제한 등) |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 이메일 등) |
| 500 | 서버 내부 오류 |

---

## 에러 코드 목록

| 코드 | HTTP | 도메인 | 설명 |
|------|------|--------|------|
| IDENTITY_001 | 409 | Identity | 이미 사용 중인 이메일 |
| IDENTITY_002 | 401 | Identity | 이메일 또는 비밀번호가 올바르지 않음 |
| VILLAGE_001 | 404 | Village | 캐릭터 없음 |
| VILLAGE_002 | 404 | Village | 공간 없음 |
| VILLAGE_003 | 403 | Village | 게스트는 개인 공간 없음 |
| COMM_001 | 404 | Communication | 채팅방 없음 |
| COMM_002 | 403 | Communication | 해당 채팅방의 참여자가 아님 |
| COMM_003 | 403 | Communication | 게스트는 채팅 불가 |
| COMM_004 | 400 | Communication | 메시지 내용이 비어있거나 허용 길이(1000자) 초과 |
| VALIDATION_ERROR | 400 | 공통 | 요청 필드 유효성 오류 |
| INTERNAL_SERVER_ERROR | 500 | 공통 | 서버 내부 오류 |
