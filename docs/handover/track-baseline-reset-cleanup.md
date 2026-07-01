# Track: baseline-reset-cleanup

> 작업 영역: DB baseline reset + deprecated/stale source/docs cleanup
> 시작일: 2026-07-02
> Issue: none
> 브랜치: `cleanup/baseline-reset`
> Spec: [docs/specs/features/baseline-reset-cleanup.md](../specs/features/baseline-reset-cleanup.md)

## 0. 한 줄 요약

로컬/개발 DB reset 전제로 과거 migration 이력, deprecated source, stale 작업 문서를 현재 MVP 기준선으로 정리한다.

## 0.5 Acceptance Criteria

- [ ] 새 DB가 단일 baseline migration으로 생성된다.
- [ ] 참조 없는 deprecated backend source가 제거된다.
- [ ] Phaser/2D stale frontend 문서와 주석이 현재 Three.js 기준으로 정리된다.
- [ ] stale active track과 obsolete working artifact가 정리된다.
- [ ] backend/frontend/docs 검증이 통과한다.

## 1. 배경 / 왜

다음 기능 작업 전에 과거 개인화/Economy/Phaser/legacy migration 잔재가 active context를 흐리지 않도록 기준선을 재설정한다.
기존 로컬/개발 DB 데이터는 보존하지 않는다.

## 2. 전체 로드맵

| Step | 내용 | 의존 | 상태 | 이슈 | Commit |
|------|------|------|------|------|--------|
| 1 | track/spec 시작 | — | 진행 중 | none | 실행 후 기입 |
| 2 | DB baseline reset | step1 | 대기 | none | 실행 후 기입 |
| 3 | backend deprecated 정리 | step2 | 대기 | none | 실행 후 기입 |
| 4 | frontend stale 정리 | step3 | 대기 | none | 실행 후 기입 |
| 5 | docs stale 정리 | step4 | 대기 | none | 실행 후 기입 |
| 6 | 최종 검증 | step5 | 대기 | none | 실행 후 기입 |

## 3. 현재 단계 상세

Step 1 진행 중. 승인된 설계 문서는 `docs/superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md`.

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

## 6. 보류 메모

- 운영 DB 보존 migration이 필요해지는 순간 이 트랙은 중단하고 별도 migration 전략을 세운다.
