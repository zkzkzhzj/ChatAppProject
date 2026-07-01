# 기준선 재설정 클린업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬/개발 DB reset 전제로 과거 migration 이력, deprecated 코드, stale frontend/docs 산출물을 제거하고 현재 MVP 기준선만 남긴다.

**Architecture:** DB는 누적 migration 대신 현재 스키마를 담은 단일 baseline migration으로 시작한다. 코드 정리는 참조 scan으로 확인된 미사용/deprecated 항목부터 제거하고, 문서 정리는 현재 지시 문서와 역사 기록을 분리한다.

**Tech Stack:** Java 21, Spring Boot 4, Flyway, PostgreSQL, Next.js, React, Three.js, Vitest, Gradle, markdownlint.

---

## 파일 구조와 책임

- Create: `docs/specs/features/baseline-reset-cleanup.md`  
  이번 cleanup track의 요구사항 정본. 승인된 설계 문서를 feature spec 형식으로 옮긴다.
- Create: `docs/handover/track-baseline-reset-cleanup.md`  
  cleanup 진행 상태와 commit 단위 작업 기록.
- Modify: `docs/handover/INDEX.md`  
  stale active track 제거, cleanup track 활성화, 오래된 잔존 track 정리 기준 반영.
- Replace: `backend/src/main/resources/db/migration/V1__initial_schema.sql`  
  현재 MVP 최종 스키마 baseline. 기존 파일명은 유지하되 내용은 baseline으로 재작성한다.
- Delete: `backend/src/main/resources/db/migration/V2__village_public_chat_room.sql` through `V11__drop_personalization_and_economy.sql`, plus `U10__village_board_and_visit.sql`  
  reset semantics 선택으로 과거 누적/cleanup/noop/drop migration 제거.
- Delete: `backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/JwtClaims.java`  
  `JwtProvider`가 `AuthenticatedUser`를 직접 반환하므로 참조 없는 compatibility class 제거.
- Delete: `backend/src/main/java/com/maeum/gohyang/identity/domain/UserType.java`  
  `global.security.UserType`으로 이동된 뒤 참조 없는 placeholder 제거.
- Modify: `backend/src/main/java/com/maeum/gohyang/global/infra/idempotency/IdempotencyGuard.java`  
  deprecated `isAlreadyProcessed`, `markAsProcessed` 제거. `tryAcquire`와 `release`만 남긴다.
- Modify: `docs/wiki/infra/outbox-pattern.md`  
  deprecated idempotency 메서드 설명 제거, 현재 `tryAcquire`/`release` 패턴만 문서화.
- Modify/Delete: `frontend/src/lib/websocket/positionBridge.ts`, `frontend/src/lib/websocket/useStomp.ts` comments, Phaser wiki/docs  
  코드가 아직 쓰이면 파일은 보존하되 Phaser 표현을 현재 Three.js/scene bridge 표현으로 교정한다.
- Delete or rewrite: `docs/wiki/frontend/phaser-setup.md`, related `docs/wiki/INDEX.md` entries  
  Phaser 현재 구조 문서는 삭제하거나 역사 문서로 이동한다. 현재 frontend wiki는 Three.js 구조만 가리키게 한다.
- Delete: stale working artifacts under `docs/reviews/**` and old `docs/superpowers/plans/**` only when no active spec/learning link depends on them.

---

### Task 1: Track과 Feature Spec 시작

**Files:**
- Create: `docs/specs/features/baseline-reset-cleanup.md`
- Create: `docs/handover/track-baseline-reset-cleanup.md`
- Modify: `docs/handover/INDEX.md`
- Reference: `docs/superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md`

- [ ] **Step 1: feature spec 작성**

Create `docs/specs/features/baseline-reset-cleanup.md`:

```markdown
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
| 1 | track/spec 시작 | — | docs/specs, docs/handover | none | 작업 시 |
| 2 | DB baseline reset | step1 | backend/src/main/resources/db/migration | none | 작업 시 |
| 3 | backend deprecated 정리 | step2 | backend/src/main/java, docs/wiki/infra | none | 작업 시 |
| 4 | frontend stale 정리 | step3 | frontend/src, docs/wiki/frontend | none | 작업 시 |
| 5 | docs stale 정리 | step4 | docs/handover, docs/reviews, docs/superpowers | none | 작업 시 |
| 6 | 최종 검증 | step5 | docs/handover, verification | none | 작업 시 |

## 6. Verification

- [ ] 빈 DB에서 baseline migration 적용 확인
- [ ] `.\gradlew.bat --no-daemon check` 통과
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm.cmd run lint` 통과
- [ ] stale/deprecated scan 결과가 의도한 역사 문서에만 남음

