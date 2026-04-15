# 구현 로드맵 — 마음의 고향

> 무엇을 왜 이 순서로 구현하는지 기록한다.
> 완료된 Phase는 `docs/history/`에 기록하고 여기서는 체크만 한다.
> 현재 진행 중인 Phase는 `docs/handover.md`에서 확인한다.

---

## Happy Path 목표

```gherkin
Scenario: GUEST가 마을에 입장하고 NPC와 채팅 후 회원가입한다
  Given 비회원이 GUEST로 마을에 입장한다
  When GUEST가 NPC에게 채팅을 시도한다
  Then 회원가입이 필요하다는 안내를 받는다
  When 유저가 이메일로 회원가입한다
  Then 기본 캐릭터와 기본 공간이 자동으로 생성된다
  When 유저가 마을의 NPC에게 "안녕하세요"를 전송한다
  Then NPC로부터 응답 메시지를 받는다
```

이 시나리오가 Cucumber로 통과하는 것이 Happy Path 완료 조건이다.

> **GUEST 설계 (방식 A):** GUEST는 DB 레코드 없이 JWT claim(`role=GUEST`)만으로 식별한다.
> 채팅 시도 시 서버가 role을 확인하고 403 + 가입 안내를 반환한다.
> 회원가입 시 새 MEMBER `users` 행을 생성한다. GUEST 세션과의 연속성은 MVP에서 고려하지 않는다.

---

## Phase 0 — Foundation [x]

**목표:** 앱이 뜨고 DB와 연결되는 최소 조건

**이유:** `ddl-auto: validate` 상태라 마이그레이션 없이는 앱 자체가 기동 불가.

| 작업 | 상태 |
|------|------|
| Flyway 의존성 추가 | [x] |
| V1__initial_schema.sql 작성 (전체 ERD 기반) | [x] |
| 앱 기동 확인 | [x] |

---

## Phase 1 — Identity [x]

**목표:** 회원가입 → JWT 발급 → 인증된 요청

**이유:** `user_id`가 없으면 다른 모든 도메인이 동작하지 않는다. 모든 것의 기반.

| 작업 | 상태 |
|------|------|
| User Domain Entity + Port 정의 | [x] |
| UserLocalAuth Persistence Adapter | [x] |
| 이메일 회원가입 UseCase | [x] |
| GUEST 토큰 발급 UseCase | [x] |
| JWT 발급/검증 (JwtProvider, JwtFilter) | [x] |
| Spring Security 설정 | [x] |
| AuthController (Web Adapter) | [x] |
| Cucumber: 회원가입 → JWT 발급 시나리오 | [x] |

> **소셜 로그인(Google/Kakao)은 Happy Path 이후에 붙인다.**
> 외부 OAuth2 의존이 생기면 속도가 느려진다.

---

## Phase 2 — Village [x]

**목표:** 로그인 유저에게 기본 캐릭터 + 기본 공간 자동 생성

> **UI 방향 (확정):** 그럴듯한 비주얼은 지금 필요 없다. 로컬에서 마을 입장 → 캐릭터 이동 → NPC 식별이 되면 완료다. 디자인·에셋은 Happy Path 완료 후 별도 결정한다.

**이유:** Happy Path 시나리오에서 "마을에 입장한다"는 전제가 필요하다.

| 작업 | 상태 |
|------|------|
| Character Domain Entity | [x] |
| Space Domain Entity | [x] |
| 회원가입 이벤트 → 캐릭터/공간 자동 생성 (Transactional Outbox + Kafka) | [x] |
| Character 조회 API (게스트: 인메모리 임시 캐릭터) | [x] |
| Space 조회 API (게스트: 403) | [x] |
| Cucumber: 가입 후 캐릭터/공간 존재 확인 시나리오 (비동기 폴링) | [x] |
| Cucumber: 게스트 캐릭터 조회 / 공간 조회 403 시나리오 | [x] |

---

## Phase 3 — Communication (WebSocket) [x]

**목표:** 채팅방 생성 → 메시지 전송/수신

**이유:** 서비스의 본질. Happy Path 완료 조건인 "NPC와 대화"가 여기에 있다.

