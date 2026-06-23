# 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DB에 저장되는 개인 공간, 개인 캐릭터, 꾸미기, Economy를 제거하고 프로젝트 문서와 코드를 고백/편지/개인별 사서 RAG 중심으로 맞춘다.

**Architecture:** Village는 마을 런타임, 위치 공유, 방문 집계, 건의, 대시보드만 담당한다. Confession/Library가 핵심 저장 도메인이며, 사서 RAG는 일반 채팅이 아닌 개인별 Confession 데이터만 참조한다.

**Tech Stack:** Java 21, Spring Boot 4.x, Hexagonal Architecture, PostgreSQL/Flyway, JUnit/Mockito, Next.js/React/Three.js, Markdown docs, GitHub CLI.

---

## File Map

### Create

- `docs/specs/features/personalization-removal-librarian-rag.md`: 이번 트랙의 feature spec.
- `docs/handover/track-personalization-removal-librarian-rag.md`: handover track.
- `backend/src/main/resources/db/migration/V11__drop_personalization_and_economy.sql`: 제거 대상 테이블 drop migration.

### Modify

- `docs/handover/INDEX.md`: active track 표에 새 트랙 추가.
- `README.md`: 현재 제품 모델을 고백/편지/사서 RAG 중심으로 정리.
- `docs/planning/project-overview.md`: 핵심 루프와 수익모델 설명에서 개인공간/Economy 제거.
- `docs/architecture/erd.md`: 제거 테이블 삭제, Confession/Library/RAG 중심 설명 반영.
- `docs/architecture/erd.mermaid`: 제거 테이블 삭제.
- `docs/architecture/domain-boundary.md`: Economy 제거, Village 축소, Confession/Library RAG 추가.
- `docs/specs/api/village.md`: `/characters/me`, `/spaces/me` 삭제.
- `docs/wiki/village/space-system.md`: 삭제하거나 runtime presence 문서로 대체.
- `docs/wiki/village/character-system.md`: 삭제하거나 runtime avatar/presence 문서로 대체.
- `backend/src/main/java/com/maeum/gohyang/village/adapter/in/web/VillageController.java`: character/space endpoint와 의존성 제거.
- `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/VillagePersistenceAdapter.java`: character/space port 구현과 repository 의존성 제거.
- `backend/src/test/java/com/maeum/gohyang/village/adapter/in/web/VillageControllerTest.java`: character/space 테스트 삭제, 유지 API 테스트만 남김.
- `backend/src/test/java/com/maeum/gohyang/support/adapter/VillageTestAdapter.java`: character/space helper 삭제.
- `backend/src/test/java/com/maeum/gohyang/cucumber/steps/VillageSteps.java`: character/space step 삭제.

### Delete

- `backend/src/main/java/com/maeum/gohyang/village/domain/Character.java`
- `backend/src/main/java/com/maeum/gohyang/village/domain/Space.java`
- `backend/src/main/java/com/maeum/gohyang/village/domain/SpaceTheme.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/in/GetMyCharacterUseCase.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/in/GetMySpaceUseCase.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/in/InitializeUserVillageUseCase.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/out/LoadCharacterPort.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/out/LoadSpacePort.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/out/SaveCharacterPort.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/port/out/SaveSpacePort.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/service/GetMyCharacterService.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/service/GetMySpaceService.java`
- `backend/src/main/java/com/maeum/gohyang/village/application/service/InitializeUserVillageService.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/CharacterJpaEntity.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/CharacterJpaRepository.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/SpaceJpaEntity.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/SpaceJpaRepository.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/in/messaging/UserRegisteredEventConsumer.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/in/web/CharacterResponse.java`
- `backend/src/main/java/com/maeum/gohyang/village/adapter/in/web/SpaceResponse.java`
- `backend/src/main/java/com/maeum/gohyang/village/error/CharacterNotFoundException.java`
- `backend/src/main/java/com/maeum/gohyang/village/error/SpaceNotFoundException.java`
- `backend/src/main/java/com/maeum/gohyang/village/error/GuestNoPersonalSpaceException.java`
- `backend/src/test/java/com/maeum/gohyang/village/adapter/in/messaging/UserRegisteredEventConsumerTest.java`

