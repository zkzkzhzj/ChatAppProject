# Track: baseline-reset-cleanup

> 작업 영역: DB baseline reset + deprecated/stale source/docs cleanup
> 시작일: 2026-07-02
> Issue: none
> 브랜치: `cleanup/baseline-reset`
> Spec: [docs/specs/features/baseline-reset-cleanup.md](../specs/features/baseline-reset-cleanup.md)

## 0. 한 줄 요약

로컬/개발 DB reset 전제로 과거 migration 이력, deprecated source, stale 작업 문서를 현재 MVP 기준선으로 정리한다.

## 0.5 Acceptance Criteria

- [x] 새 DB가 단일 baseline migration으로 생성된다.
- [x] 참조 없는 deprecated backend source가 제거된다.
- [x] Phaser/2D stale frontend 문서와 주석이 현재 Three.js 기준으로 정리된다.
- [x] stale active track과 obsolete working artifact가 정리된다.
- [x] backend/frontend/docs 검증이 통과한다.

## 1. 배경 / 왜

다음 기능 작업 전에 과거 개인화/Economy/Phaser/legacy migration 잔재가 active context를 흐리지 않도록 기준선을 재설정한다.
기존 로컬/개발 DB 데이터는 보존하지 않는다.

## 2. 전체 로드맵

| Step | 내용 | 의존 | 상태 | 이슈 | Commit |
|------|------|------|------|------|--------|
| 1 | track/spec 시작 | — | 완료 | none | `9a70de9` |
| 2 | DB baseline reset | step1 | 완료 | none | `2ad6516` |
| 3 | backend deprecated 정리 | step2 | 완료 | none | `fd9a08b`, `5268857` |
| 4 | frontend stale 정리 | step3 | 완료 | none | `ab21d03`, `2af9951` |
| 5 | docs stale 정리 | step4 | 완료 | none | `f13140e`, `9deb16e` |
| 6 | 최종 검증 | step5 | 완료 | none | 검증 커밋 |

## 3. 현재 단계 상세

Step 6 완료. 단일 baseline migration, deprecated backend source 제거, frontend stale 문구 정리, obsolete working artifact 정리를 마쳤다.

검증 결과:

- `docker compose -f deploy\docker-compose.yml down -v`
- `docker compose -f deploy\docker-compose.yml up -d postgres redis kafka cassandra cassandra-init`
- backend `.\gradlew.bat --no-daemon check`
- backend `.\gradlew.bat --no-daemon bootRun` 후 compose PostgreSQL `flyway_schema_history`에서 `V1__initial_schema.sql` success `true` 확인
- frontend `npx.cmd tsc --noEmit`
- frontend `npm.cmd run lint`
- frontend `npm.cmd run test:run` 완료: 27 files, 187 tests
- stale/deprecated scan 완료: 활성 소스에는 삭제 대상 표현이 남지 않았고, 남은 언급은 설계/학습/이력 문서 맥락이다.

## 4. 충돌 위험 파일

- `backend/src/main/resources/db/migration/**`
- `backend/src/main/java/com/maeum/gohyang/global/infra/idempotency/IdempotencyGuard.java`
- `backend/src/main/java/com/maeum/gohyang/identity/**`
- `frontend/src/lib/websocket/**`
- `docs/handover/**`
- `docs/wiki/**`
- `docs/reviews/**`
- `docs/superpowers/**`

## 5. 다음 세션 착수 전 확인 사항

- 기존 DB 데이터 보존은 범위 밖이다.
- `main`이 다른 worktree에서 사용 중이면 현재 `cleanup/baseline-reset` 브랜치에서 계속 진행한다.
- 로컬 DB를 재사용하다 Flyway 이력 충돌이 나면 `docs/wiki/infra/docker-local.md`의 volume reset 절차를 따른다.

## 6. 보류 메모

- 운영 DB 보존 migration이 필요해지는 순간 이 트랙은 중단하고 별도 migration 전략을 세운다.
