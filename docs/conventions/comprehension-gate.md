# Comprehension Gate — 13 카테고리 / Tier A·B·C

> 트랙 `harness-spec-driven` C3 도입 (Issue #46, 2026-04-30).
> 의사결정 근거: [learning/66](../learning/66-spec-driven-fix-loop-comprehension-gate.md).

---

## 1. 게이트의 정체

자동 fix-loop 안에서 사용자가 끼어드는 마지막 지점. `/step-start` 가 PR 생성 직전에 발동.

> "코드는 작동하지만 네 것이 아니게 된다" — 자동화의 함정.
> 게이트는 **본인 말로 답하기** 를 강제해 결정 누락을 막는다.

위치: `/step-start` 스킬 안. 단위 테스트 통과 → review-agent 통과 → **여기** → PR 생성.

마플 커피챗 인사이트와의 정합: 트레이드오프 토론 / 시스템적 빈틈 방어 / 본인 말로 풀게.

---

## 2. 무엇을 묻나 / 안 묻나

### 2.1 안 묻는다 (자동 스킵)

- 자바·스프링 기초 (`Optional.of` vs `ofNullable`, `@Transactional` 일반 동작 등)
- 단순 CRUD/DTO/매핑 추가
- 라이브러리 표준 사용 (그냥 `RestClient.get()`, 반복적 `findBy*`)
- 테스트 코드만 변경
- 문서/마크다운만 변경

### 2.2 묻는다 ("선택의 근거" 가 있는 곳만)

- "A 대신 B 로 갈 수 있었는데 왜 A 인가?"
- "이 결정의 빈틈은 무엇이고, 어떤 신호가 오면 재검토하나?"
- "이 결정이 나중에 어떤 것을 막거나 풀어주는가?"

룰: **단일 옵션밖에 없는 자바·스프링 기초 X. "A vs B 결정" 이 있는 곳만.**

---

## 3. Tier 시스템

| Tier | 발동 조건 | 질문 깊이 | 형식 |
|------|----------|---------|------|
| **A (자동 스킵)** | §4 13 카테고리 어디에도 매칭 X / 단순 CRUD / 테스트만 / 문서만 | 0 질문 | 침묵 |
| **B (얕은 확인 1~2질문)** | 카테고리 #1~#4 매칭 + 기존 학습노트 패턴 재현 | 시나리오 1개 | "이 시나리오에서 어떻게 동작?" |
| **C (깊은 검증 3축)** | 카테고리 #5~#13 매칭 / spec.decisions 변경 / 새 결정 | **왜·대안·빈틈 3축** | 자유 텍스트 1~3줄씩 |

> **복수 카테고리 매칭 시 최종 Tier = 가장 높은 (C > B > A).**
> 예: #1 동시성(B) + #6 DB 스키마(C) 동시 매칭 → 최종 C. 한 step 에 여러 결정이 섞이면 가장 깊은 검증을 적용한다.

---

## 4. 13 카테고리 + 자동 식별 룰

| # | 카테고리 | git diff 자동 식별 룰 | Tier 기본 |
|---|---------|-------------------|---------|
| 1 | 동시성 | `@Transactional` · `synchronized` · `Atomic*` · `@Version` · `Redisson` · `Lock` · CAS | B |
| 2 | 멱등성 | `idempotency` · `Outbox` · `ON CONFLICT` · `UNIQUE` 신규 제약 · 중복 체크 로직 | B |
| 3 | 트랜잭션 경계 | `propagation=` · `REQUIRES_NEW` · `readOnly=` 변경 · 트랜잭션 분할/병합 | B |
| 4 | 외부 시스템 호출 | Kafka publish · `RestClient`/HTTP · LLM 호출 · FCM 발송 (실패·타임아웃·재시도) | B |
| 5 | spec 트레이드오프 | `spec.md` `decisions` 섹션 변경 | C |
| 6 | DB 스키마/인덱스 | `db/migration/V*` 신규 · `@Index` · `@Column(unique)` · 타입 변경 | C |
| 7 | API 설계 | 신규 `@*Mapping` · Response DTO 구조 변경 · status 코드 결정 | C |
| 8 | 이벤트/메시징 | 신규 토픽 · `@KafkaListener` · Outbox 신규 · 컨슈머 그룹 변경 | C |
| 9 | 인증/인가 | `global/security/` 변경 · `Authority` enum · `@PreAuthorize` 신규 | C |
| 10 | 캐시 | Redis client 신규 사용 · `@Cacheable` · TTL 설정 | C |
| 11 | 예외/에러 모델 | `error/` 신규 파일 · `@ControllerAdvice` 변경 · error code 추가 | C |
| 12 | 헥사고날 경계 | `port/in,out/` 신규 인터페이스 · 도메인↔어댑터 경계 변경 | C |
| 13 | **새 기술/의존성** | `build.gradle.kts` `dependencies {}` 신규 라인 · `application.yml` 신규 키 · 새 `@Configuration`/`@Bean` 구성 | C |

---

## 5. Tier C 표준 형식 (3축)

```text
🧠 Comprehension Gate — Tier C
파일: {path}:{line-range}
카테고리: [{#}] {카테고리명}
변경: {1줄 요약}

질문 1 [왜?]
  {결정 한 줄}. {대안 X / 일반 표준} 대신 이걸 선택한 이유?

질문 2 [대안?]
  대안 옵션 (X / Y / Z) 중 왜 이거? — 가능한 후보 N개 명시

질문 3 [빈틈?]
  {가정 / 위험 / 모니터링 신호} 중 무엇이 가장 위험?

[a] 1~3줄 답 (자유 텍스트)
[b] 모르겠음 → 해설 + learning #?? 후보 (RESERVED 자동 예약)
[c] 스킵 (이번 step 한정 — §6 누적 룰 참조)
```

Tier B 는 위 중 질문 1만.

---

## 6. 누적 / 스킵 / 학습노트 연동

### 6.1 답변 누적

- Tier B/C 답변은 `docs/learning/comprehension/{trackId}/step-{N}.md` 에 누적
- 트랙 종료 시 `/track-end` 가 종합 리포트 자동 생성

### 6.2 [c] 스킵 룰

- step 1회 한정 — 다음 step 부터는 다시 묻는다
- 트랙 누적 스킵 ≥ 3 회 → 트랙 종료 시 회고 메시지: "{N} 회 스킵 — 무엇이 아직 모호한가?"

### 6.3 [b] 모르겠음 → 학습노트 후보

- learning-agent 자동 호출 → 해설 작성
- `docs/learning/_drafts/{topic}.md` 초안 생성
- RESERVED.md 에 자동 예약 (자기 트랙 번호 대역 안에서)

---

## 7. 자동 통과 조건 (게이트가 침묵)

- 변경 파일이 §4 13 카테고리 어디에도 매칭 X (Tier A)
- spec.md `decisions` 에 해당 카테고리 항목이 4축(왜·대안·빈틈·재검토) 으로 미리 채워져 있음 → "이미 답했음" 으로 자동 통과
- 같은 패턴을 다룬 기존 learning 노트가 있고, 변경이 그 패턴의 단순 적용 → "learning #{N} 패턴 재현. 새로 알게 된 점 있나?" 1줄 확인만

→ **spec 을 잘 쓰면 게이트는 침묵.** 게이트의 진짜 역할은 "spec 누락 자동 탐지".

### 7.1 "이미 답했음" 자동 통과 매칭 룰

`spec.decisions` 의 `D{n}. [{카테고리}]` 헤더와 `/step-start` 가 식별한 §4 카테고리 #i 가 다음 조건으로 매칭되면 자동 통과:

| 매칭 축 | 룰 |
|--------|----|
| **카테고리명** | `D{n}` 헤더의 `[{카테고리}]` 텍스트 ↔ §4 표 "카테고리" 컬럼 동일 (예: `[동시성]` ↔ #1, `[새 기술·의존성]` ↔ #13) |
| **4축 채워짐** | `D{n}` 본문에 `왜` / `대안` / `빈틈` / `재검토 트리거` 4개 sub-bullet 모두 비어있지 않음 |
| **스코프** | `D{n}` 의 결정 한 줄이 현재 step diff 의 변경과 의미상 일치 (사람 검수, 자동 X) |

3축 모두 만족 → 침묵. 하나라도 미충족 → 일반 질문 흐름. 2번째 축(4축 채워짐) 만 부분 충족이면 부족한 축만 묻는 partial 모드 (Tier C 표준 형식 §5 의 해당 질문만).

---

## 8. 금지 예시 (절대 묻지 마라)

| 예시 질문 | 왜 금지 |
|----------|---------|
| "이 메서드는 무슨 일을 하나?" | well-named identifier 가 답한다. 코드 리딩이지 결정 검증 아님 |
| "@Transactional 이 뭔가?" | 자바·스프링 기초. 13 카테고리에 일반 동작은 없다 |
| "Stream API 가 뭔가?" | 라이브러리 표준 사용 |
| "Optional.of vs ofNullable 차이?" | 자바 기초 |
| "이 if 블록은 어떤 조건에 들어가나?" | 조건문 읽기 — 코드 리딩 |

→ 게이트는 **결정 검증** 만. 코드 이해 검증 X.

---

## 9. 위험 / 한계

| 위험 | 완화 |
|------|------|
| 13 카테고리 → 너무 자주 발동 | Tier A 자동 스킵이 80% 잡음. CRUD step 에선 침묵 |
| Tier C 3 질문 매번 풀로 답 → 피곤 | spec.decisions 미리 채우면 자동 통과 (§7) |
| 자동 식별 오탐 (false positive) | P5 dry-run 에서 정확도 측정 → 룰 튜닝 (회귀 PR 분리) |
| 자바·스프링 기초 질문 섞임 | 본 §8 금지 예시 명시 |
| [c] 스킵 남발 → 게이트 무용 | §6.2 누적 스킵 회고 메시지 |

---

## 10. 다른 컨벤션과의 관계

| 컨벤션 | 관계 |
|--------|------|
| [spec-driven.md](./spec-driven.md) | spec.decisions 의 4축 (왜·대안·빈틈·재검토) 과 본 게이트의 Tier C 3축 (왜·대안·빈틈) 이 1:1 매핑. 재검토 트리거는 spec 만, 게이트는 step 시점 확인 |
| [wiki-policy.md](./wiki-policy.md) | wiki 페이지 자체는 게이트 대상 X (현재형 진술이라 결정 없음) |
| `/step-start` SKILL.md | 게이트의 호출 지점. fix-loop 의 단위 테스트·review-agent 통과 후 발동 |
| `learning-agent` | [b] 모르겠음 답변 시 자동 호출 |
| `tradeoff-rehearsal-agent` | spec.decisions 4축을 5질문으로 변환 (트랙 종료 후 회고 시 활용) |

---

## 11. 변경 이력

| 날짜 | 변경 | 트랙 |
|------|------|------|
| 2026-04-30 | 본 문서 신설 (13 카테고리 + Tier A/B/C + 자동 식별 룰) | `harness-spec-driven` C3 |
