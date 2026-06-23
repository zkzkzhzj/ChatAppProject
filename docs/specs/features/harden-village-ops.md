---
feature: harden-village-ops
track: harden-village-ops
issue: "#92 (트랙 시작 시 gh issue create)"
status: superseded
created: 2026-05-17
last-updated: 2026-06-23
---

# 운영 안정성·보안 강화 — 과거 Village 초기화 consumer release + JWT_SECRET 폴백 제거

> 2026-06-23 issue #151 이후 저장형 개인 캐릭터/공간 생성 흐름이 제거되어,
> 이 문서의 Village 초기화 consumer 보강 범위는 superseded 됐다.
> JWT_SECRET 폴백 제거 문제는 별도 보안 트랙에서 다시 다룰 수 있지만, 이 spec을 그대로 실행하지 않는다.

---

## 1. Outcomes

- **superseded** — 회원가입 이벤트로 저장형 Village record를 만들던 과거 흐름 보강
- **JWT 토큰 위조 위험 차단** — 운영 `.env` 에서 `JWT_SECRET` 누락 시 fail-fast (현재는 GitHub public repo 의 평문 폴백 키로 서명·검증 가능 — 누구나 토큰 위조)
- **회원가입 동시성 시나리오 unit test 신규** — identity/village 도메인 unit test 0건 부분 해결
- (가능하면) JaCoCo 0.40 → 0.50 복원

## 2. Scope

### 2.1 In

- 과거 Village 초기화 consumer catch 블록에 `idempotencyGuard.release(idempotencyKey)` 추가 (`ConversationSummaryEventConsumer:103-107` 패턴 복사) — issue #151 이후 현재 실행 대상 아님
- `application.yml:55-56` JWT_SECRET 폴백 제거 + `@ConfigurationProperties` + `@Validated` + `@NotBlank` 또는 `application-prod` profile 분리 fail-fast
- `docker-compose.yml:172` JWT_SECRET 폴백 제거 — 운영 `.env` 누락 시 컨테이너 기동 실패
- 회원가입 동시성 시나리오 unit test (`RegisterUserServiceConcurrencyTest`) — 동일 email 동시 요청 / Kafka 재배달 시 멱등성
- (가능하면) `backend/build.gradle.kts:164` JaCoCo 0.40 → 0.50 복원 검증 (테스트 추가 후)

### 2.2 Out

- nginx 설정 IaC 화 (full-review-agent 의 P2 — 별도 트랙 `infra-nginx-iac`)
- identity/village 도메인 unit test 전반 보강 (본 트랙은 동시성 시나리오만)
- 다른 운영 P2/P3 (예: ChatMessageHandler V1 잔존 정리 / `@Deprecated` 메서드 정리) — 별도 클린업 트랙

## 3. Constraints

| 차원 | 제약 |
|------|------|
| 성능 | release() 호출 추가 — Redis 호출 1회. 영향 미미. |
| 비용 | 영향 X |
| 시간 | 2~3일 (3 step) |
| 인프라 | 운영 `.env` 의 JWT_SECRET 사전 확인 필수 — 누락 시 배포 실패. 배포 전 EC2 .env 점검 권고. |
| 정책/규제 | 보안 강화 — 평문 secret 제거는 OWASP / 12-factor 표준 |

## 4. Decisions

### D1. [동시성·멱등성] idempotency marker release 시점 — Outbox 패턴 결합 검토

- **왜**: `tryAcquire()` 가 REQUIRES_NEW 로 독립 커밋되므로 marker 가 영구 잔존. catch 시 `release()` 호출이 표준 패턴 (다른 consumer 가 이미 적용).
- **대안**:
  - DLT (Dead Letter Topic) 결로 처리 — 별도 Kafka consumer + 운영 모니터링 필요. 본 트랙 스코프 초과.
  - retry 횟수 제한 + 영구 실패 시 운영 알람 — 본 트랙은 release 만 처치, 운영 알람은 ai-observability 트랙에서.
- **빈틈**: release 후 재배달이 와도 동일 예외 반복 가능 — root cause (JSON 파싱 / DB 등) 별도 해결 필요. 본 트랙은 멱등성만 보장.
- **재검토 트리거**: 회원가입 실패율 > 0.5% / Kafka consumer lag 누적 시 DLT 도입 검토.

