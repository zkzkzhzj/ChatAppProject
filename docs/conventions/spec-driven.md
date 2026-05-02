# Spec-Driven 4층 분리 모델

> 트랙 `harness-spec-driven` (Issue #46, 2026-04-30) 도입.
>
> 외부 트렌드(BMAD-METHOD / GitHub Spec Kit / AB Method) 분석에서 추출한 핵심 패턴을 마플 커피챗 인사이트(트레이드오프·시스템적 빈틈 방어)와 정합화. 결정 기록은 [learning/66](../learning/66-spec-driven-fix-loop-comprehension-gate.md).

---

## 1. 4층 정의

작업의 정보를 시제·질문·활용시점이 다른 4개 층으로 분리한다. 어느 한 층이 다른 층을 흡수할 수 없다.

| 층 | 위치 | 시제 | 답하는 질문 | LLM/사람 활용 시점 |
|----|------|------|-----------|------------------|
| **Issue** | GitHub | — | "이걸 왜 시작하나?" (외부 트리거) | 트랙 시작 직전. 라벨 `track:{id}`로 묶음 |
| **Spec** | `docs/specs/features/{feature}.md` | 미래형 | "이 트랙으로 무엇을 달성하나?" | 작업 시작 시 요구사항 진실 |
| **Track** | `docs/handover/track-{id}.md` | 진행형 | "지금 어디까지 했나?" | 다음 step 시작 / 다음 세션 인수인계 |
| **Step** | track §3 + PR | — | "이 작업 단위로 무엇을 만드나?" | 1 step = 1 PR (엄격) |

### 1.1 핵심 원칙

- **이슈는 가벼워진다.** 본문은 1~2문단. 요구사항 진실은 spec 파일을 link.
- **이슈가 spec 을 대체하지 않는다.** 이슈는 닫히면 묻혀버린다. spec 은 트랙 머지 후에도 레포에 남아 다음 세션이 읽는 컨텍스트가 된다.
- **spec 이 track 을 대체하지 않는다.** spec 은 변하지 않는 요구사항, track 은 매일 변하는 진행 상태.
- **이슈와 step 매핑은 1:1 강제 X.** 트랙 1개에 이슈 1개도, 이슈 = step 으로 쪼개기도 OK (예: `ws-redis` Step 3~7 — 이슈 5개 / spec 1개).

### 1.2 시제·역할이 다른 이유 (왜 4층인가)

- Issue 만 쓰면 → 닫힌 후 컨텍스트 휘발. 미래 세션이 "왜 이 결정?"을 git log 로만 추적
- Spec 만 쓰면 → 진행 상태 모름. 매번 git log 로 "어디까지 했지?" 재추적
- Track 만 쓰면 → 요구사항이 진행 상태에 섞여 변형됨. 6개월 후 "원래 뭘 만들려 했는지" 모름
- Step 만 쓰면 → 트랙 단위 일관성 없음. 각 PR 이 고립

→ 4개를 분리하면 각 층이 자기 시제로만 갱신되어 깨끗함.

---

## 2. 의무 범위

### 2.1 spec 의무 (모든 트랙 필수, 사용자 승인 2026-04-30)

| 작업 크기 | Issue | Spec | Track |
|----------|-------|------|-------|
| 1커밋 핫픽스 (예: PR #41 STOMP reconnect) | ✅ | mini-spec (10줄 안팎) | mini-track (5줄 안팎) |
| 단일 PR 작업 (예: F-1 모바일 터치) | ✅ | ✅ | ✅ |
| 멀티 step 트랙 (예: ws-redis) | ✅ step별 가능 | ✅ 1개 | ✅ 1개 |

> 단발 핫픽스도 **mini-spec / mini-track** 작성. 과거 흐름 (이슈만 + PR description) 금지. 사유: PR #41 처럼 단발 핫픽스도 결정 이력이 휘발됨.

### 2.2 1 step = 1 PR (엄격)

- 한 step 작업이 여러 PR 로 쪼개지지 않는다.
- 한 PR 에 여러 step 이 섞이지 않는다.
- 예외: **트랙 자체가 메타/도구 트랙** (예: `harness-spec-driven`) → 1 PR · N 커밋 (phase별). 서비스 트랙은 엄격 적용.
- 사유: 1step=1PR 이면 step 단위 롤백/리뷰가 가능. 작은 변경 단위가 자동 fix-loop (트랙 `harness-spec-driven` C3) 의 입력으로도 적합.

---

## 3. Issue 운영 (실제 사용 패턴)

### 3.1 라벨

- `track:{id}` — 트랙별 묶음. **트랙 시작 시 라벨 신설 의무** (`gh label create track:{id}`)
- `enhancement` / `bug` / `documentation` — 표준
- `deps` (Dependabot 자동) / `ci` / `docker` 등 — 분류용

### 3.2 본문 (가벼운 형식)

```markdown
## 무엇 (한 줄)
## 왜 (1~2문단)
## 범위 (in / out)
## 검증 (수용 기준 — spec 으로 미루지 말고 1~3개)
## 라벨
```

→ 본문에 **상세 요구사항 적지 않는다.** 그 자리는 spec 파일.

### 3.3 step 단위 분해

여러 step 이 있는 트랙은 step 별로 별도 이슈를 만들 수 있다 (예: `ws-redis` Step 3~7 = 이슈 #31~#35). 라벨 `track:{id}` 로 묶으면 자동 그룹화.

각 step 이슈는 spec 파일의 해당 step 항목을 link 만 한다. 중복 작성 X.

---

## 4. Spec 파일 형식

위치: `docs/specs/features/{feature}.md`
템플릿: `docs/specs/features/_template.md` (P2 산출물)

### 4.1 표준 섹션

| 섹션 | 내용 |
|------|------|
| `outcomes` | 이 spec 이 만족하면 무엇이 가능해지나 (사용자/시스템 관점) |
| `scope.in` / `scope.out` | 명시적 in / 명시적 out (out 이 spec 가치의 절반) |
| `constraints` | 비기능 제약 (성능·비용·시간·인프라 의존) |
| `decisions` | 핵심 결정들 — **각 항목마다 왜·대안·빈틈·재검토 트리거 4축** (Comprehension Gate 와 1:1 매핑) |
| `tasks` (= steps) | step 분해. **step ↔ PR 1:1 강제, step ↔ 이슈 매핑은 선택** (트랙 1개에 이슈 1개도 OK, step 별 별도 이슈도 OK — §1.1 / §3.3) |
| `verification` | 수용 기준 (이게 통과하면 spec 종료) |
| `references` | 관련 wiki / learning / ADR / 외부 자료 |

### 4.2 `decisions` 섹션 예시

```markdown
### D1. [동시성] 낙관적 락 (Optimistic Lock)
- **왜**: 충돌 빈도 낮고 (포인트 차감 동시 발생 < 0.1%), 락 비용 회피
- **대안**:
  - 비관적 락 — 충돌 빈도 가정 깨지면 변경 후보. DB 트랜잭션 길이 부담
  - 분산 락 (Redisson) — 멀티 인스턴스에서만 의미. 현재 단일 인스턴스
- **빈틈**: 충돌 빈도 모니터링 필요. `OptimisticLockingFailureException` 카운트 메트릭
- **재검토 트리거**: 일일 충돌 카운트 > 100 / 동시 활성 사용자 > 1000 / 멀티 인스턴스 전환
```

→ 이 형식으로 미리 작성하면 Comprehension Gate (트랙 `harness-spec-driven` C3) 가 자동으로 "이미 답했음" 처리하고 침묵.

---

## 5. Track 파일 (진행 상태)

위치: `docs/handover/track-{id}.md`
템플릿: `docs/handover/INDEX.md` 의 "트랙 파일 템플릿" (P2 에서 v2 로 갱신 — Acceptance Criteria + spec 링크 + 1step=1PR 명시)

매 세션 갱신. spec 과 분리되는 이유: spec 은 변하지 않아야 하고, track 은 매일 변한다.

---

## 6. 다른 컨벤션과의 관계

| 컨벤션 | 본 spec-driven 과의 관계 |
|--------|-----------------------|
| [parallel-work.md](./parallel-work.md) | 트랙 시작/종료 절차의 상위 정책. P2 에서 spec-driven 반영해 §2 트랙 시작 절차에 "Spec 작성" 단계 추가 |
| [git.md](./git.md) | 1 step = 1 PR 정책 추가 (P2). 브랜치명 컨벤션은 그대로 |
| [coding.md](./coding.md) | 무관. 코드 스타일 영역 |
| [testing.md](./testing.md) | spec 의 `verification` 섹션이 테스트 시나리오의 출처 |
| `comprehension-gate.md` (P3 산출물) | spec 의 `decisions` 4축 (왜·대안·빈틈·재검토) 과 1:1 매핑 |

---

## 7. 마이그레이션 정책

- **본 트랙 머지 시점부터 모든 신규 트랙은 spec 의무.** 기존 진행 중 트랙은 면제 (현재 활성 트랙 0).
- 종료된 트랙(`infra-tls-hardening`, `ws-redis` Step 2 등)은 후속 spec 작성 안 함. 트랙 파일이 사실상의 spec 역할 (소급 적용 X).

---

## 8. 변경 이력

| 날짜 | 변경 | 트랙 |
|------|------|------|
| 2026-04-30 | 본 문서 신설 (4층 분리 도입) | `harness-spec-driven` C1 |