---

### Task 1: GitHub Issue, Feature Spec, Track

**Files:**
- Create: `docs/specs/features/personalization-removal-librarian-rag.md`
- Create: `docs/handover/track-personalization-removal-librarian-rag.md`
- Modify: `docs/handover/INDEX.md`

- [ ] **Step 1: Create GitHub issue**

Run:

```powershell
gh issue create --title "개인화 저장 모델 제거 및 사서 RAG 중심 재정렬" --body @-
```

Paste this body:

```markdown
## 배경

개인 공간, 개인 캐릭터, 꾸미기, 포인트/아이템 Economy는 현재 제품 방향에서 제거한다.
3D 마을/도서관은 진입 경험으로 유지하고, 핵심 저장 데이터는 고백/편지/개인별 사서 RAG로 재정렬한다.

## 작업 범위

- [ ] 백엔드 character/space 생성·조회 흐름 제거
- [ ] 회원가입 후 기본 character/space 생성 consumer 제거
- [ ] personalization/Economy 테이블 drop migration 추가
- [ ] character/space API 스펙 제거
- [ ] README, ERD, domain boundary, planning 문서 정리
- [ ] village space/character wiki를 runtime presence 관점으로 정리
- [ ] 테스트 정리
- [ ] 백엔드 테스트 또는 컴파일 검증

## 완료 조건

- README와 아키텍처 문서가 개인 공간, 개인 캐릭터 꾸미기, Economy를 현재 기능으로 설명하지 않는다.
- `/api/v1/village/characters/me`, `/api/v1/village/spaces/me`가 제거된다.
- `space`, `character`, `point_wallet`, `item_definition` 계열 테이블이 새 Flyway migration에서 drop된다.
- 일반 채팅은 RAG memory source가 아니며, 사서 RAG는 Confession/Library 경계에 둔다.
```

Expected: GitHub issue URL and number are printed.

- [ ] **Step 2: Create feature spec**

Create `docs/specs/features/personalization-removal-librarian-rag.md` with:

```markdown
# 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬

> Issue: #{ISSUE_NUMBER}
> Track: `personalization-removal-librarian-rag`
> Status: 진행 예정

## 1. 목표

DB에 저장되는 개인 공간, 개인 캐릭터, 꾸미기, 포인트/아이템 Economy를 제거하고 현재 제품 모델을 고백/편지/개인별 사서 RAG 중심으로 맞춘다.

## 2. 제거 대상

- `space`, `space_placement`
- `character`, `character_equipment`
- `point_wallet`, `point_transaction`
- `item_definition`, `user_item_inventory`
- `/api/v1/village/characters/me`
- `/api/v1/village/spaces/me`
- 회원가입 후 기본 캐릭터/공간 생성 consumer

## 3. 유지 대상

- 3D 마을/도서관 런타임 경험
- 기본 아바타와 RemotePlayer
- WebSocket 위치 공유, 퇴장 이벤트, typing
- 일일 방문, 건의, 대시보드
- 공개 채팅
- 고백/편지/감사 답장/반응/신고

## 4. 사서 RAG 경계

사서 RAG는 Confession/Library 경계에 둔다. 일반 채팅 메시지는 RAG 기억으로 사용하지 않는다.

1차 corpus는 사용자 소유 고백 데이터다.

- 작성한 고백
- 받은 편지
- 보낸 편지
- 필요한 경우 감사 답장

## 5. 검증

- 백엔드 컴파일 또는 테스트 통과
- 제거 API가 controller와 API 문서에서 모두 사라짐
- 제거 테이블 drop migration 존재
- README/ERD/domain boundary가 현재 제품 모델과 일치
```

Replace `{ISSUE_NUMBER}` with the created issue number.

- [ ] **Step 3: Create handover track**

Create `docs/handover/track-personalization-removal-librarian-rag.md` with:

