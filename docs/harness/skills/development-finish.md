---
description: Finish a development branch with verification and next-action choices
tags: [harness, skills, finish, pr]
version: 1.0.0
---

# Development Finish

## 목적

기능 브랜치를 검증하고 PR, merge, 보류, 정리 중 다음 행동을 결정한다.

## 사용 조건

- 구현 단계가 끝났다.
- PR을 만들거나 갱신하기 직전이다.
- worktree 작업을 닫아야 한다.
- 사용자가 "마무리", "PR", "머지", "정리"를 요청했다.

## 절차

1. 변경 파일과 의도하지 않은 변경을 확인한다.
2. 관련 테스트, lint, docs consistency를 실행한다.
3. 위험도에 맞는 Critic Gates를 통과한다.
4. PR 설명에 summary, verification, risk를 적는다.
5. 사용자가 요청한 경우 PR을 생성하거나 갱신한다.
6. merge 요청이면 리뷰와 CI 상태를 확인한 뒤 진행한다.
7. 완료 후 worktree, 브랜치, handover 상태를 정리한다.

## 선택지

| 선택 | 조건 |
|------|------|
| PR 생성 | 변경이 검증됐고 리뷰가 필요함 |
| 바로 merge | 사용자가 요청했고 리뷰/CI가 통과함 |
| 보류 | 열린 질문이나 실패한 검증이 남음 |
| 폐기 | 사용자가 명시했고 보존할 변경이 없음 |

## Superpowers 참조

- `finishing-a-development-branch`