| 작업 | 상태 |
|------|------|
| ChatRoom Domain Entity | [x] |
| Participant Domain Entity | [x] |
| 채팅방 생성 UseCase | [x] |
| WebSocket(STOMP) 설정 | [x] |
| 메시지 전송/수신 Handler | [x] |
| NPC 응답 (하드코딩, AI 없음) | [x] |
| Cassandra 메시지 저장 | [x] |
| Cucumber: NPC 채팅 Happy Path 시나리오 | [x] |

> **NPC 응답은 하드코딩으로 시작한다.**
> 로컬 LLM, Claude API 연동은 Happy Path 완료 이후 별도 Phase로 분리한다.

---

## ✅ Happy Path 완료 (Phase 0 ~ Phase 3)

```gherkin
Scenario: GUEST가 마을에 입장하고 NPC와 채팅 후 회원가입한다
  Given 비회원이 GUEST로 마을에 입장한다              ← Phase 1 (게스트 토큰)
  When GUEST가 NPC에게 채팅을 시도한다               ← Phase 3 (403 반환)
  Then 회원가입이 필요하다는 안내를 받는다
  When 유저가 이메일로 회원가입한다                   ← Phase 1
  Then 기본 캐릭터와 기본 공간이 자동으로 생성된다    ← Phase 2 (Kafka 이벤트)
  When 유저가 마을의 NPC에게 "안녕하세요"를 전송한다  ← Phase 3
  Then NPC로부터 응답 메시지를 받는다                 ← Phase 3 (하드코딩 응답)
```

이 시나리오는 Cucumber로 검증 완료됐다.

---

## Phase 4 — Economy [ ]

**목표:** 포인트 획득 → 아이템 구매 → 인벤토리 확인

**이유:** Happy Path(대화 경험)와 독립적이라 이후에 붙인다. 동시성이 핵심 기술 과제.

| 작업 | 상태 |
|------|------|
| PointWallet Domain Entity (낙관적 락) | [ ] |
| ItemDefinition, UserItemInventory | [ ] |
| 광고 시청 → 포인트 적립 UseCase (멱등성) | [ ] |
| 아이템 구매 UseCase (동시성 검증) | [ ] |
| 공간 배치 / 캐릭터 장착 UseCase | [ ] |
| Cucumber: 포인트 획득 → 구매 → 장착 시나리오 | [ ] |

---

## Phase 5 — AI NPC 고도화 [~]

**목표:** 하드코딩 응답 → 실제 AI 응답으로 교체 + 대화 맥락 유지

**이유:** Phase 3에서 NPC 인터페이스를 미리 Port로 뽑아두었고, 구현체만 교체하면 된다.

**전략 결정 (2026-04-14):**
- 개발/데모: Ollama + EXAONE 3.5 (LG AI Research, 한국어 특화)
- 프로덕션: 상용 API (GPT-4o-mini $2.7/월 or Claude Haiku $16.8/월)
- 대화 맥락: pgvector (PostgreSQL 벡터 확장) — Cassandra 원본 + pgvector 요약 벡터
- 6개 모델 비교 테스트 (72회) + 보안 테스트 (8개 시나리오) 완료

| 작업 | 상태 |
|------|------|
| Ollama 로컬 LLM 연동 (EXAONE 3.5) | [x] |
| NPC 응답 비동기 분리 (@Async) | [x] |
| NPC 페르소나 정의 (다정한 마을 주민) | [x] |
| 6개 모델 비교 테스트 + 보안 테스트 | [x] |
| 프로덕션 전략 결정 (로컬→API 이중 전략) | [x] |
| 대화 맥락 유지 — pgvector 테이블 설계 | [x] |
| 대화 요약 파이프라인 (Kafka → LLM 요약 → pgvector) | [x] |
| 상용 API 어댑터 (ClaudeApiAdapter or OpenAiAdapter) | [ ] |
| 위험 신호 감지 → 전문 상담 안내 | [ ] |

---

## 후속 Phase (Happy Path 이후 판단)

- **Safety** — 신고/제재 시스템
- **소셜 로그인** — Google, Kakao OAuth2
- **프론트엔드 UI** — Phaser.js 마을 공간
- **Notification** — FCM Web Push
- **서브에이전트 / 스킬 세팅** — ✅ 완료 (`.claude/skills/`: 코드리뷰, 전체리뷰, MD리뷰)