```markdown
# Track: personalization-removal-librarian-rag

> 작업 영역: 개인화 저장 모델 제거 + 사서 RAG 중심 재정렬
> 시작일: 2026-06-23
> Issue: #{ISSUE_NUMBER}
> 브랜치: docs-or-refactor/personalization-removal-librarian-rag
> Spec: [docs/specs/features/personalization-removal-librarian-rag.md](../specs/features/personalization-removal-librarian-rag.md)

## 0. 한 줄 요약

개인 공간, 개인 캐릭터, 꾸미기, Economy 저장 모델을 제거하고 프로젝트 문서와 백엔드를 Confession/Library 기반 개인별 사서 RAG 중심으로 맞춘다.

## 0.5 Acceptance Criteria

- [ ] character/space 생성·조회 API와 백엔드 흐름 제거
- [ ] personalization/Economy 테이블 drop migration 추가
- [ ] README, ERD, domain boundary, API spec 정합성 확보
- [ ] 일반 채팅이 RAG 기억으로 설명되지 않음
- [ ] 백엔드 테스트 또는 컴파일 검증 완료

## 1. 배경 / 왜

수익모델과 꾸미기 기능을 현재 범위에서 제거하기로 결정했다. 3D 마을/도서관은 진입 경험으로 유지하지만, DB 저장 중심은 고백/편지/사서 RAG가 된다.

## 2. 전체 로드맵

| Step | 내용 | 상태 | 이슈 | Commit |
|------|------|------|------|--------|
| 1 | 이슈/spec/track 생성 | 진행 중 | #{ISSUE_NUMBER} | TBD |
| 2 | 백엔드 character/space 제거 | 대기 | #{ISSUE_NUMBER} | TBD |
| 3 | DB drop migration 추가 | 대기 | #{ISSUE_NUMBER} | TBD |
| 4 | 테스트 정리 | 대기 | #{ISSUE_NUMBER} | TBD |
| 5 | README/ERD/아키텍처 문서 정리 | 대기 | #{ISSUE_NUMBER} | TBD |

## 3. 현재 단계 상세

Step 1 진행 중.

## 4. 충돌 위험 파일

- `README.md`
- `docs/architecture/erd.md`
- `docs/architecture/erd.mermaid`
- `docs/architecture/domain-boundary.md`
- `docs/planning/project-overview.md`
- `backend/src/main/java/com/maeum/gohyang/village/**`
- `backend/src/main/resources/db/migration/**`

## 5. 다음 세션 착수 전 확인 사항

- GitHub issue 번호 확인
- character/space API 프론트 호출 여부 확인
- Flyway 다음 버전 번호 확인

## 6. 보류 메모

수익모델은 이번 트랙에서 다루지 않는다.
```

Replace `{ISSUE_NUMBER}` and remove `TBD` only when commits are known during execution.

- [ ] **Step 4: Update handover index**

Add active row to `docs/handover/INDEX.md`:

```markdown
| `personalization-removal-librarian-rag` | [track-personalization-removal-librarian-rag.md](./track-personalization-removal-librarian-rag.md) | 개인화 저장 모델 제거 + 사서 RAG 중심 재정렬 | 진행 중 | #{ISSUE_NUMBER} | 2026-06-23 |
```

- [ ] **Step 5: Commit task 1**

Run:

```powershell
git add docs/specs/features/personalization-removal-librarian-rag.md docs/handover/track-personalization-removal-librarian-rag.md docs/handover/INDEX.md
git commit -m "docs: start personalization removal track"
```

Expected: commit succeeds.

---

### Task 2: Remove Backend Character and Space APIs

**Files:**
- Modify: `backend/src/main/java/com/maeum/gohyang/village/adapter/in/web/VillageController.java`
- Modify: `backend/src/main/java/com/maeum/gohyang/village/adapter/out/persistence/VillagePersistenceAdapter.java`
- Delete: character/space domain, ports, services, entities, repositories, responses, exceptions, consumer, and consumer test listed in File Map.

- [ ] **Step 1: Remove controller dependencies and endpoints**

In `VillageController.java`, remove these imports:

```java
import com.maeum.gohyang.village.application.port.in.GetMyCharacterUseCase;
import com.maeum.gohyang.village.application.port.in.GetMySpaceUseCase;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.error.GuestNoPersonalSpaceException;
```

Remove these fields:

```java
private final GetMyCharacterUseCase getMyCharacterUseCase;
private final GetMySpaceUseCase getMySpaceUseCase;
```

Delete the two methods:

```java
@GetMapping("/characters/me")
public CharacterResponse getMyCharacter(@AuthenticationPrincipal AuthenticatedUser user) { ... }

@GetMapping("/spaces/me")
public SpaceResponse getMySpace(@AuthenticationPrincipal AuthenticatedUser user) { ... }
```

Expected: controller still contains visits, dashboard, suggestions only.

- [ ] **Step 2: Narrow persistence adapter**

In `VillagePersistenceAdapter.java`, remove character/space imports, fields, implemented interfaces, and methods.

The class declaration should become:

```java
public class VillagePersistenceAdapter
        implements AddDailyVisitPort, LoadDailyVisitStatsPort, SaveSuggestionPort, LoadSuggestionsPort {
```

The fields should begin with:

```java
private final DailyVisitJpaRepository dailyVisitJpaRepository;
private final VillageDashboardJpaRepository villageDashboardJpaRepository;
private final SuggestionJpaRepository suggestionJpaRepository;
```

Expected: no import from `LoadCharacterPort`, `SaveCharacterPort`, `LoadSpacePort`, `SaveSpacePort`, `Character`, or `Space`.

- [ ] **Step 3: Delete character/space Java files**

Delete the files listed in File Map under Delete.

Expected: `rg -n "GetMyCharacter|GetMySpace|InitializeUserVillage|CharacterJpa|SpaceJpa|GuestNoPersonalSpace|CharacterNotFound|SpaceNotFound" backend/src/main/java` returns no matches.

- [ ] **Step 4: Compile backend**

Run:

```powershell
.\gradlew.bat --no-daemon compileJava
```

Expected: compile fails only if remaining references exist. Remove remaining references and rerun until compile passes.

- [ ] **Step 5: Commit task 2**

Run:

```powershell
git add backend/src/main/java
git add -u backend/src/main/java
git commit -m "refactor: remove persisted village personalization"
```

Expected: commit succeeds.

---

### Task 3: Add Drop Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__drop_personalization_and_economy.sql`

- [ ] **Step 1: Create migration**

Create `backend/src/main/resources/db/migration/V11__drop_personalization_and_economy.sql`:

```sql
-- Remove persisted personal space, character customization, and economy tables.
-- Runtime avatars and WebSocket presence remain non-persisted village behavior.

DROP TABLE IF EXISTS character_equipment;
DROP TABLE IF EXISTS space_placement;
DROP TABLE IF EXISTS character;
DROP TABLE IF EXISTS space;
DROP TABLE IF EXISTS user_item_inventory;
DROP TABLE IF EXISTS item_definition;
DROP TABLE IF EXISTS point_transaction;
DROP TABLE IF EXISTS point_wallet;
```

- [ ] **Step 2: Verify migration file exists**

Run:

```powershell
Get-ChildItem backend\src\main\resources\db\migration | Select-Object -ExpandProperty Name
```

Expected: `V11__drop_personalization_and_economy.sql` appears after `V10__village_board_and_visit.sql`.

- [ ] **Step 3: Commit task 3**

Run:

```powershell
git add backend/src/main/resources/db/migration/V11__drop_personalization_and_economy.sql
git commit -m "db: drop personalization and economy tables"
```

Expected: commit succeeds.

---

### Task 4: Update Tests

**Files:**
- Modify: `backend/src/test/java/com/maeum/gohyang/village/adapter/in/web/VillageControllerTest.java`
- Modify: `backend/src/test/java/com/maeum/gohyang/support/adapter/VillageTestAdapter.java`
- Modify: `backend/src/test/java/com/maeum/gohyang/cucumber/steps/VillageSteps.java`
- Delete: `backend/src/test/java/com/maeum/gohyang/village/adapter/in/messaging/UserRegisteredEventConsumerTest.java`

- [ ] **Step 1: Remove deleted API tests**

In `VillageControllerTest.java`, remove mocks for `GetMyCharacterUseCase` and `GetMySpaceUseCase`. Delete tests for `/api/v1/village/characters/me` and `/api/v1/village/spaces/me`.

Expected: remaining tests cover visits, dashboard, and suggestions.

- [ ] **Step 2: Remove cucumber helpers**

In `VillageTestAdapter.java`, delete constants and methods using:

```java
private static final String CHARACTER_PATH = "/api/v1/village/characters/me";
private static final String SPACE_PATH = "/api/v1/village/spaces/me";
```

Delete methods:

```java
waitForCharacter(...)
fetchMySpace()
fetchMyCharacterWithGuestToken()
fetchMySpaceWithGuestToken()
```

In `VillageSteps.java`, delete step definitions that call those methods.

- [ ] **Step 3: Delete consumer test**

Delete `UserRegisteredEventConsumerTest.java`.

Expected: `rg -n "characters/me|spaces/me|waitForCharacter|fetchMySpace|UserRegisteredEventConsumer" backend/src/test` returns no matches, except unrelated text if any.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
.\gradlew.bat --no-daemon test --tests "*Village*"
```

Expected: village tests pass. If the Gradle filter misses tests, run full backend tests in Task 7.

- [ ] **Step 5: Commit task 4**

Run:

```powershell
git add backend/src/test/java
git add -u backend/src/test/java
git commit -m "test: remove personalization API coverage"
```

Expected: commit succeeds.

---

### Task 5: Update Product and Architecture Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/planning/project-overview.md`
- Modify: `docs/architecture/erd.md`
- Modify: `docs/architecture/erd.mermaid`
- Modify: `docs/architecture/domain-boundary.md`
- Modify: `docs/specs/api/village.md`
- Modify/Delete: `docs/wiki/village/space-system.md`
- Modify/Delete: `docs/wiki/village/character-system.md`

- [ ] **Step 1: Update village API spec**

Remove the sections:

```markdown
## GET `/api/v1/village/characters/me`
## GET `/api/v1/village/spaces/me`
```

Keep sections for:

```markdown
POST `/api/v1/village/visits/today`
GET `/api/v1/village/dashboard/today`
GET `/api/v1/village/suggestions`
POST `/api/v1/village/suggestions`
```

- [ ] **Step 2: Update ERD docs**

In `docs/architecture/erd.md` and `docs/architecture/erd.mermaid`, remove:

```text
SPACE
SPACE_PLACEMENT
CHARACTER
CHARACTER_EQUIPMENT
POINT_WALLET
POINT_TRANSACTION
ITEM_DEFINITION
USER_ITEM_INVENTORY
```

Add or keep:

```text
Village: daily_visit, suggestion
Confession: confession_record, confession_letter, confession_thank_reply, confession_reaction, confession_report
```

State explicitly:

```markdown
런타임 아바타와 위치 공유는 DB에 저장하지 않는다.
사서 RAG는 Confession/Library 경계의 개인별 데이터로 설계한다.
```

- [ ] **Step 3: Update domain boundary**

In `docs/architecture/domain-boundary.md`, remove Economy as a current bounded context. Narrow Village responsibilities to:

```markdown
- 런타임 마을/도서관 경험
- 위치 공유와 presence
- 일일 방문 집계
- 건의
- 마을 대시보드
```

Add Confession/Library responsibility:

```markdown
- 고백/편지/감사 답장
- 반응과 신고
- 개인별 사서 RAG corpus 경계
```

- [ ] **Step 4: Update README and planning overview**

In `README.md` and `docs/planning/project-overview.md`, remove current product claims about:

```text
개인 공간 꾸미기
캐릭터 꾸미기
포인트
아이템
광고 보상 기반 Economy
```

Replace product center with:

```markdown
3D 마을/도서관은 진입 경험이다. 핵심 저장 데이터와 장기 제품 축은 고백, 편지, 감사 답장, 개인별 사서 RAG다.
```

- [ ] **Step 5: Replace village wiki pages**

Replace `docs/wiki/village/space-system.md` with a short page titled `마을 런타임 공간`.

Required content:

```markdown
# 마을 런타임 공간

개인 공간은 더 이상 DB에 저장하지 않는다. 마을/도서관은 사용자가 들어오는 공통 런타임 경험이며, 위치 공유와 화면 전환을 위한 프론트엔드/웹소켓 상태로 다룬다.
```

Replace `docs/wiki/village/character-system.md` with a short page titled `런타임 아바타와 위치 공유`.

Required content:

```markdown
# 런타임 아바타와 위치 공유

캐릭터는 더 이상 DB에 저장되는 개인화 모델이 아니다. 기본 아바타와 RemotePlayer는 화면 표현이며, 위치는 WebSocket으로 공유되는 런타임 상태다.
```

- [ ] **Step 6: Search stale docs**

Run:

```powershell
rg -n "개인 공간|공간 꾸미기|캐릭터 꾸미기|포인트|아이템|Economy|point_wallet|item_definition|characters/me|spaces/me" README.md docs
```

Expected: matches only appear in historical learning notes, this track/spec/plan, or explicit removal context.

- [ ] **Step 7: Commit task 5**

Run:

```powershell
git add README.md docs
git add -u docs
git commit -m "docs: recenter project around librarian rag"
```

Expected: commit succeeds.

---

### Task 6: Frontend Call Audit

**Files:**
- Modify if needed: `frontend/src/**`

- [ ] **Step 1: Search removed API calls**

Run:

```powershell
rg -n "characters/me|spaces/me|/api/v1/village/characters|/api/v1/village/spaces" frontend/src
```

Expected: no matches. If matches exist, remove those calls and replace with local runtime avatar state.

- [ ] **Step 2: Preserve runtime character classes**

Do not delete these files only because they contain the word `Character`:

```text
frontend/src/three/character/**
frontend/src/three/scenes/VillageScene.ts
frontend/src/three/scenes/LibraryScene.ts
frontend/src/three/SceneManager.ts
```

Reason: these are runtime avatar/rendering classes, not persisted backend character records.

- [ ] **Step 3: Run frontend type check if files changed**

Run:

```powershell
npx tsc --noEmit
```

Expected: TypeScript passes. If no frontend files changed, skip this command and note it in final verification.

- [ ] **Step 4: Commit task 6 if needed**

Run only if frontend changed:

```powershell
git add frontend/src
git commit -m "fix: remove personalization api calls"
```

Expected: commit succeeds.

---

### Task 7: Final Verification

**Files:**
- No planned edits unless verification finds issues.

- [ ] **Step 1: Run backend tests**

Run:

```powershell
.\gradlew.bat --no-daemon test
```

Expected: all tests pass.

- [ ] **Step 2: Run stale reference scan**

Run:

```powershell
rg -n "GetMyCharacter|GetMySpace|InitializeUserVillage|CharacterJpa|SpaceJpa|GuestNoPersonalSpace|CharacterNotFound|SpaceNotFound|characters/me|spaces/me|point_wallet|point_transaction|item_definition|user_item_inventory" backend/src/main backend/src/test frontend/src README.md docs
```

Expected: no active code references. Docs may contain matches only in specs/plans/tracks or explicit removal context.

- [ ] **Step 3: Check git status**

Run:

```powershell
git status --short
```

Expected: clean or only intentional final docs updates.

- [ ] **Step 4: Final commit if verification required fixes**

If fixes were made:

```powershell
git add <changed-files>
git commit -m "fix: complete personalization removal cleanup"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: covered issue/track/spec, backend removal, DB drop migration, tests, docs, frontend audit, final verification.
- Placeholder scan: no implementation placeholder remains. Track template uses `TBD` only for commit hashes that are unknown until execution.
- Type consistency: deleted backend APIs are consistently named `GetMyCharacter`, `GetMySpace`, `InitializeUserVillage`, `CharacterJpa`, `SpaceJpa`; runtime frontend `Character` is explicitly preserved.
