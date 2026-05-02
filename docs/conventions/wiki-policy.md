# Wiki 활용 정책 — 카파시 LLM Wiki 패턴

> 트랙 `harness-spec-driven` (Issue #46, 2026-04-30) 도입.
>
> 사고 과정과 결정의 ADR 은 [learning/67](../learning/) (P5 작성 예정).

---

## 1. Wiki 의 역할

`docs/wiki/` 는 **현재형** 지식 베이스다. "이 시스템이 *지금* 어떻게 작동하는가" 에 답한다.

### 1.1 다른 문서와의 차이

| 문서 | 시제 | 답하는 질문 |
|------|------|-----------|
| **Wiki** (`docs/wiki/`) | 현재형 | 이 시스템이 어떻게 작동하는가? |
| Spec (`docs/specs/features/`) | 미래형 | 이 트랙으로 무엇을 달성하나? |
| Track (`docs/handover/track-*.md`) | 진행형 | 지금 어디까지 했나? |
| Learning (`docs/learning/`) | 과거형 | 왜 이 결정을 했나? |

→ 4개는 시제·역할이 달라 어느 하나가 다른 것을 흡수할 수 없다 ([spec-driven.md](./spec-driven.md) §1).

### 1.2 Wiki 가 답하는 것 (예시)

- "마을 공개 채팅 흐름이 어떻게 동작하지?" → `wiki/communication/chat-architecture.md`
- "JWT 인증·게스트 정책은?" → `wiki/identity/auth-flow.md`, `guest-policy.md`
- "Outbox 패턴이 왜·어떻게 쓰이지?" → `wiki/infra/outbox-pattern.md`
- "hook 자동화 5종이 무엇 무엇?" → `wiki/infra/hooks-automation.md`

→ **신규 인입자(또는 새 LLM 세션)가 코드를 안 읽어도 시스템 그림을 잡는 유일한 자산.** 카파시 LLM Wiki 패턴의 핵심.

---

## 2. 갱신 자동화 4종

Wiki 의 가치는 **현재형 정확성** 이다. 묵으면 도리어 거짓 컨텍스트가 된다. 본 트랙(`harness-spec-driven`)에서 갱신 강제 4종을 도입한다:

### 2.1 `/track-end` 의 wiki 영향 분석 (P3 산출물)

트랙 종료 시 `/track-end` 스킬이 자동으로:

1. 트랙이 건드린 도메인 식별 (변경 파일 경로 패키지)
2. 해당 도메인의 wiki 페이지 자동 매핑 (예: `communication/*` 변경 → `wiki/communication/*.md` 후보)
3. 영향받은 wiki 페이지 체크리스트 생성 — "갱신 필요한가?" 사용자 결정
4. 갱신 결정 시 머지 PR 안에 wiki 커밋 묶기 (별도 docs PR 금지 — `parallel-work.md` §8 정합)

### 2.2 `wiki-lint` 주간 cron (P4 산출물)

- 매주 월요일 09:00 KST. 회수된 dependency-tracker 슬롯 사용
- 기존 `.claude/skills/wiki-lint` 스킬 자동 실행
- 결과: wiki 노화도 리포트 (마지막 갱신 30일+, 코드와 불일치 의심 페이지) → `docs/wiki/log.md` append

### 2.3 `/spec-new` 의 wiki 링크 의무 입력 (P3 산출물)

`/spec-new {feature}` 가 spec 파일을 만들 때:

- `references` 섹션에 "관련 wiki 페이지" 필드 의무
- 사용자가 비우면 스킬이 강제로 wiki/INDEX 를 띄우고 선택 유도
- 사유: spec 작성 시점이 wiki 검토하기 가장 자연스러운 시점 (요구사항 정의 ↔ 시스템 현재 상태 비교)

### 2.4 SessionStart hook 의 wiki 가시화 (P4 산출물)

`session-start-snapshot.js` hook 강화:

- `docs/wiki/INDEX.md` 와 각 페이지의 last-modified 출력
- 30일 이상 묵은 페이지 표시 (⚠️ 경고)
- 현재 활성 트랙이 건드리는 도메인의 wiki 페이지 자동 추출

→ Claude 가 답변 첫 줄에서 묵은 wiki 가시화. 사용자 / Claude 둘 다 잊지 않는다.

---

## 3. 폐지 권고를 철회한 사고 과정 (2026-04-30)

본 정책 도입 직전, AI Native 하네스 분석 과정에서 wiki 폐지/축소를 일시 권고했다. 사유는 노화(4-15 이후 lint 미실행)와 learning/spec/코드의 역할 중복 의심이었다.

### 3.1 사용자 피드백

- 카파시 LLM Wiki 패턴은 **의도적으로 도입한 자산**. 단순 노화로 폐지 판단하면 안 됨
- 코드 안 읽고 시스템 그림 파악하는 유일한 자산. learning/spec 으로 대체 불가능
- "쓸 환경 고민하는 게 우선"

### 3.2 재분석 결과

- **노화의 원인은 wiki 가 아니라 갱신 동선 부재.** 트랙 종료 시 "어떤 wiki 가 영향받았나" 자동 탐지가 없어서 갱신 시점이 임의 / 수동.
- learning(시점·결정), spec(요구사항), 코드(상세), handover(진행) 와 wiki(현재 시스템) 는 **시제·질문이 다름** (§1.1). 진짜 중복 아님.

### 3.3 결정

- **폐지 권고 철회.** 14페이지 그대로 유지.
- 본 정책으로 갱신 자동화 4종 도입.
- 사고 과정은 learning/67 에 시야 확장용으로 보존 (잘못된 첫 권고 → 사용자 피드백 → 재설계 흐름).

---

## 4. Wiki 작성 룰 (간단)

기존 14페이지의 톤을 유지한다:

- **현재형 진술.** "X 가 Y 한다" (X 가 Y 했었다 X)
- **결정 근거 X**, "지금 어떻게 작동하나" 만. 결정 이유는 learning 으로 link
- **코드 link 권장** — wiki ↔ 실제 파일 매핑이 명확해야 노화 감지 가능
- **다이어그램 적극 활용** — Mermaid / ASCII art

---

## 5. 다른 컨벤션과의 관계

| 컨벤션 | 관계 |
|--------|------|
| [spec-driven.md](./spec-driven.md) | spec 의 `references` 가 wiki 를 link. 둘이 시제 다름 |
| [parallel-work.md](./parallel-work.md) | 트랙 종료 시 wiki 갱신은 머지 PR 안에서 (§8 정합) |
| `comprehension-gate.md` (P3 산출물) | wiki 페이지 자체는 게이트 대상 X (현재형 진술이라 결정 없음) |

---

## 6. 변경 이력

| 날짜 | 변경 | 트랙 |
|------|------|------|
| 2026-04-30 | 본 문서 신설 — 카파시 LLM Wiki 패턴 활용 강화 4종 도입 | `harness-spec-driven` C1 |
