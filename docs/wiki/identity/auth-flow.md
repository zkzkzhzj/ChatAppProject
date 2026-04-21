---
title: 인증 흐름
tags: [identity, jwt, security, guest]
related: [identity/guest-policy.md]
last-verified: 2026-04-13
---

# 인증 흐름

## 인증 방식

JWT 기반 토큰 인증. Spring Security + 커스텀 `JwtFilter`로 구현.

### 토큰 구성

| 항목 | 값 | 설정 위치 |
|------|-----|----------|
| Access Token 만료 | 1시간 | `jwt.access-token-expiry-ms` |
| Refresh Token 만료 | 7일 | `jwt.refresh-token-expiry-ms` |
| 서명 알고리즘 | HS256 | JJWT 0.12.6 |
| Secret | 환경변수 주입 | `jwt.secret` |

### JwtFilter 동작

1. `Authorization: Bearer <token>` 헤더에서 토큰 추출
2. `JwtProvider.parse()` ��� `Optional<AuthenticatedUser>` 반환
3. ��효하면 `SecurityContext`에 저장
4. 유효하지 않으면 Anonymous로 진행 (Spring Security가 접근 제어)

### 공개 경로 (인증 불필요)

`SecurityProperties`에서 관리 (`application.yml`):

```text
/api/v1/auth/register    — 회원가입
/api/v1/auth/login       — 로그인
/api/v1/auth/guest       — 게스트 토큰 발급
/ws/**                   — WebSocket 연결
/swagger-ui/**           — Swagger UI
/v3/api-docs/**          — OpenAPI 명세
```

Docker 환경에서는 `/actuator/health`가 추가로 공개.

## 유저 타입 분기

| 타입 | 생성 방식 | DB 저장 | 토큰 발급 |
|------|---------|---------|----------|
| MEMBER | 이메일 회원가입 | `users` + `user_local_auth` | Access만 (Refresh 미구현) |
| GUEST | `/api/v1/auth/guest` 호출 | DB 저장 없음 (JWT subject에 guest-UUID) | Access만 |

## 회원가입 흐름

```text
POST /api/v1/auth/register
  → RegisterUserService
    → 이메일 중복 확인 (CheckEmailDuplicatePort)
    → User(MEMBER) + LocalAuthCredentials 저장
    → Outbox에 user.registered 이벤트 저장 (같은 트랜잭션)
    → JWT 발급 후 반환
  → OutboxKafkaRelay (1초 주기)
    → Kafka "user.registered" 발행
    → Village에서 캐릭터/공간 자동 생성
```

## 핵심 코드 위치

| 파일 | 역할 |
|------|------|
| `identity/adapter/in/security/JwtProvider.java` | 토큰 생성/검증 |
| `identity/adapter/in/security/JwtFilter.java` | 요청별 인증 필터 |
| `identity/adapter/in/security/SecurityConfig.java` | Security 설정 |
| `identity/adapter/in/security/SecurityProperties.java` | 공개 경로 관리 |
| `global/security/AuthenticatedUser.java` | 인증된 유저 record |
