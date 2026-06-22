# Personalization Removal and Librarian RAG Design

> Date: 2026-06-23
> Status: Approved design
> Scope: Remove persisted personal spaces, characters, decoration, and economy. Re-center the project around confession, letters, and private librarian RAG.

## 1. Goal

The project no longer treats personal rooms, persistent characters, decoration, points, or items as core product data.

The product model is:

- 3D village and library remain as the entry experience.
- Avatars remain as runtime/default visual presence, not persisted character records.
- Real-time chat, position sharing, typing, daily visits, suggestions, and dashboard remain.
- Confession, letters, thank replies, reactions, reports, and librarian RAG become the primary persisted product surface.
- General chat is not a RAG memory source.

## 2. Non-Goals

- Do not keep deprecated tables as "future" or "unused" concepts in README or architecture docs.
- Do not design a replacement monetization model in this track.
- Do not rename the whole Village package to a new bounded context.
- Do not use public/general chat messages as librarian RAG memory.

## 3. Product Boundary

### Removed

- Personal space storage
- Space placement and decoration
- Persisted personal character storage
- Character equipment and customization
- Points, wallets, transactions, item catalog, and inventory
- User registration flow that creates default character and space records
- `GET /api/v1/village/characters/me`
- `GET /api/v1/village/spaces/me`

### Preserved

- 3D village/library visual experience
- Runtime/default avatar representation
- Remote player rendering
- WebSocket position sharing, leave events, and typing indicators
- Daily visit tracking
- Suggestions
- Village dashboard
- Public chat and message storage
- Confession and library workflows

### New Center

Librarian RAG is scoped to private Confession data:

- The first corpus is user-owned confession data: authored confessions, received letters, sent letters, and thank replies where applicable.
- The RAG boundary belongs with Confession/Library, not general Communication chat.
- Retrieval must respect user ownership and privacy.

## 4. Backend Design

Village remains, but its responsibility narrows to runtime village behavior and lightweight public surfaces.

Delete:

- `Character`, `Space`, `SpaceTheme`
- Character/space use cases and services
- Character/space ports
- Character/space JPA entities and repositories
- `InitializeUserVillageUseCase`
- `InitializeUserVillageService`
- `UserRegisteredEventConsumer`
- character/space web responses, exceptions, and tests

Keep:

- `PositionHandler`
- `PositionBroadcast`
- `PositionDisconnectListener`
- `TypingHandler`
- `VillageBoardService`
- `DailyVisit`
- `Suggestion`
- Village dashboard read model

Identity may continue to publish `user.registered` if other consumers need it, but Village no longer consumes it to create personal records.

## 5. Database Design

Add a new Flyway migration. Do not edit historical migrations.

Drop tables in child-before-parent order:

```sql
DROP TABLE IF EXISTS character_equipment;
DROP TABLE IF EXISTS space_placement;
DROP TABLE IF EXISTS character;
DROP TABLE IF EXISTS space;
DROP TABLE IF EXISTS user_item_inventory;
DROP TABLE IF EXISTS item_definition;
DROP TABLE IF EXISTS point_transaction;
DROP TABLE IF EXISTS point_wallet;
```

Existing data in those tables is intentionally removed.

## 6. Documentation Design

Update docs so the current project model is consistent and does not describe removed concepts as active, pending, or deprecated product features.

Required surfaces:

- `README.md`
- `docs/planning/project-overview.md`
- `docs/architecture/erd.md`
- `docs/architecture/erd.mermaid`
- `docs/architecture/domain-boundary.md`
- `docs/wiki/village/space-system.md` and `docs/wiki/village/character-system.md`, either removed or replaced with runtime presence documentation
- `docs/specs/api/village.md`
- handover track/index files

## 7. Issue and Track

Create one GitHub issue for the full transition:

> Remove persisted personalization and re-center project around librarian RAG

The issue should include checklist items for:

- backend character/space removal
- database drop migration
- test cleanup
- README and architecture docs
- ERD cleanup
- RAG boundary documentation
- verification

Create a matching handover track and feature spec for this work.

## 8. Verification

Run the strongest feasible local verification:

- Backend compile or `./gradlew.bat --no-daemon test`
- Search for stale active references to personal space, character persistence, points, items, inventory, wallet, and Economy
- Confirm removed API specs match controller behavior
- Confirm Flyway migration order and target table names
- Confirm frontend no longer calls removed character/space APIs, or update those calls if present

## 9. Risks

- This is a large PR touching code, DB, tests, and docs.
- Existing frontend code may still call removed character/space endpoints.
- Existing DB data for personalization and economy is deleted by migration.
- RAG implementation details should not expand into general chat memory in this track.