## 7. References

- 설계: [2026-07-02-baseline-reset-cleanup-design.md](../../superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md)
- DB 설정: [docker-local.md](../../wiki/infra/docker-local.md)
- Spec-driven 규칙: [spec-driven.md](../../conventions/spec-driven.md)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-07-02 | 초안 작성 |
```

- [ ] **Step 2: track 파일 작성**

Create `docs/handover/track-baseline-reset-cleanup.md`:

```markdown
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
```

- [ ] **Step 3: INDEX 활성 트랙 갱신**

Modify `docs/handover/INDEX.md`:

```markdown
## 활성 트랙 (Active)

| 트랙 ID | 파일 | 작업 영역 | 상태 | 이슈 | 시작일 |
|---------|------|-----------|------|------|--------|
| `baseline-reset-cleanup` | [track-baseline-reset-cleanup.md](./track-baseline-reset-cleanup.md) | DB baseline reset + deprecated/stale source/docs cleanup | 🔧 진행 중 | — | 2026-07-02 |
```

Also move `village-visual-pass` out of Active because PR #144 is merged. Add this row to Recently Closed:

```markdown
| `village-visual-pass` | 마을/사서방 3D 비주얼·상호작용 정리, 방문자/건의 게시판 API 추가 | 2026-06-19 | [PR #144](https://github.com/zkzkzhzj/ChatAppProject/pull/144) |
```

- [ ] **Step 4: 문서 lint 실행**

Run:

```powershell
npm.cmd run lint:md
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

Run:

```powershell
git add docs/specs/features/baseline-reset-cleanup.md docs/handover/track-baseline-reset-cleanup.md docs/handover/INDEX.md
git commit -m "docs: start baseline reset cleanup track"
```

Expected: commit succeeds.

---

### Task 2: DB Baseline Reset

**Files:**
- Modify: `backend/src/main/resources/db/migration/V1__initial_schema.sql`
- Delete: `backend/src/main/resources/db/migration/V2__village_public_chat_room.sql`
- Delete: `backend/src/main/resources/db/migration/V3__cleanup_legacy_chat_rooms.sql`
- Delete: `backend/src/main/resources/db/migration/V4__participant_unique_constraint.sql`
- Delete: `backend/src/main/resources/db/migration/V5__deprecated_conversation_memory_noop.sql`
- Delete: `backend/src/main/resources/db/migration/V6__deprecated_embedding_noop.sql`
- Delete: `backend/src/main/resources/db/migration/V7__confession_record.sql`
- Delete: `backend/src/main/resources/db/migration/V8__confession_letter_author_read_at.sql`
- Delete: `backend/src/main/resources/db/migration/V9__cleanup_legacy_npc_participants.sql`
- Delete: `backend/src/main/resources/db/migration/V10__village_board_and_visit.sql`
- Delete: `backend/src/main/resources/db/migration/U10__village_board_and_visit.sql`
- Delete: `backend/src/main/resources/db/migration/V11__drop_personalization_and_economy.sql`
- Modify: `docs/wiki/infra/docker-local.md`

- [ ] **Step 1: baseline SQL로 V1 교체**

Replace `backend/src/main/resources/db/migration/V1__initial_schema.sql` with:

```sql
-- =============================================================================
-- V1__initial_schema.sql
-- 마음의 고향 — reset baseline schema
-- 기존 로컬/개발 DB 데이터와 Flyway history는 보존하지 않는다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identity Context
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(20) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE TABLE user_local_auth (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP
);

CREATE TABLE user_social_auth (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    provider    VARCHAR(20)  NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE (provider, provider_id)
);

-- -----------------------------------------------------------------------------
-- Communication Context
-- -----------------------------------------------------------------------------

CREATE TABLE category (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_room (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    closed_at  TIMESTAMP
);

CREATE TABLE chat_room_category (
    chat_room_id BIGINT NOT NULL REFERENCES chat_room(id),
    category_id  BIGINT NOT NULL REFERENCES category(id),
    PRIMARY KEY (chat_room_id, category_id)
);

CREATE TABLE participant (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT,
    chat_room_id     BIGINT       NOT NULL REFERENCES chat_room(id),
    display_name     VARCHAR(100) NOT NULL,
    participant_role VARCHAR(20)  NOT NULL,
    entry_type       VARCHAR(20)  NOT NULL,
    joined_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    left_at          TIMESTAMP,
    CONSTRAINT uk_participant_user_chatroom UNIQUE (user_id, chat_room_id)
);

CREATE INDEX idx_participant_chat_room_id ON participant(chat_room_id);
CREATE INDEX idx_participant_user_id ON participant(user_id);

INSERT INTO chat_room (id, title, type, status)
VALUES (1, '마을 광장', 'PUBLIC', 'ACTIVE');

SELECT setval('chat_room_id_seq', 1, true);

-- -----------------------------------------------------------------------------
-- Safety Context
-- -----------------------------------------------------------------------------

CREATE TABLE report (
    id               BIGSERIAL PRIMARY KEY,
    reporter_user_id BIGINT      NOT NULL,
    target_user_id   BIGINT      NOT NULL,
    message_id       UUID,
    reason           VARCHAR(30) NOT NULL,
    detail           TEXT,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE sanction (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    type       VARCHAR(30) NOT NULL,
    reason     TEXT        NOT NULL,
    started_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    ended_at   TIMESTAMP,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sanction_user_id ON sanction(user_id);

-- -----------------------------------------------------------------------------
-- Confession Context
-- -----------------------------------------------------------------------------

CREATE TABLE confession_record (
    id             BIGSERIAL PRIMARY KEY,
    author_user_id BIGINT        NOT NULL,
    title          VARCHAR(120)  NOT NULL,
    body           VARCHAR(3000) NOT NULL,
    bookshelf      VARCHAR(50)   NOT NULL,
    status         VARCHAR(50)   NOT NULL,
    risk_level     VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confession_record_author_user_id ON confession_record(author_user_id);
CREATE INDEX idx_confession_record_status_created_at
    ON confession_record(status, created_at DESC);
CREATE INDEX idx_confession_record_bookshelf_status_created_at
    ON confession_record(bookshelf, status, created_at DESC);

CREATE TABLE confession_letter (
    id             BIGSERIAL PRIMARY KEY,
    confession_id  BIGINT        NOT NULL REFERENCES confession_record(id),
    sender_user_id BIGINT        NOT NULL,
    body           VARCHAR(1500) NOT NULL,
    status         VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    author_read_at TIMESTAMP
);

CREATE INDEX idx_confession_letter_confession_id_created_at
    ON confession_letter(confession_id, created_at DESC);
CREATE INDEX idx_confession_letter_sender_user_id_created_at
    ON confession_letter(sender_user_id, created_at DESC);
CREATE INDEX idx_confession_letter_unread_author
    ON confession_letter(confession_id, created_at DESC)
    WHERE author_read_at IS NULL AND status = 'SENT';

CREATE TABLE confession_thank_reply (
    id             BIGSERIAL PRIMARY KEY,
    letter_id      BIGINT       NOT NULL UNIQUE REFERENCES confession_letter(id),
    author_user_id BIGINT       NOT NULL,
    body           VARCHAR(500) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE confession_reaction (
    id             BIGSERIAL PRIMARY KEY,
    confession_id  BIGINT      NOT NULL REFERENCES confession_record(id),
    user_id        BIGINT      NOT NULL,
    reaction_type  VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_confession_reaction_user_type
        UNIQUE (confession_id, user_id, reaction_type)
);

CREATE INDEX idx_confession_reaction_confession_id
    ON confession_reaction(confession_id);

CREATE TABLE confession_report (
    id               BIGSERIAL PRIMARY KEY,
    confession_id    BIGINT      NOT NULL REFERENCES confession_record(id),
    reporter_user_id BIGINT      NOT NULL,
    reason           VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_confession_report_reporter
        UNIQUE (confession_id, reporter_user_id)
);

CREATE INDEX idx_confession_report_confession_id
    ON confession_report(confession_id);

-- -----------------------------------------------------------------------------
-- Village Context
-- -----------------------------------------------------------------------------

CREATE TABLE daily_visit (
    id           BIGSERIAL PRIMARY KEY,
    visit_date   DATE        NOT NULL,
    visitor_key  VARCHAR(80) NOT NULL,
    visitor_type VARCHAR(20) NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_daily_visit_date_key UNIQUE (visit_date, visitor_key)
);

CREATE INDEX idx_daily_visit_date_type
    ON daily_visit(visit_date, visitor_type);

CREATE TABLE suggestion (
    id            BIGSERIAL PRIMARY KEY,
    author_key    VARCHAR(80)   NOT NULL,
    author_type   VARCHAR(20)   NOT NULL,
    title         VARCHAR(120)  NOT NULL,
    body          VARCHAR(1000) NOT NULL,
    status        VARCHAR(30)   NOT NULL,
    admin_comment VARCHAR(1000),
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_status_created_at
    ON suggestion(status, created_at DESC);

-- -----------------------------------------------------------------------------
-- Infra Tables
-- -----------------------------------------------------------------------------

CREATE TABLE outbox_event (
    id           BIGSERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    event_id     UUID         NOT NULL UNIQUE,
    payload      JSONB        NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    retry_count  INT          NOT NULL DEFAULT 0,
    occurred_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_outbox_event_status ON outbox_event(status);

CREATE TABLE processed_event (
    id           BIGSERIAL PRIMARY KEY,
    event_id     UUID      NOT NULL UNIQUE,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE idempotency_request (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    result          JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);
```

- [ ] **Step 2: old migration 파일 삭제**

Run:

```powershell
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V2__village_public_chat_room.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V3__cleanup_legacy_chat_rooms.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V4__participant_unique_constraint.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V5__deprecated_conversation_memory_noop.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V6__deprecated_embedding_noop.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V7__confession_record.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V8__confession_letter_author_read_at.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V9__cleanup_legacy_npc_participants.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V10__village_board_and_visit.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\U10__village_board_and_visit.sql
Remove-Item -LiteralPath backend\src\main\resources\db\migration\V11__drop_personalization_and_economy.sql
```

Expected: `Get-ChildItem backend\src\main\resources\db\migration` shows only `V1__initial_schema.sql`.

- [ ] **Step 3: docker local 문서에 reset 안내 추가**

Modify `docs/wiki/infra/docker-local.md` near the PostgreSQL section with:

````markdown
### DB 기준선 재설정 후 로컬 볼륨 삭제

`baseline-reset-cleanup` 이후 migration은 빈 개발 DB 기준이다. 기존 로컬 데이터와
`flyway_schema_history`는 보존 대상이 아니므로, 예전 volume을 쓰지 않는다.

```powershell
docker compose -f deploy/docker-compose.yml down -v
docker compose -f deploy/docker-compose.yml up -d postgres
```
````

- [ ] **Step 4: baseline 파일 목록 확인**

Run:

```powershell
Get-ChildItem backend\src\main\resources\db\migration | Select-Object -ExpandProperty Name
```

Expected:

```text
V1__initial_schema.sql
```

- [ ] **Step 5: backend compile로 JPA schema validation 준비 상태 확인**

Run:

```powershell
.\gradlew.bat --no-daemon compileJava
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

Run:

```powershell
git add backend/src/main/resources/db/migration docs/wiki/infra/docker-local.md
git commit -m "refactor: reset database migration baseline"
```

Expected: commit succeeds.

---

### Task 3: Backend Deprecated Source Cleanup

**Files:**
- Delete: `backend/src/main/java/com/maeum/gohyang/identity/adapter/in/security/JwtClaims.java`
- Delete: `backend/src/main/java/com/maeum/gohyang/identity/domain/UserType.java`
- Modify: `backend/src/main/java/com/maeum/gohyang/global/infra/idempotency/IdempotencyGuard.java`
- Modify: `docs/wiki/infra/outbox-pattern.md`

- [ ] **Step 1: 삭제 대상 참조 재확인**

Run:

```powershell
rg -n "JwtClaims|identity\.domain\.UserType|isAlreadyProcessed|markAsProcessed" backend\src\main backend\src\test docs\wiki docs\specs -S
```

Expected:

```text
backend\src\main\java\com\maeum\gohyang\identity\adapter\in\security\JwtClaims.java:...
backend\src\main\java\com\maeum\gohyang\identity\domain\UserType.java:...
backend\src\main\java\com\maeum\gohyang\global\infra\idempotency\IdempotencyGuard.java:...
docs\wiki\infra\outbox-pattern.md:...
```

No active caller should appear.

- [ ] **Step 2: 참조 없는 deprecated class 삭제**

Run:

```powershell
Remove-Item -LiteralPath backend\src\main\java\com\maeum\gohyang\identity\adapter\in\security\JwtClaims.java
Remove-Item -LiteralPath backend\src\main\java\com\maeum\gohyang\identity\domain\UserType.java
```

- [ ] **Step 3: IdempotencyGuard에서 deprecated 메서드 제거**

Modify `backend/src/main/java/com/maeum/gohyang/global/infra/idempotency/IdempotencyGuard.java` to end after `release`:

```java
package com.maeum.gohyang.global.infra.idempotency;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Kafka at-least-once 환경에서 동일 이벤트의 중복 처리를 막는 멱등성 가드.
 * processed_event 테이블에 원자적 삽입(INSERT ON CONFLICT DO NOTHING)으로
 * check-then-act race condition을 방지한다.
 *
 * 사용법: tryAcquire()가 true를 반환한 경우에만 비즈니스 로직을 실행한다.
 * 삽입과 확인이 단일 쿼리로 이루어지므로 동시 요청이 들어와도 하나만 통과한다.
 */
@Component
@RequiredArgsConstructor
public class IdempotencyGuard {

    private final ProcessedEventJpaRepository repository;

    /**
     * 이벤트를 처리 완료로 원자적으로 마킹한다.
     * REQUIRES_NEW를 사용하여 호출자의 트랜잭션 유무와 무관하게 독립 커밋된다.
     * @return true면 최초 처리(비즈니스 로직 실행 가능), false면 이미 처리됨(스킵)
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public boolean tryAcquire(UUID key) {
        return repository.insertIfAbsent(key) > 0;
    }

    /**
     * 처리 실패 시 멱등성 마킹을 해제하여 재시도를 허용한다.
     * tryAcquire()로 선점한 뒤 비즈니스 로직이 실패했을 때 호출한다.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void release(UUID key) {
        repository.deleteByEventId(key);
    }
}
```

- [ ] **Step 4: outbox-pattern 문서 갱신**

In `docs/wiki/infra/outbox-pattern.md`, replace deprecated note:

```markdown
> `isAlreadyProcessed()`, `markAsProcessed()`는 `@Deprecated` — 기존 코드 호환용이며 향후 삭제 예정.
```

with:

```markdown
> 현재 표준은 `tryAcquire()`로 선점하고, 비즈니스 처리 실패 시 `release()`로 재시도를 허용하는 방식이다.
```

- [ ] **Step 5: backend compile/test 실행**

Run:

```powershell
.\gradlew.bat --no-daemon compileJava
.\gradlew.bat --no-daemon test --tests "*Idempotency*" --tests "*ConfessionLetterSentEventConsumerTest"
```

Expected: both commands exit 0.

- [ ] **Step 6: deprecated scan 확인**

Run:

```powershell
rg -n "@Deprecated|isAlreadyProcessed|markAsProcessed|JwtClaims|identity\.domain\.UserType" backend\src\main backend\src\test docs\wiki -S
```

Expected: no backend active source matches for removed items. Remaining matches may mention general web standards or explicit historical docs only.

- [ ] **Step 7: Commit**

Run:

```powershell
git add backend/src/main/java/com/maeum/gohyang/global/infra/idempotency/IdempotencyGuard.java backend/src/main/java/com/maeum/gohyang/identity docs/wiki/infra/outbox-pattern.md
git commit -m "refactor: remove deprecated backend remnants"
```

Expected: commit succeeds.

---

### Task 4: Frontend Phaser/Stale Artifact Cleanup

**Files:**
- Modify: `frontend/src/lib/websocket/positionBridge.ts`
- Modify: `frontend/src/lib/websocket/useStomp.ts`
- Modify: `frontend/src/three/scenes/VillageScene.ts`
- Modify/Delete: `docs/wiki/frontend/phaser-setup.md`
- Modify: `docs/wiki/frontend/websocket-client.md`
- Modify: `docs/wiki/INDEX.md`
- Modify: `docs/wiki/log.md`

- [ ] **Step 1: active frontend Phaser references 분류**

Run:

```powershell
rg -n "Phaser|phaser|2D|PixelArtScene|PhaserCanvas|positionBridge" frontend\src docs\wiki docs\CLAUDE-routing.md -S
```

Expected active code matches:

```text
frontend\src\lib\websocket\positionBridge.ts:...
frontend\src\lib\websocket\useStomp.ts:...
frontend\src\three\scenes\VillageScene.ts:...
```

These are comments/names, not runtime Phaser dependency.

- [ ] **Step 2: positionBridge 주석을 현재 구조로 교정**

Modify `frontend/src/lib/websocket/positionBridge.ts` top comment:

```ts
/**
 * WebSocket 위치 데이터 브릿지.
 *
 * React WebSocket 구독 계층이 수신한 위치 데이터를 Three.js SceneManager 계층에 전달한다.
 * 렌더링 엔진과 React 컴포넌트 생명주기가 달라서 콜백 기반 브릿지를 사용한다.
 */
```

Also replace:

```ts
// --- 내 타이핑 브릿지 (chat input focus → phaser) ---
```

with:

```ts
// --- 내 타이핑 브릿지 (chat input focus → scene input) ---
```

- [ ] **Step 3: useStomp 주석 교정**

In `frontend/src/lib/websocket/useStomp.ts`, replace any comment that says `Phaser` with `scene` or `Three.js scene`. Example:

```ts
// 자기인식 동기화 — 토큰이 결정된 시점에 displayId 를 scene 측에 전달
```

- [ ] **Step 4: VillageScene compatibility comment 교정**

In `frontend/src/three/scenes/VillageScene.ts`, replace:

```ts
 * 백엔드 contract y → Three.js z 로 매핑한다 (옛 Phaser 2D 호환).
```

with:

```ts
 * 백엔드 contract y 값을 Three.js z 축으로 매핑한다.
```

- [ ] **Step 5: Phaser wiki를 역사 문서로 축소 또는 삭제**

Preferred action: delete `docs/wiki/frontend/phaser-setup.md` and remove its entry from `docs/wiki/INDEX.md`.

If a retained history note is needed, replace the file with:

```markdown
---
type: Wiki Concept
title: 폐기된 Phaser 프론트엔드 구조
tags: [frontend, historical]
status: deprecated
---

# 폐기된 Phaser 프론트엔드 구조

이 문서는 과거 2D Phaser 시절 구조 기록이다. 현재 런타임은 Next.js, React, Three.js,
Howler.js 기반이다.

현재 구조는 `frontend/src/three/**`, `frontend/src/app/GameLoader.tsx`,
`docs/wiki/frontend/websocket-client.md`를 기준으로 확인한다.
```

- [ ] **Step 6: websocket-client wiki에서 Phaser 표현 제거**

In `docs/wiki/frontend/websocket-client.md`, replace section title:

```markdown
### STOMP-Phaser 브릿지 (positionBridge.ts)
```

with:

```markdown
### WebSocket-scene 브릿지 (positionBridge.ts)
```

Replace body with:

```markdown
React WebSocket 구독 계층은 `positionBridge.ts`를 통해 Three.js scene 계층에 위치 데이터를 전달한다.
렌더링 계층은 React 컴포넌트가 아니므로 콜백 기반 브릿지를 사용한다.
```

- [ ] **Step 7: frontend 검증**

Run from `frontend`:

```powershell
npx tsc --noEmit
npm.cmd run lint
npm.cmd run test:run -- src/lib/websocket src/three
```

Expected: all commands exit 0.

- [ ] **Step 8: Phaser scan 재확인**

Run:

```powershell
rg -n "Phaser|phaser|PixelArtScene|PhaserCanvas" frontend\src docs\wiki docs\CLAUDE-routing.md -S
```

Expected: matches only in explicit historical learning/spec docs, not active frontend source or current wiki.

- [ ] **Step 9: Commit**

Run:

```powershell
git add frontend/src/lib/websocket frontend/src/three/scenes/VillageScene.ts docs/wiki/frontend docs/wiki/INDEX.md docs/wiki/log.md docs/CLAUDE-routing.md
git commit -m "docs: remove stale Phaser frontend references"
```

Expected: commit succeeds.

---

### Task 5: Documentation Artifact Cleanup

**Files:**
- Modify: `docs/handover/INDEX.md`
- Delete candidates: stale completed `docs/handover/track-*.md`
- Delete candidates: old `docs/reviews/**`
- Delete candidates: obsolete `docs/superpowers/plans/**`
- Delete candidates: obsolete `docs/superpowers/specs/**`
- Preserve: `docs/learning/**`, `docs/architecture/decisions/**` unless directly superseded and unlinked.

- [ ] **Step 1: active links into old working artifacts 확인**

Run:

```powershell
rg -n "track-harden-village-ops|track-library-confession-mvp|track-village-design-mvp|2026-05-30-librarian-room-prototype|2026-06-24-fairy-forest-hideout|docs/reviews" docs README.md AGENTS.md -S
```

Expected: identify links that must be removed or rewritten before deleting files.

- [ ] **Step 2: stale handover track 삭제 기준 적용**

Delete handover track files that satisfy all conditions:

```text
1. INDEX.md Recently Closed에 요약이 있거나 learning note로 결정 이력이 옮겨져 있다.
2. Planned/Active 트랙에서 참조하지 않는다.
3. 후속 의제로 살아있는 항목이 아니다.
```

Initial delete candidates:

```text
docs/handover/track-harden-village-ops.md
docs/handover/track-library-confession-mvp.md
docs/handover/track-village-3d-audio-improvements.md
docs/handover/track-village-design-mvp.md
docs/handover/track-ws-redis.md
```

Keep candidates:

```text
docs/handover/track-token-auto-renewal.md
docs/handover/track-realtime-infra-reset.md
docs/handover/track-personalization-removal-librarian-rag.md
docs/handover/track-baseline-reset-cleanup.md
```

- [ ] **Step 3: 오래된 review raw 산출물 삭제**

Delete generated review dumps and obsolete one-off reviews after link scan:

```powershell
Remove-Item -LiteralPath docs\reviews\2026-04-09 -Recurse -Force
Remove-Item -LiteralPath docs\reviews\2026-04-13 -Recurse -Force
Remove-Item -LiteralPath docs\reviews\2026-04-15 -Recurse -Force
Remove-Item -LiteralPath docs\reviews\2026-04-16 -Recurse -Force
Remove-Item -LiteralPath docs\reviews\2026-04-21 -Recurse -Force
Remove-Item -LiteralPath docs\reviews\2026-04-22 -Recurse -Force
```

Keep `docs/reviews/realtime-infra-reset-audit.md` only if linked from active realtime docs. Otherwise delete it too.

- [ ] **Step 4: obsolete superpowers working plans/specs 정리**

Delete plan/spec files that are implementation scratchpads for already closed work and not linked by active feature specs:

```powershell
Remove-Item -LiteralPath docs\superpowers\plans\2026-05-30-librarian-room-prototype.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-06-frontend-client-split.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-06-raw-ws-parity.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-06-realtime-infra-reset.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-06-redis-v2-stabilize.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-07-controlled-cutover.md
Remove-Item -LiteralPath docs\superpowers\plans\2026-06-16-campfire-hideout-orbit-camera.md
Remove-Item -LiteralPath docs\superpowers\specs\2026-05-30-librarian-room-prototype-design.md
Remove-Item -LiteralPath docs\superpowers\specs\2026-06-06-realtime-infra-reset-design.md
Remove-Item -LiteralPath docs\superpowers\specs\2026-06-15-campfire-hideout-orbit-camera-design.md
Remove-Item -LiteralPath docs\superpowers\specs\2026-06-24-fairy-forest-hideout-design.md
```

Keep:

```text
docs/superpowers/specs/2026-06-23-personalization-removal-librarian-rag-design.md
docs/superpowers/plans/2026-06-23-personalization-removal-librarian-rag.md
docs/superpowers/specs/2026-07-02-baseline-reset-cleanup-design.md
docs/superpowers/plans/2026-07-02-baseline-reset-cleanup.md
```

- [ ] **Step 5: INDEX의 잔존 트랙 설명 갱신**

In `docs/handover/INDEX.md`, replace the stale "현재 잔존 트랙 파일" paragraph with a current short rule:

```markdown
> 종료된 트랙 파일은 learning/ADR/spec에 결정 이력이 옮겨지고 후속 의제로 살아있지 않으면 삭제한다.
> 후속 작업의 직접 입력인 `track-token-auto-renewal.md` 같은 파일만 보존한다.
```

- [ ] **Step 6: 문서 링크 검증**

Run:

```powershell
npm.cmd run lint:md
rg -n "docs/reviews/2026-04|track-harden-village-ops|track-library-confession-mvp|track-village-design-mvp|2026-05-30-librarian-room-prototype|2026-06-24-fairy-forest-hideout" docs README.md AGENTS.md -S
```

Expected: markdownlint passes. `rg` returns no active links to deleted files.

- [ ] **Step 7: Commit**

Run:

```powershell
git add docs
git commit -m "docs: prune obsolete working artifacts"
```

Expected: commit succeeds.

---

### Task 6: Full Verification and Handover Update

**Files:**
- Modify: `docs/handover/track-baseline-reset-cleanup.md`
- Modify: `docs/specs/features/baseline-reset-cleanup.md`
- Modify: `docs/handover/INDEX.md`

- [ ] **Step 1: empty DB baseline 검증 준비**

Run:

```powershell
docker compose -f deploy/docker-compose.yml down -v
docker compose -f deploy/docker-compose.yml up -d postgres redis kafka cassandra cassandra-init
```

Expected: containers start. If Docker is unavailable, record the failure reason in the track file and still run Testcontainers-based backend check.

- [ ] **Step 2: backend 전체 검증**

Run:

```powershell
.\gradlew.bat --no-daemon check
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: frontend 전체 검증**

Run from `frontend`:

```powershell
npx tsc --noEmit
npm.cmd run lint
npm.cmd run test:run
```

Expected: all commands exit 0.

- [ ] **Step 4: stale scan 최종 확인**

Run:

```powershell
rg -n "@Deprecated|JwtClaims|identity\.domain\.UserType|isAlreadyProcessed|markAsProcessed|Phaser|phaser|PixelArtScene|PhaserCanvas|V5__deprecated|V6__deprecated|V11__drop_personalization" backend frontend docs -S
```

Expected:

```text
docs/learning/... historical matches are allowed
docs/specs/features/baseline-reset-cleanup.md may mention removed concepts
docs/handover/track-baseline-reset-cleanup.md may mention removed concepts
```

No active source or current wiki should point to removed runtime behavior.

- [ ] **Step 5: spec/track acceptance 체크**

Update `docs/specs/features/baseline-reset-cleanup.md` verification checkboxes to checked when commands pass.

Update `docs/handover/track-baseline-reset-cleanup.md`:

```markdown
## 3. 현재 단계 상세

완료:

- DB baseline reset 완료
- backend deprecated remnant 제거 완료
- frontend Phaser stale reference 정리 완료
- obsolete working artifact 정리 완료

검증:

- `.\gradlew.bat --no-daemon check` 통과
- `npx tsc --noEmit` 통과
- `npm.cmd run lint` 통과
- `npm.cmd run test:run` 통과
```

- [ ] **Step 6: 최종 diff 점검**

Run:

```powershell
git status --short --branch
git diff --stat origin/main..HEAD
git diff --name-status origin/main..HEAD
```

Expected: changes match cleanup scope only.

- [ ] **Step 7: Commit**

Run:

```powershell
git add docs/handover/track-baseline-reset-cleanup.md docs/specs/features/baseline-reset-cleanup.md docs/handover/INDEX.md
git commit -m "docs: record baseline cleanup verification"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: approved design의 DB 기준선, backend cleanup, frontend cleanup, docs cleanup, 검증 기준을 Task 1~6이 모두 다룬다.
- Placeholder scan: 실행 전 commit 칸은 `실행 후 기입`으로 명시했다. 작업 중 실제 commit hash로 대체한다.
- Type/path consistency: 모든 path는 현재 repo 경로 기준이다. `JwtClaims`, `identity.domain.UserType`, `IdempotencyGuard` 참조 scan 결과와 일치한다.
- Risk note: DB migration reset은 기존 volume 삭제 전제다. 운영 DB 보존이 필요해지면 Task 2를 실행하지 말고 별도 migration 전략으로 전환한다.
