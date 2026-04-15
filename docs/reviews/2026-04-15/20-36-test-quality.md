# 테스트 품질 리뷰 — 2026-04-15

> Reviewer: Claude (test-quality-agent) + OpenAI Codex (gpt-5.4)
> Scope: backend/src/test/java 전체 + 현재 브랜치(feat/realtime-position-sharing) 변경사항

---

## Codex Review 결과 요약

Codex는 변경된 코드(프론트엔드 위치 공유 기능) 중심으로 리뷰했으며, 테스트 코드 자체보다 기능 결함에 집중했다.

- **[P1]** `sendPositionThrottled()`가 STOMP 연결 전에 publish 가능 — `VillageScene.ts:393-396`
- **[P1]** 게스트 anonymous 연결 시 위치 공유 미작동 — `useStomp.ts:75-78`
- **[P2]** 유휴 상태에서도 100ms마다 위치 broadcast — `VillageScene.ts:93-96`

---

## 보완 검증 결과

### (1) BDD 형식 — Given-When-Then 구조

| 파일 | 판정 | 비고 |
|------|------|------|
| `SendMessageServiceTest.java` | LGTM | Given-When-Then 주석 명확, `@Nested`로 성공/실패 분리, 한글 메서드명이 행동 서술 |
| `NpcReplyServiceTest.java` | LGTM | 동일 구조 |
| `StompAuthChannelInterceptorTest.java` | LGTM | 동일 구조 |
| `HexagonalArchitectureTest.java` | LGTM | ArchUnit 규칙이므로 BDD 불필요, 적절한 `@DisplayName` |
| Cucumber .feature 파일 | LGTM | Given-When-Then 한글 시나리오, 비즈니스 언어 사용 |

### (2) 케이스 완전성

| 항목 | 판정 | 설명 |
|------|------|------|
| `SendMessageServiceTest` — 실패 케이스 | LGTM | NPC 없음, 빈 메시지, null, 1000자 초과, 동시성(UNIQUE 위반) 모두 커버 |
| `NpcReplyServiceTest` — 실패 케이스 | [WARNING] | LLM 연결 실패만 테스트. `saveMessagePort.save()` 실패 시 동작 미검증 |
| `StompAuthChannelInterceptorTest` | LGTM | 유효 토큰, 무토큰, 만료 토큰, Bearer 없음 등 엣지케이스 충분 |
| Cucumber npc_chat.feature | LGTM | 게스트 403, 회원 전송 성공, 빈 메시지 400 커버 |

### (3) 테스트 독립성

| 항목 | 판정 | 설명 |
|------|------|------|
| `@BeforeAll static` 사용 | [INFO] | `HexagonalArchitectureTest`에서 `@BeforeAll static`으로 ClassFileImporter 사용. 읽기 전용이므로 문제 없음 |
| `@Transactional` in test | LGTM | 테스트 코드에 `@Transactional` 없음 (grep 결과 0건) |
| Cucumber `@ScenarioScope` | LGTM | `ScenarioContext`가 시나리오마다 새 인스턴스 생성 — 상태 오염 방지 |
| `BaseTestContainers` static 블록 | LGTM | 컨테이너 JVM당 1회 기동, 읽기 전용 인프라 |

### (4) 의미 없는 테스트

| 항목 | 판정 | 설명 |
|------|------|------|
| assert 없는 테스트 | LGTM | 모든 `@Test` 메서드에 `assertThat`, `assertThatThrownBy`, 또는 `verify` 존재 |
| `HealthCheckSteps.서버가_실행_중이다()` | [INFO] | 빈 메서드이지만 Given 단계의 문서화 목적. 주석으로 의도 명시됨 |

### (5) 통합 테스트

| 항목 | 판정 | 설명 |
|------|------|------|
| Testcontainers | LGTM | PostgreSQL(pgvector), Redis, Kafka, Cassandra 4개 컨테이너 병렬 기동 |
| Cucumber BDD 통합 | LGTM | `@SpringBootTest(RANDOM_PORT)` + Testcontainers로 실제 인프라 연동 |
| Mock 과용 | [INFO] | 단위 테스트(SendMessage, NpcReply, StompAuth)는 Mockito 사용 — 적절. 통합 검증은 Cucumber가 담당 |

### (6) 테스트 누락 — [CRITICAL]

| 누락 대상 | 판정 | 설명 |
|-----------|------|------|
| `CreateChatRoomService` | **[CRITICAL]** | 단위 테스트 없음. 트랜잭션 내 ChatRoom + 2개 Participant 생성 로직 미검증 |
| `LoadChatHistoryService` | [WARNING] | 단위 테스트 없음. 단순 위임이지만 limit 경계값(0, 음수) 미검증 |
| `LoginService` | **[CRITICAL]** | 단위 테스트 없음. 비밀번호 불일치, 미등록 이메일 등 인증 핵심 로직 미검증 |
| `RegisterUserService` | [WARNING] | Cucumber에서 간접 검증되지만 단위 테스트 없음. Outbox 이벤트 저장 로직 미검증 |
| `IssueGuestTokenService` | [INFO] | Cucumber에서 간접 검증됨. 단순 위임이므로 우선순위 낮음 |
| `GetMyCharacterService` | [WARNING] | 단위 테스트 없음. `CharacterNotFoundException` 발생 케이스 미검증 |
| `GetMySpaceService` | [WARNING] | 단위 테스트 없음. `SpaceNotFoundException` 발생 케이스 미검증 |
| `InitializeUserVillageService` | [WARNING] | 단위 테스트 없음. 멱등성(중복 호출 시 무시) 로직 미검증 |
| `PositionHandler` (신규) | **[CRITICAL]** | 테스트 없음. Principal이 null/AuthenticatedUser 아닌 경우, 게스트/멤버 분기 미검증 |
| `PositionDisconnectListener` (신규) | **[CRITICAL]** | 테스트 없음. LEAVE broadcast 로직 미검증 |
| Domain 클래스 (`ChatRoom`, `Message`, `Character`, `Space`, `User`) | [WARNING] | 도메인 로직(팩토리 메서드, 유효성 검증) 직접 테스트 없음. 서비스 테스트에서 간접 검증만 |
| Cucumber npc_chat.feature | [INFO] | "빈 메시지" 시나리오는 있으나 "1000자 초과" 시나리오 없음 (단위 테스트에서 커버) |

---

## [CRITICAL] 항목 요약

1. **CreateChatRoomService** — 단위 테스트 완전 부재. 채팅방+참여자 생성 트랜잭션 무결성 미검증.
2. **LoginService** — 인증 핵심 서비스에 단위 테스트 없음. 비밀번호 검증, 미등록 이메일 예외 등 필수 케이스 미검증.
3. **PositionHandler** (신규 코드) — CLAUDE.md Critical Rule #5 위반: "테스트 없는 기능 완료 금지". 새로 추가된 WebSocket 핸들러에 테스트가 전혀 없음.
4. **PositionDisconnectListener** (신규 코드) — 동일하게 Critical Rule #5 위반. 세션 종료 시 LEAVE broadcast 로직 미검증.

