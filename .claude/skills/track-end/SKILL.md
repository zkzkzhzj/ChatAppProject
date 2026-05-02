현재 트랙을 종료한다. parallel-work.md §8 + §4.2 머지 직전 체크리스트의 1커맨드 압축. 트랙 머지 PR 안에 모든 정리를 묶는다 (별도 docs PR 금지).

## 사전 조건

- 활성 트랙 1개 존재
- 모든 step PR 머지 완료 (또는 메타·도구 트랙은 트랙 머지 PR 1개 직전)
- main pull → 트랙 브랜치 rebase 완료

## 실행 순서

### 1단계 — Acceptance Criteria 검증

`docs/handover/track-{id}.md` §0.5 체크리스트 정독.

- 모두 통과 → 다음 단계
- 미통과 항목 있음 → 종료 + 안내 ("이 항목 미통과: [...]. 처리 후 재실행.")

### 2단계 — wiki 영향 분석 (wiki-policy.md §2.1)

```bash
git diff main...HEAD --name-only | grep -E "src/main/java" | sort -u
```

> **`head -50` 제거 (CodeRabbit C7 Critical 리뷰 B5)** — 트랙이 51개 이상 자바 파일을 건드리면 51번째부터 누락되어 wiki 영향 분석에 빈틈. 트랙 종료 시점은 1회성 정리 단계라 양보다 누락 0 이 우선. `sort -u` 만 적용해 중복 제거.

- 트랙이 건드린 패키지 추출 (예: `communication/`, `village/`, `identity/`)
- 도메인별 wiki 페이지 자동 매핑 (예: `communication/*` → `wiki/communication/*.md`)
- 영향 페이지 체크리스트 출력 → 사용자 결정: **갱신 / 보류**
- 갱신 결정 시 머지 PR 안에 wiki 커밋 묶기 (별도 docs PR 금지)

### 3단계 — handover 정합 갱신 (parallel-work.md §4.2)

순서대로:

1. 트랙 파일 (`track-{id}.md`) 첫 줄에 "✅ 종료 (YYYY-MM-DD)" 표시
2. `handover/INDEX.md` 활성 트랙 표에서 행 제거 → 완료 트랙 표에 한 줄 추가 (학습노트 링크 포함)
3. 메인 `handover.md` :
   - §1 활성 트랙 정정 + "최근 종료 트랙" 섹션 갱신
   - §2 "전체 완료 요약" 표에 한 줄 추가
   - §4 진행 중 트랙 정리 (해당 시 후속 트랙 후보로 이동)

### 4단계 — RESERVED.md 정리

- 사용한 번호: "사용 완료 (YYYY-MM-DD)" 표시
- 사용 안 한 예약 번호: "반환" 처리 (다른 트랙 재예약 가능)

### 5단계 — comprehension/ 누적 리포트

`docs/learning/comprehension/{trackId}/` 의 답변 누적을 종합:

- N 개 결정 검증
- M 개 답변 누적 (Tier B/C)
- K 개 학습노트 후보 (RESERVED 예약된 것)
- [c] 스킵 횟수 ≥ 3 면 회고 메시지: "{N} 회 스킵 — 무엇이 아직 모호한가? 학습노트 후보로 등록 권장."

학습노트 후보 작성 권고 (필수 X. 사용자 결정).

### 6단계 — 6게이트 (트랙 머지 PR)

pr-agent 호출:

- PR 미생성이면 신규 PR 생성
- 본 트랙 PR 있으면 갱신
- 6게이트 (review / full-review / concurrency / security / test-quality / docs) 자동 실행
- CRITICAL 0 통과 시 다음 단계

### 7단계 — 완료 보고

다음을 1 화면에 정리:

- 트랙 ID, 종료일, PR URL
- Acceptance Criteria 통과 N/M
- 학습노트 후보 K 개 (작성 / 보류 결정 필요)
- wiki 영향 페이지 갱신 / 보류 통계
- comprehension 답변 누적 통계 + 스킵 횟수
- **🔒 사용자 머지 요청** — push 는 사용자 명시 동의 후만 (메모리 `feedback_no_push_without_ask.md`)
- 다음 행동: 머지 → 후속 트랙 검토 (보류 메모 §6 참조)

## 사용 예시

```text
/track-end
```

## 관련 문서

- `docs/conventions/parallel-work.md` §4.2 (머지 직전 체크리스트), §8 (트랙 종료 후 정리)
- `docs/conventions/wiki-policy.md` §2.1 (wiki 영향 분석)
- `docs/conventions/comprehension-gate.md` §6 (누적·스킵·학습노트 연동)
- `.claude/agents/pr-agent.md` (6게이트)
