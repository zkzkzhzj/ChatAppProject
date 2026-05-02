# 66. Spec-driven 4층 + 자동 fix-loop + Comprehension Gate — 하네스를 어떻게 다시 짰나

> 작성 시점: 2026-04-30
> 트랙: `harness-spec-driven` (Issue #46) — 메타·도구 트랙
> 출발점: "내가 너를 똑똑하게 못 쓰는 것 같다" — 사용자가 던진 한 줄
> 산출물: [`spec-driven.md`](../conventions/spec-driven.md), [`comprehension-gate.md`](../conventions/comprehension-gate.md), [`/spec-new`·`/track-start`·`/step-start`·`/track-end`](../../.claude/skills/) 4종

---

## 0. 이 노트는 어떻게 읽어야 하나

이 노트는 "어떤 프레임워크를 도입했다"의 기록이 아니다.
**"왜 어떤 건 가져오고 어떤 건 안 가져왔는가"** 의 기록이다.

외부에서 인기 있는 하네스 프레임워크 (BMAD-METHOD / GitHub Spec Kit / AB Method / SuperClaude) 를 다 살펴봤고, 그 중 마음의 고향에 맞는 패턴 6개만 골라 1 PR · 5 커밋으로 통합했다. 안 가져온 것들은 더 의미 있다 — 메모리 `marpple_coffee_chat_insights.md` 의 "AI 에 끌려다니지 말라" 와 정합.

본인 답안 슬롯이 마지막에 있다. 이 노트의 끝은 "Spec Kit 풀세트 도입은 왜 안 했는가" 를 자기 말로 답할 수 있게 되는 것.

---

## 1. 출발점 — 무엇이 부족했나

세션 시작 분석에서 확인한 사실:

- **자산은 최상급.** 26개 서브에이전트, 5개 hook, 트리플 핸드오버 (메인 / INDEX / 트랙별), `RESERVED.md` 번호 충돌 회피, learning 노트 60+개. context-health-agent 평가 "동급 1인 프로젝트 중 최상위".
- **체감은 최하급.** GH 이슈 → 채팅 → 코드 → handover. 매 검증 단계 사용자 개입 필요. 새 기술 도입 시 트레이드오프 토론 강제 X. 진행 상태 단일 진실 위치 모호.

**진짜 부족했던 건 자산이 아니라 진입 동선과 1커맨드 절차.**

→ 풀세트 (Spec Kit / BMAD / AB Method 등) 그대로 도입은 함정. 자산이 부족한 게 아니라 **소비 채널이 부족한 거니까**, 그 채널만 만들면 됨.

---

## 2. 외부 트렌드 — 무엇이 있었고 무엇을 골랐나

| 프레임워크 | 핵심 패턴 | 도입? | 왜 / 안 왜 |
|----------|---------|-----|----------|
| **GitHub Spec Kit** | constitution / spec / plan / tasks 4문서 분리 + 슬래시 명령 | ✅ 핵심 차용 | constitution 은 이미 `CLAUDE.md` 가 그 자리. spec / plan / tasks 만 정착지 추가 |
| **BMAD-METHOD** | PM/Architect 페르소나가 PRD → Scrum Master 가 스토리에 컨텍스트 임베드 → Dev | △ "스토리 임베드" 1개만 | 페르소나 12개는 solo overkill ([Signal from Noise](https://www.signalfromnoise.co.uk/articles/bmad-method) "phase-gating creates friction"). spec 파일에 wiki·learning 링크 미리 박아 다음 세션이 그 파일 하나로 시작하는 아이디어만 차용 |
| **AB Method** | task → mission 2단 분해 + sub-agent 위임 | ✅ step 표기만 차용 | "프레임워크 설치" 는 폴더 구조 강제 → 거부. 1 step = 1 PR 표기만 가져옴 |
| **Plan Mode → Approve → One-step-at-a-time** | 매 단계 승인 게이트 | ✅ 이미 있음, 보강 | `CLAUDE.md` §5 에 거의 동일. fix-loop 만 끼움 |
| **Orchestrator 6-step Loop** (IMPLEMENT → VERIFY → REVIEW → FIX → RE-VERIFY → SCORE) | 자체 verify + 외부 review 묶기 | ✅ fix-loop 로 진화 | Codex / CodeRabbit 이미 붙어 있고, post-commit hook 자동. 부족한 건 "검증 실패 → 자동 수정" 루프 1개. 그것만 추가 |
| **Session 분리 (한 task 한 conversation + handover dump)** | 컨텍스트 오염 회피 | △ 이미 있음 | 트랙별 handover 가 절반 이미 함. 명시적 dump 절차만 `/track-end` 에 |

→ **결론**: 6개 패턴 중 **2개 (Spec Kit 4문서 + Orchestrator fix-loop) 가 핵심**. 나머지는 이미 갖춰진 자산을 약간 다듬는 정도.

---

## 3. 4층 분리 모델 — 왜 4개인가

[`spec-driven.md`](../conventions/spec-driven.md) §1 에 정확히 이 표:

| 층 | 위치 | 시제 | 답하는 질문 |
|----|------|------|-----------|
| **Issue** | GitHub | — | 외부 트리거 |
| **Spec** | `docs/specs/features/{feature}.md` | 미래형 | 무엇을 달성? |
| **Track** | `docs/handover/track-{id}.md` | 진행형 | 지금 어디까지? |
| **Step** | track §3 + PR | — | 이 작업 단위로 무엇을? |

### 왜 합치지 않았나

- Issue 만 쓰면 → **닫힌 후 컨텍스트 휘발.** 다음 세션이 git log 로만 추적
- Spec 만 쓰면 → **진행 상태 모름.** 매번 git log 로 "어디까지?" 재추적
- Track 만 쓰면 → **요구사항이 진행 상태에 섞여 변형.** 6개월 후 "원래 뭘 만들려 했지?" 모름
- Step 만 쓰면 → **트랙 단위 일관성 없음.** 각 PR 이 고립

→ **4개를 분리하면 각 층이 자기 시제로만 갱신되어 깨끗하다.**

이건 wiki vs spec vs learning vs 코드 의 시제 분리와 같은 패턴 ([wiki-policy.md](../conventions/wiki-policy.md) §1.1).

### 실측 데이터 — GH 이슈 사용 패턴

분석 시점 스냅샷: 너의 이슈 #28~#42 중

- #28 / #40 / #42 — 버그 리포트 (트리거)
- #31 / #32 / #33 / #34 / #35 — `track:ws-redis` Step 3~7 (각 step 이 이슈 1개)
- #38 — Feature
- #41 — 단발 핫픽스 (PR description 만으로 종료)

→ **너는 이미 이슈를 step 단위로 쓰고 있었다.** 4층 모델은 이 패턴을 깨지 않는다 — 오히려 spec 으로 뒷받침해줌. 이슈 = step 매핑은 1:1 강제 X (트랙 1개에 이슈 1개도 OK).

---

## 4. 1 step = 1 PR — 왜 엄격하게

기존 정책 ([git.md](../conventions/git.md)) "하나의 PR 은 하나의 목적만". 본 트랙에서 **1 step = 1 PR (엄격)** 으로 강화.

이유:

1. **롤백 단위 = step 단위.** spec.tasks 의 한 행이 한 PR 이면, 잘못됐을 때 그 PR 만 revert 하면 spec 의 그 부분만 되돌아간다. 여러 step 을 한 PR 에 합치면 부분 revert 불가
2. **자동 fix-loop 의 입력 단위.** `/step-start N` 이 변경 단위가 작을수록 13 카테고리 자동 식별·Comprehension Gate Tier 결정·자동 수정 시도 모두 정확해짐
3. **CodeRabbit / Codex 6게이트 신뢰도.** PR diff 가 3000+ 줄이면 AI 리뷰어가 놓치는 게 급격히 늘어난다 (외부 리서치 일관)

### 예외

- **메타·도구 트랙** (예: 본 트랙 `harness-spec-driven`) — 1 PR · N 커밋 (phase별)
- 사유: 메타 트랙은 phase 간 의존이 강하고, phase 별 분리 시 도입 효과가 머지 후로 늦춰짐. 닭과 달걀

---

## 5. 자동 fix-loop — 사용자 개입을 2번으로

기존: 작성 → 사용자 검토 → 수정 → 사용자 테스트 시도 → 사용자 PR 시도 → 게이트 실패 → 사용자 수정 → ... (개입 N번)

본 트랙: `/step-start N` 1커맨드 안에:

```text
plan → 🔒 사용자 승인 (개입 1번)
   → 구현
   → ./gradlew test (실패 → 자체 수정 → 재실행, 한도 3회)
   → review-agent CRITICAL → 자체 수정 → 재검증, 한도 2회
   → Comprehension Gate (Tier 자동, [a]/[b]/[c])
   → PR 생성 → 6게이트 (실패 → 자체 수정 → 재게이트, 한도 2회)
   → 🔒 사용자 머지 결정 (개입 2번)
```

→ **개입 2번**. 한도 초과 시 escalation (사용자에게 막힌 지점 명시 보고).

### 자동 수정 범위 제한 (왜 무한 자율 X)

- 같은 메서드/파일 내 작은 수정만
- **도메인 모델 변경·새 의존성 추가·새 Port 정의는 무조건 사용자 승인**
- 사유: 메모리 `feedback_track_scope_discipline.md` ("트랙 스코프 엄격") 와 정합. 자율은 작은 수정만, 큰 결정은 사람

---

## 6. Comprehension Gate — 자동화의 마지막 안전망

`/step-start` 가 PR 생성 직전에 발동.

### 왜 필요한가

자동 fix-loop 가 너무 빠르면 **"코드는 작동하지만 네 것이 아니게 된다."** 마플 커피챗 인사이트 ("트레이드오프 토론 / 시스템적 빈틈 방어 / 본인 말로 풀게") 와 정면 충돌.

### 13 카테고리 (자동 식별)

| Tier | 카테고리 | 자동 식별 |
|------|---------|---------|
| **A 자동 스킵** | 단순 CRUD / 테스트만 / 문서만 | 위 13 어디에도 매칭 X |
| **B 시나리오 1질문** | 동시성 / 멱등성 / 트랜잭션 / 외부 호출 | 키워드 grep |
| **C 왜·대안·빈틈 3축** | spec.decisions / DB 스키마 / API / 이벤트 / 인증 / 캐시 / 예외 / 헥사고날 / **새 기술·의존성** | 키워드 / 신규 파일 / spec 변경 |

→ #13 (새 기술·의존성) 트리거 하나로 "새 라이브러리 추가 시 게이트가 알아서 트레이드오프 토론을 강제" — 이게 BMAD/Spec Kit/AB Method 어디에도 없는 마음의 고향 차별점.

### 자동 통과 조건

- spec.decisions 4축 (왜·대안·빈틈·재검토 트리거) 미리 채움 → "이미 답했음" 으로 자동 통과
- 같은 패턴 learning 노트 존재 → "패턴 재현" 1줄 확인만

→ **spec 을 잘 쓰면 게이트는 침묵.** 게이트의 진짜 역할은 "spec 누락 자동 탐지".

### 금지 예시 ([`comprehension-gate.md`](../conventions/comprehension-gate.md) §8)

- "이 메서드 무슨 일 해?" — 코드 리딩, 결정 검증 X
- "@Transactional 이 뭐?" — 자바·스프링 기초

→ 게이트는 **결정 검증** 만. 코드 이해 검증 X.

---

## 7. 안 가져온 것들 — 더 중요할 수 있다

| 안 가져온 것 | 왜 |
|------------|-----|
| BMAD 페르소나 12개 | solo overkill. 코드 한 줄 짜기 전 문서 폭주 |
| AB Method / Spec Kit "설치" | 폴더 구조 강제. 너의 `docs/` 는 이미 정착됨 — 패턴만 차용 |
| 새 sub-agent 추가 | "Add tools before adding agents" (Anthropic 공식). Codex / CodeRabbit 이미 외부 리뷰어 — 추가 시 토큰 낭비 |
| Spec Kit `constitution.md` | `CLAUDE.md` 가 이미 그 자리. 중복 금지 |
| 자동 commit·push | 메모리 `feedback_no_push_without_ask.md` 와 충돌. verify 는 자동, push 는 명시 승인 |

---

## 8. 한 줄 요약 — 이 트랙의 본질

> **자산이 부족한 게 아니라 진입 동선이 부족했다.** 4층 분리 모델은 자산을 갖다 쓰는 동선을 만들고, fix-loop 와 Comprehension Gate 는 그 동선을 자동화하면서도 사용자가 결정 권한을 잃지 않게 한다.

---

## 9. 나중에 돌아보면 — 이 결정이 틀릴 수 있는 조건

- spec 작성 시간이 step 구현 시간보다 길어지면 → 4층 분리가 부담만. spec 의 의무 범위 약화 검토
- Comprehension Gate 트리거 false positive 가 많아지면 → 13 카테고리 룰 튜닝 (P5 dry-run 후 회귀 PR)
- 1 step = 1 PR 이 너무 많은 PR 폭주 → CI/리뷰 비용. step 합치기 룰 일부 허용 검토
- 자동 fix-loop 한도 (3·2·2) 가 너무 작거나 큼 → 측정 후 조정

---

## 10. 더 공부할 거리

- **GitHub Spec Kit** 풀버전 — `constitution.md` 의 실제 사용 예시. 우리가 안 만든 이유가 정답인지 검증
- **AB Method** 의 task→mission 분해 깊이 — sub-agent 위임 시 결과 통합 정확도
- **Anthropic Agent Teams** 실험적 기능 — 멀티 에이전트 병렬 실행 시 6게이트 시간 1/6 가능성 (현재는 순차)
- **Karpathy LLM Wiki 패턴** 의 다른 적용 사례 — spec / track / learning 시제 분리가 이 패턴의 일반화로 보일 수 있는가

---

## 11. 본인 답안 슬롯 (`tradeoff-rehearsal-agent` 가 묻는 질문)

다음 질문을 자기 말로 답할 수 있을 때 이 트랙은 너의 것.

### Q1. Spec Kit 풀세트 (constitution.md 새 신설 등) 도입은 왜 안 했는가?

```text
(여기에 본인 답)
```

### Q2. 1 step = 1 PR 엄격 정책의 빈틈은 무엇이고 어떤 신호가 오면 재검토하는가?

```text
(여기에 본인 답)
```

### Q3. Comprehension Gate Tier C 3축 (왜·대안·빈틈) 이 spec.decisions 4축 (왜·대안·빈틈·재검토 트리거) 보다 1개 적은 이유는?

```text
(여기에 본인 답)
```

### Q4. BMAD 페르소나 12개 중 1개도 안 가져온 게 정답이려면 어떤 가정이 유지되어야 하는가? 그 가정이 깨질 신호는?

```text
(여기에 본인 답)
```

### Q5. 자동 fix-loop 한도 (테스트 3회 / 리뷰 2회 / PR 게이트 2회) 의 근거는 데이터인가 직관인가? 측정해야 한다면 무엇을?

```text
(여기에 본인 답)
```

> 답이 막히면 [`comprehension-gate.md`](../conventions/comprehension-gate.md) §3 Tier 시스템·§7 자동 통과 조건, [`spec-driven.md`](../conventions/spec-driven.md) §1.2 시제 분리 이유, 본 노트 §2 외부 트렌드 표를 다시 본다.
