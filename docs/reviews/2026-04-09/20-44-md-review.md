# MD 정합성 리뷰 — 2026-04-09 20-44

## 체크 결과 요약

| 체크 | 항목 | 결과 |
|------|------|------|
| A | AGENTS.md ↔ coding.md | ⚠️ |
| B | phases.md ↔ handover.md | ✅ |
| C | domain-boundary.md ↔ event.md | ℹ️ |
| D | erd.md ↔ handover.md | ✅ |
| E | architecture.md ↔ package-structure.md | ✅ |
| F | ADR ↔ 다른 문서 | ✅ |
| G | CLAUDE.md 원칙 충돌 | 🔴 |
| H | 빈 문서 탐지 | ✅ |
| I | handover.md 신선도 | ✅ |
| J | 깨진 내부 링크 | ✅ |
| K | API 스펙 ↔ Controller | ✅ |
| L | Kafka 이벤트 명세 ↔ 코드 | ✅ |
| M | ERD ↔ Flyway SQL | ✅ |

---

## 상세 결과

### [CRITICAL] CLAUDE.md Critical Rule 4 — 커스텀 예외 위치가 현행 구조와 충돌

**파일:** `CLAUDE.md` (Critical Rules 4항)

CLAUDE.md는 "반드시 `/global/error/`에 정의된 커스텀 예외를 사용한다"고 명시하고 있지만, 실제 구현과 AGENTS.md의 컨벤션은 **`[domain]/error/`** 패키지를 사용한다.

| 문서 | 명시 위치 |
|------|----------|
| CLAUDE.md (현재) | `/global/error/` ← 🔴 stale |
| AGENTS.md | `[domain]/error/` ← ✅ 정확 |
| handover.md (실제 구현) | `identity/error/`, `village/error/`, `communication/error/` ← ✅ 정확 |

CLAUDE.md를 읽는 새 세션이나 새 팀원이 이 규칙을 따르면 모든 예외를 `global/error/`에 넣게 되어 아키텍처 원칙(도메인 자기 소유권)을 위반한다.

**수정 필요:** CLAUDE.md Critical Rule 4의 "반드시 `/global/error/`에 정의된 커스텀 예외를 사용한다" → "반드시 `[domain]/error/`에 정의된 커스텀 예외를 사용한다"

---

### [WARNING] coding.md 4.2 — 예외 위치가 `domain/`으로 잘못 기재

**파일:** `docs/conventions/coding.md:134`

```
도메인별 예외는 해당 도메인의 `domain/` 패키지에 정의한다.
```

실제 구조는 `domain/` 아닌 `error/` 패키지. AGENTS.md 및 실제 코드와 불일치.

**수정 필요:** "`domain/`" → "`error/`"

---

### [INFO] event.md — 미구현 이벤트 누락 (Phase 1~3 기준 의도적 범위)

**파일:** `docs/specs/event.md`

event.md는 "Phase 1~3 구현 기준"임을 상단에 명시하고 있어, `user.registered`만 문서화된 것은 의도적이다.

단, domain-boundary.md에는 Phase 4+에서 구현될 이벤트들이 명시되어 있다:
- `UserSanctioned` (Safety → Identity, Communication)
- `ItemEquipped` (Village)
- `PurchaseCompleted`, `PointEarned`, `PointSpent` (Economy)
- `MessageReported` (Communication → Safety)

Phase 4+ 구현 시 event.md를 함께 업데이트해야 한다는 점을 인지하면 됨.

---

### [INFO] phases.md — "서브에이전트/스킬 세팅"이 이미 완료됨

**파일:** `docs/planning/phases.md` (후속 Phase 섹션)

```
- 서브에이전트 / 스킬 세팅 — Happy Path 구현 후 반복 패턴 파악되면 그때 도입
```

이미 `.claude/skills/` (코드리뷰, 전체리뷰, MD리뷰)로 완료된 작업이다. phases.md에서 제거하거나 체크 표시 필요.

---

### LGTM

**체크 B — phases.md ↔ handover.md 완전 일치**
Phase 0~3이 phases.md에 `[x]` 완료, handover.md에도 동일하게 ✅ 반영됨.

**체크 D — ERD ↔ Flyway SQL 완전 일치**
ERD 정의 20개 테이블(users, user_local_auth, user_social_auth, space, space_placement, character, character_equipment, point_wallet, point_transaction, item_definition, user_item_inventory, category, chat_room, chat_room_category, participant, report, sanction, outbox_event, processed_event, idempotency_request) 모두 V1__initial_schema.sql에 존재.

**체크 J — 내부 링크 전수 확인**
참조된 모든 파일 실재 확인:
- `docs/frontend/space.md` ✅
- `docs/architecture/erd.mermaid` ✅
- `docs/learning/08-domain-entity-design.md` ✅
- `docs/specs/api/overview.md` ✅

**체크 K — API 스펙 ↔ Controller 완전 일치**
| 스펙 엔드포인트 | Controller 구현 |
|----------------|----------------|
| POST `/api/v1/auth/register` | AuthController.register() ✅ |
| POST `/api/v1/auth/guest` | AuthController.guest() ✅ |
| GET `/api/v1/village/characters/me` | VillageController.getMyCharacter() ✅ |
| GET `/api/v1/village/spaces/me` | VillageController.getMySpace() ✅ |
| POST `/api/v1/chat-rooms` | ChatRoomController.createChatRoom() ✅ |
| POST `/api/v1/chat-rooms/{chatRoomId}/messages` | ChatRoomController.sendMessage() ✅ |

**체크 L — Kafka 이벤트 토픽 일치**
event.md: `user.registered` = UserRegisteredEventConsumer `TOPIC = "user.registered"` ✅

**체크 M — ERD ↔ SQL 전체 일치** (체크 D와 동일)

## 추가 메모

없음
