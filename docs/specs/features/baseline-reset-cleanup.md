---
type: Feature Spec
feature: baseline-reset-cleanup
track: baseline-reset-cleanup
issue: "none"
status: active
created: 2026-07-02
last-updated: 2026-07-02
---

# 기준선 재설정 클린업

> 이 spec 은 트랙 `baseline-reset-cleanup` 의 요구사항 진실이다.
> 진행 상태는 `docs/handover/track-baseline-reset-cleanup.md`, 설계 근거는
> `docs/superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md`를 따른다.
> 프로젝트 내부 spec/track/설계 문서는 한국어로 작성한다.

## 1. Outcomes

- 새 로컬/개발 DB가 과거 migration 없이 현재 MVP 스키마로 생성된다.
- 삭제된 기능의 source, deprecated compatibility class, stale 문서가 active context에서 사라진다.
- 다음 기능 트랙이 현재 제품 기준만 보고 시작할 수 있다.

## 2. Scope

### 2.1 In

- Flyway migration을 reset baseline으로 재구성한다.
- 참조 없는 deprecated backend source를 제거한다.
- Phaser/2D 시대 stale frontend 문서와 주석을 현재 Three.js 기준으로 정리한다.
- stale handover active track과 오래된 working artifact를 정리한다.

### 2.2 Out

- 기존 PostgreSQL 데이터 보존
- 기존 Flyway history에서 새 baseline으로의 무중단 업그레이드
- 새 제품 기능 추가
- ADR과 learning note의 무차별 삭제

## 3. Constraints

| 차원 | 제약 |
|------|------|
| DB | 로컬/개발 DB volume reset을 전제한다. |
| 운영 | 운영 데이터 보존 migration으로 사용하지 않는다. |
| 문서 | 현재 지시 문서와 역사 기록을 구분한다. |
| 범위 | 삭제 전 active import, route, test, 문서 링크를 확인한다. |

## 4. Decisions

### D1. [DB 스키마] 단일 baseline migration으로 재구성

- **왜**: 과거 cleanup/noop/drop migration은 현재 제품 이해를 방해한다.
- **대안**:
  - 기존 V1~V11 보존 — 안전하지만 잔재 정리 목표와 충돌한다.
  - 기존 DB upgrade migration 추가 — 데이터가 없다는 사용자 전제와 맞지 않는다.
- **빈틈**: 기존 DB volume을 재사용하면 Flyway 이력 충돌이 난다.
- **재검토 트리거**: 보존해야 할 운영 DB가 생기는 경우.

### D2. [문서 정리] learning/ADR은 보존, working artifact는 정리

- **왜**: learning/ADR은 결정 맥락이고, plan/review/handover stale 파일은 현재 작업 컨텍스트를 흐린다.
- **대안**:
  - 모든 역사 삭제 — 결정 이유까지 사라진다.
  - 모든 문서 보존 — 다음 세션 context 비용이 계속 증가한다.
- **빈틈**: 일부 review 문서에만 남은 유용한 지식이 있을 수 있다.
- **재검토 트리거**: 삭제 후보가 active spec, wiki, learning에서 링크되는 경우.

## 5. Tasks

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | Commit |
|------|------|------|---------------|------|--------|
| 1 | track/spec 시작 | — | docs/specs, docs/handover | none | `9a70de9` |
| 2 | DB baseline reset | step1 | backend/src/main/resources/db/migration | none | `2ad6516` |
| 3 | backend deprecated 정리 | step2 | backend/src/main/java, docs/wiki/infra | none | `fd9a08b`, `5268857` |
| 4 | frontend stale 정리 | step3 | frontend/src, docs/wiki/frontend | none | `ab21d03`, `2af9951` |
| 5 | docs stale 정리 | step4 | docs/handover, docs/reviews, docs/superpowers | none | `f13140e`, `9deb16e` |
| 6 | 최종 검증 | step5 | docs/handover, verification | none | 검증 커밋 |

## 6. Verification

- [x] 빈 DB에서 baseline migration 적용 확인
- [x] `./gradlew.bat --no-daemon check` 통과
- [x] `npx tsc --noEmit` 통과
- [x] `npm.cmd run lint` 통과
- [x] stale/deprecated scan 결과가 의도한 역사 문서에만 남음

검증 기록:

- `docker compose -f deploy\docker-compose.yml down -v` 후 `up -d postgres redis kafka cassandra cassandra-init` 통과
- backend `.\gradlew.bat --no-daemon check` 통과
- backend `.\gradlew.bat --no-daemon bootRun`으로 compose PostgreSQL에 Flyway 적용 확인
- PostgreSQL `flyway_schema_history`: `V1__initial_schema.sql`, success `true`
- PostgreSQL public table: `users`, `user_local_auth`, `chat_room`, `participant`, `confession_letter`, `suggestion`, `outbox_event`, `processed_event`, `idempotency_request` 등 20개 확인
- frontend `npx.cmd tsc --noEmit` 통과
- frontend `npm.cmd run lint` 통과
- frontend `npm.cmd run test:run` 통과: 27 files, 187 tests
- stale/deprecated scan 통과: 활성 소스에는 삭제 대상 표현이 남지 않았고, 남은 언급은 설계/학습/이력 문서 맥락이다.

## 7. References

- 설계: [2026-07-02-baseline-reset-cleanup-design.md](../../superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md)
- DB 설정: [docker-local.md](../../wiki/infra/docker-local.md)
- Spec-driven 규칙: [spec-driven.md](../../conventions/spec-driven.md)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-07-02 | 초안 작성 |
| 2026-07-02 | 기준선 재설정 클린업 구현 및 검증 완료 |
