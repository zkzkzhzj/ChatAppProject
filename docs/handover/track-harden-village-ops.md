# Track: harden-village-ops

> 작업 영역: 백엔드 운영 P1 — `UserRegisteredEventConsumer` idempotency release + `JWT_SECRET` 폴백 제거
> 시작일: 2026-05-17
> Issue: #92 (gh issue create + label `track:harden-village-ops`)
> 브랜치: `fix/harden-village-ops` (main 기준 분기)
> Spec: [docs/specs/features/harden-village-ops.md](../specs/features/harden-village-ops.md)
> 사전 ADR: PR #91 `full-review-agent` 결과 (운영 리스크 Top 5 R1·R2·R3)

## 0. 한 줄 요약

PR #91 종합 점검에서 발견된 **운영 P1 두 개** 처치 — 회원가입 이벤트 영구 유실 가능성 (idempotency marker leak) + JWT 토큰 위조 위험 (운영 폴백 노출).

## 0.5 Acceptance Criteria

- [ ] `UserRegisteredEventConsumer.handle` catch 블록에 `idempotencyGuard.release(idempotencyKey)` 호출 — `ConversationSummaryEventConsumer:103-107` 패턴 복사
- [ ] 회원가입 재배달 시나리오 통합 테스트 (Kafka 재발행 후 character/space 정상 생성)
- [ ] `application.yml` `JWT_SECRET` 폴백 0 + `@ConfigurationProperties` `@Validated` `@NotBlank` `@Size(min=64)`
- [ ] `docker-compose.yml` `JWT_SECRET=${JWT_SECRET}` 폴백 0 (운영 `.env` 누락 시 fail-fast)
- [ ] identity/village 도메인 동시성 unit test 2개 이상 신규 (Testcontainers 사용)
- [ ] JaCoCo coverage minimum ≥ 0.50 복원

## 1. 배경 / 왜

PR #91 (`ctx-refresh-post-village-3d`) 의 `full-review-agent` 가 잡은 운영 리스크 Top 5 중 **P1 두 개**:

- **R1**: `UserRegisteredEventConsumer.handle:46-67` — `tryAcquire()` REQUIRES_NEW 독립 커밋 후 JSON 파싱/실행 예외 시 marker 영구 잔존 → Kafka 재배달도 비즈니스 로직 스킵 → character/space 영원히 미생성 → 첫 로그인 500.
- **R2**: `application.yml:55-56` + `docker-compose.yml:172` JWT_SECRET 폴백 — 운영 `.env` 누락 시 GitHub public repo 의 평문 키로 서명·검증 → 누구나 토큰 위조 가능.
- **R3** (P2 → 본 트랙 동봉): identity/village 도메인 unit test 0건 — 회원가입 동시성 catch 로직이 Cucumber 결박 결박 결박 결박 결박 결박 결박. 회귀 감지 늦음. R1/R2 fix 후 추가.

관련 learning: 작성 예정 (트랙 종료 시)
관련 spec: 본 트랙 spec
관련 incident: 없음 (full-review-agent 가 예방 차원에서 발견)

## 2. 전체 로드맵 (1 step = 1 PR)

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 1 | UserRegisteredEventConsumer.release + Kafka 재배달 시나리오 테스트 | — | 대기 | #92 | — |
| 2 | JWT_SECRET 폴백 제거 + ConfigurationProperties Validated NotBlank Size(min=64) | step1 | 대기 | #92 | — |
| 3 | identity/village 동시성 unit test + JaCoCo 0.40→0.50 복원 | step1 | 대기 | #92 | — |

## 3. 현재 단계 상세

**트랙 미시작** — PR #91 머지 후 시작 권장. `/track-start harden-village-ops` 또는 수동:

1. `gh label create track:harden-village-ops` + `gh issue create`
2. `docs/handover/INDEX.md` 활성 표 1행 추가 (#92 → 발급된 #N)
3. `docs/learning/RESERVED.md` 80~82 예약 (이미 pre-scaffold 됨)
4. `git checkout -b fix/harden-village-ops origin/main` (PR #91 머지 후 main 기준)
5. Step 1 진입

## 4. 충돌 위험 파일

**Tier 1** (공유):
- `application.yml` — 다른 트랙도 수정 가능. JWT 영역만 처치.
- `docker-compose.yml` — 운영 영향. JWT 영역만 처치.
- `build.gradle.kts` — JaCoCo minimum 값만 수정.

**Tier 2** (도메인 분리):
- `backend/.../village/adapter/in/messaging/UserRegisteredEventConsumer.java`
- `backend/.../global/security/JwtProperties.java` (신규 또는 보강)
- `backend/src/test/java/.../identity/` + `village/` 신규 동시성 test

## 5. 다음 세션 착수 전 확인 사항

- **PR #91 머지 여부 확인** (CodeRabbit/Codex 리뷰 통과 + 사용자 머지)
- **운영 EC2 `.env` 의 `JWT_SECRET` 사전 점검** — Step 2 배포 시 누락이면 fail-fast 발생. 배포 전 EC2 SSH 결박 결박 결박 결박.
- `ConversationSummaryEventConsumer:103-107` 코드 Read — release 패턴 정확히 복사
- main 기준 분기 — 현재 head detached/lockfile branch 결박 결박 결박 결박

## 6. 보류 메모

- nginx 설정 IaC (full-review P2 R4) — 별도 트랙 `infra-nginx-iac`
- 다른 운영 P2/P3 (`ChatMessageHandler` V1 잔존, `@Deprecated` 메서드 정리, V1 schema 미사용 테이블 명시 등) — 별도 클린업 트랙 `infra-cleanup-v1-legacy`
- DLT (Dead Letter Topic) 결박 결박 결박 결박 결박 — D1 재검토 트리거 도달 시점 (회원가입 실패율 > 0.5%)
