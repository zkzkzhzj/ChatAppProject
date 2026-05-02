---
feature: {feature-id-kebab-case}
track: {track-id}
issue: "#{N}"
status: draft
created: YYYY-MM-DD
last-updated: YYYY-MM-DD
---

# {Feature 제목}

> 이 spec 은 트랙 `{track-id}` (Issue #{N}) 의 **요구사항 진실** 이다.
> 진행 상태는 `docs/handover/track-{track-id}.md`, 결정의 사고 과정은 `docs/learning/`.
> 4층 분리 모델: [conventions/spec-driven.md](../../conventions/spec-driven.md) §1.
>
> **식별자 일치 의무 (CodeRabbit C7 리뷰 B8)**:
>
> - frontmatter `feature` ↔ 본 파일명 `{feature}.md`
> - frontmatter `track` ↔ `docs/handover/track-{track}.md`
> 일치하지 않으면 `/track-end` 의 wiki 영향 분석·handover 정합 갱신이 트랙을 찾지 못한다.

---

## 1. Outcomes

> 이 spec 이 만족되면 무엇이 가능해지나? (유저 / 시스템 관점)

- ...
- ...

## 2. Scope

### 2.1 In (이번 트랙에서 만든다)

- ...
- ...

### 2.2 Out (이번 트랙에서 명시적으로 안 만든다)

> Out 이 spec 가치의 절반. "안 만드는 것" 을 적어야 다음 세션이 스코프 침범 안 함.

- ...
- ...

## 3. Constraints (비기능 제약)

| 차원 | 제약 |
|------|------|
| 성능 | ... |
| 비용 | ... |
| 시간 | ... |
| 인프라 | ... |
| 정책/규제 | ... |

## 4. Decisions

> 각 결정마다 **왜 · 대안 · 빈틈 · 재검토 트리거 4축**.
> Comprehension Gate (`docs/conventions/comprehension-gate.md`, P3 산출물) 의 13 카테고리·Tier 시스템과 1:1 매핑.
> **미리 채우면 게이트가 자동 통과**. 빈 채로 진행하면 step 시점에 게이트가 묻는다.

### D1. [{카테고리}] 결정 한 줄

- **왜**: ...
- **대안**:
  - 옵션 B — 안 고른 이유
  - 옵션 C — 안 고른 이유
- **빈틈**: 가정이 깨지면 무엇이 무너지나 / 모니터링할 신호
- **재검토 트리거**: 어떤 수치/이벤트가 오면 다시 본다

### D2

(이하 같은 형식으로 추가)

> 카테고리 예시: 동시성 / 멱등성 / 트랜잭션 경계 / 외부 시스템 호출 / DB 스키마 / API 설계 / 이벤트 / 인증·인가 / 캐시 / 예외 처리 / 헥사고날 경계 / 새 기술·의존성

## 5. Tasks (= Steps)

> **1 step = 1 PR (엄격)** — `docs/conventions/git.md` §4, `docs/conventions/spec-driven.md` §2.2.
> 메타·도구 트랙(예: `harness-spec-driven`) 만 1 PR · N 커밋 예외.

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | PR |
|------|------|------|---------------|------|-----|
| 1 | ... | — | (패키지/디렉토리) | #{N1} | (작업 시 채움) |
| 2 | ... | step1 | ... | #{N2} | ... |

## 6. Verification (수용 기준)

> 이게 통과하면 spec 종료. track 파일의 `§0.5 Acceptance Criteria` 와 1:1 매핑.

- [ ] ...
- [ ] ...
- [ ] ...

## 7. References

- 트랙 파일: [track-{track-id}.md](../../handover/track-{track-id}.md)
- 관련 wiki: [...](../../wiki/...) · ([wiki-policy.md](../../conventions/wiki-policy.md) §2.3 의무 — 비우면 `/spec-new` 가 강제)
- 관련 learning: [...](../../learning/...)
- 관련 ADR: [...](../../architecture/decisions/...)
- 외부 자료: ...

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| YYYY-MM-DD | 초안 작성 |