### D2. [보안] JWT_SECRET 폴백 처치 — `application-prod.yml` 분리 vs `@NotBlank` 단일 파일

- **왜**: `@NotBlank` + `@Validated` 가 단일 파일 정책 (handover.md 결정 — `application.yml` + `${ENV_VAR:로컬_기본값}` 12-factor) 유지하면서 운영 fail-fast. application-prod.yml 신설은 단일 파일 정책 깨짐.
- **대안**:
  - application-prod.yml 신설 — 정책 위반.
  - 폴백 그대로 두고 운영 .env 만 강제 — 현재 상태 = 위험.
- **빈틈**: `@NotBlank` 가 빈 문자열 + null 만 차단. 짧은 문자열 (256bit 미만) 은 통과. 추가 `@Size(min = 64)` 검토.
- **재검토 트리거**: 보안 감사 (SOC2 / ISO27001 등) 도입 시점 / JWT 라이브러리 메이저 업그레이드.

### D3. [테스트] 동시성 unit test — Testcontainers 결합 vs mock 결박

- **왜**: 동일 email 동시 INSERT 시 UNIQUE 제약 + `DataIntegrityViolationException` catch 검증은 실제 PostgreSQL 결박 결박 결박 — Testcontainers 필수.
- **대안**: 단순 mock — DataIntegrityViolationException 시뮬레이션만 가능, 실제 race condition 검증 X.
- **빈틈**: Testcontainers 시동 시간 ↑ (CI 5~10초 추가). 본 트랙 정당화.
- **재검토 트리거**: CI 전체 시간 > 10분 시 동시성 테스트만 별도 profile 분리.

## 5. Tasks (= Steps)

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 1 | superseded — 과거 Village 초기화 consumer catch 블록 `idempotencyGuard.release()` 추가 + Cucumber/unit 시나리오 (Kafka 재배달) | — | 제거된 Village 초기화 consumer + test | #92 | TBD |
| 2 | JWT_SECRET 폴백 제거 — `application.yml` + `docker-compose.yml` + `@ConfigurationProperties` + `@Validated` `@NotBlank` `@Size(min=64)` | step1 | `backend/src/main/resources/application.yml`, `deploy/docker-compose.yml`, `backend/.../global/security/JwtProperties.java` | #92 | TBD |
| 3 | 회원가입 동시성 unit test (`RegisterUserServiceConcurrencyTest`) + JaCoCo 0.40 → 0.50 복원 검증 | step1 | `backend/src/test/java/.../identity/` + `backend/build.gradle.kts` | #92 | TBD |

## 6. Verification

- [ ] superseded — 과거 Village 초기화 consumer `release(idempotencyKey)` 검증
- [ ] `application.yml` `JWT_SECRET` 폴백 0 (`${JWT_SECRET}` 단독 또는 `@NotBlank` 검증)
- [ ] `docker-compose.yml` `JWT_SECRET=${JWT_SECRET}` 폴백 0
- [ ] 운영 `.env` 에 `JWT_SECRET` 누락 시 백엔드 컨테이너 fail-fast (기동 실패 + 명확한 에러 메시지)
- [ ] identity/village 도메인 동시성 unit test 2개 이상 신규 (Testcontainers 결박 결박)
- [ ] JaCoCo coverage minimum ≥ 0.50 (테스트 추가 후 복원)

## 7. References

- 트랙 파일: [track-harden-village-ops.md](../../handover/track-harden-village-ops.md)
- 1차 출처: PR #91 `full-review-agent` 결과 (운영 리스크 Top 5 의 R1·R2·R3)
- 관련 코드:
  - 제거된 과거 Village 초기화 consumer
  - `backend/src/main/java/com/maeum/gohyang/communication/adapter/in/messaging/ConversationSummaryEventConsumer.java:103-107` (패턴 베이스)
  - `backend/src/main/resources/application.yml:55-56`
  - `deploy/docker-compose.yml:172`
  - `backend/build.gradle.kts:164`
- 관련 learning: 작성 예정 (트랙 종료 시 — idempotency marker leak 패턴 + JWT secret 관리 fail-fast)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-17 | Pre-scaffold (트랙 `ctx-refresh-post-village-3d` PR #91 동봉) — 다음 세션 진입용 |
