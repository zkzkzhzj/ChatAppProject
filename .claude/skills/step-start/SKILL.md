현재 트랙의 step N 을 진행한다. plan → 승인 → 자동 fix-loop → Comprehension Gate → PR 생성까지 1커맨드. 사용자가 끼어드는 지점은 plan 승인과 머지 결정 2번뿐.

## 입력

- `$ARGUMENTS`: step 번호. 예: `1`, `2`. 비어있으면 트랙 파일 §2 로드맵에서 다음 진행할 step 자동 추론.

## 사전 조건

- **현재 브랜치의 track-id 가 `docs/handover/INDEX.md` 활성 표에 존재** (다중 활성 트랙 지원: 활성 트랙이 N 개여도 자기 브랜치의 트랙 ID 만 검사 — `stop-handover-check.js` `getCurrentBranchTrackId` 와 동일 매칭. CodeRabbit C7 리뷰 B5)
- spec 파일 §5 tasks 에 해당 step 정의 있음
- 트랙 브랜치에서 작업 중 (main 금지)

## 실행 순서

### 1단계 — 사전 조건 + spec 읽기

- 활성 트랙 ID 확인 (`docs/handover/INDEX.md` 활성 표 + 현재 브랜치 `track-id` 매칭)
- **`STEP_START_COMMIT=$(git rev-parse HEAD)` 캡처 후 환경변수 보존** — 7단계 Comprehension Gate diff 의 기준점. 이 값 없이는 7단계 `git diff` 전부 미정의 변수로 실패
- `docs/specs/features/{feature}.md` §5 tasks 의 step N 항목 정독
- `docs/handover/track-{id}.md` §3 현재 단계 상세 정독

### 2단계 — Plan 모드 (단계 N 구현 계획)

다음을 명시:

- 변경 파일 트리 (예상)
- 의존 관계 (선행 step 산출물 사용 여부)
- 동시성/외부 호출/새 의존성 등 13 카테고리 트리거 예상
- spec.decisions 미반영 결정 발견 시 → spec 갱신 권고

### 3단계 — 🔒 사용자 plan 승인 (유일한 중간 게이트)

- 사용자 명시 동의 ("ㅇㅇ", "가자", "승인") 대기
- 수정 요청이면 다시 plan
- 사용자 자율 위임 ("알아서 해") 발화 시 본 단계 생략 가능 (CLAUDE.md §5.4)

### 4단계 — 구현

- 도메인 → 어댑터 → 테스트 (CLAUDE.md §5.1 Phase B)
- **1 step = 1 PR 원칙**: 다른 step 영역 침범 금지 (`git.md` §4)

### 5단계 — 자동 fix-loop (테스트)

프로젝트별 테스트 명령 실행 (예: `./gradlew test`, `npm test`, `pytest` 등). 마음의 고향 백엔드는 `./gradlew test`, 프론트엔드는 `cd frontend && npm test`.

- 실패 → 자체 수정 → 재실행 (한도 3회)
- 3회 실패 → escalation: 막힌 지점·시도 내역 보고 → 🔒 사용자 결정 대기
- 자동 수정 범위: **같은 메서드/파일 내 작은 수정만**. 도메인 모델·새 의존성·새 Port 같은 구조 변경은 무조건 사용자 승인

### 6단계 — review-agent 자동 호출

- post-commit hook 이 자동 트리거 (변경 staged 후)
- CRITICAL/HIGH 발견 → 자체 수정 → 재검증 (한도 2회)
- 한도 초과 → escalation

### 7단계 — Comprehension Gate (Tier 자동 결정)

`docs/conventions/comprehension-gate.md` 의 13 카테고리 자동 식별. 진단 범위는 **이번 step 의 누적 diff** (`STEP_START_COMMIT..HEAD` 또는 staged · unstaged 합산):

```bash
# STEP_START_COMMIT = 본 /step-start 진입 직전 HEAD SHA. step 1단계에서 캡처해 변수 보존.
# (구 가이드 `git diff HEAD` 는 staged 변경을 놓치고, 자동 fix-loop 의 commit 들을 모두 누락.)
git diff --name-only ${STEP_START_COMMIT}..HEAD
git diff ${STEP_START_COMMIT}..HEAD | grep -E "@Transactional|synchronized|Atomic|@Version|@Lock|Outbox|idempotency|propagation|REQUIRES_NEW|@KafkaListener|@PreAuthorize|@Cacheable|@Index|@Column.*unique|@ControllerAdvice|@[A-Za-z]+Mapping"
git diff ${STEP_START_COMMIT}..HEAD -- build.gradle.kts frontend/package.json deploy/.env
git diff ${STEP_START_COMMIT}..HEAD -- 'docs/specs/features/*.md'
```

> CodeRabbit C7 리뷰 B5: step 도중 여러 commit 이 쌓여도 "이번 step 의 모든 변경" 이 게이트 식별 범위. step 1단계에서 `STEP_START_COMMIT=$(git rev-parse HEAD)` 캡처해 stash 또는 환경변수로 보존한다.

- Tier A → 침묵, 다음 단계
- Tier B → 시나리오 1 질문
- Tier C → 왜·대안·빈틈 3축 질문 (spec.decisions 미채움 시)

답변 누적: `docs/learning/comprehension/{trackId}/step-{N}.md`.
[b] 모르겠음 → learning-agent 호출 → 해설 + RESERVED 자동 예약.
[c] 스킵 카운트 추적 (트랙 누적 ≥ 3 시 종료 회고 메시지).

자동 통과 조건 (`comprehension-gate.md` §7):

- spec.decisions 4축 미리 채워짐 → 자동 통과
- 같은 패턴 learning 노트 존재 → 1줄 확인만

### 8단계 — track-{id}.md §3 자동 갱신

- 현재 step 상태: 🔧 진행 중 → ✅ 완료
- 결정 이력: spec.decisions 변경 동기화 (Tier C 답변 → spec 의 빈틈 부분 보강)

### 9단계 — 이슈 코멘트 (선택)

이 step 에 매핑된 이슈가 있으면 진행 1줄 코멘트:

```bash
gh issue comment {N} --body "Step {N} 완료. PR 생성 예정."
```

### 10단계 — PR 생성 (1 step = 1 PR 강제)

pr-agent 호출. 6게이트 (review / full-review / concurrency / security / test-quality / docs) 자동 실행.

- 게이트 실패 → 자체 수정 → 재게이트 (한도 2회)
- 한도 초과 → escalation
- 통과 → 🔒 사용자 머지 요청 보고 (push 는 pr-agent 가 사용자 명시 동의 후만)

### 11단계 — 완료 보고

다음을 1 화면에 정리:

- step N 완료, PR URL, 6게이트 결과 (CRITICAL/HIGH/MEDIUM 카운트)
- Comprehension Gate 통과 형태 (Tier A 침묵 / Tier B 답변 1개 / Tier C 답변 3개 / [c] 스킵)
- 답변 누적 경로 + learning 후보 (있으면)
- 다음 행동: `/step-start {N+1}` 또는 `/track-end` (마지막 step 시)

## 무한 루프 방지 (한도 요약)

| 단계 | 한도 |
|------|------|
| 테스트 fix-loop | 3 회 |
| review-agent fix-loop | 2 회 |
| PR 6게이트 fix-loop | 2 회 |

한도 초과 → 사용자에게 막힌 지점 명시 보고.

## 사용 예시

```text
/step-start 1
/step-start 2
/step-start    (다음 step 자동 추론)
```

## 관련 문서

- `docs/conventions/spec-driven.md` §2.2 (1 step = 1 PR)
- `docs/conventions/comprehension-gate.md` (13 카테고리 / Tier 시스템)
- `CLAUDE.md` §5.1 Phase B (단계 N 구현)
- `.claude/agents/pr-agent.md` (6게이트)
