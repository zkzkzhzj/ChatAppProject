---
description: Start an isolated git worktree for parallel or risky work
tags: [harness, skills, git, worktree]
version: 1.0.0
---

# Worktree Start

## 목적

병렬 개발이나 충돌 위험이 큰 작업을 독립 워크트리에서 시작한다.

## 사용 조건

- 같은 저장소에서 다른 작업이 진행 중이다.
- 장기 기능 개발과 긴급 수정이 겹친다.
- 충돌 가능성이 큰 파일을 여러 작업이 함께 만진다.
- 기존 브랜치를 깨끗하게 보존해야 한다.

## 절차

1. 현재 작업 브랜치와 변경 상태를 확인한다.
2. 미커밋 변경이 있으면 사용자 변경인지 구분하고 건드리지 않는다.
3. 기준 브랜치를 정한다. 기본값은 `origin/main`이다.
4. 워크트리 경로와 브랜치 이름을 정한다.
5. `git worktree add -b {branch} {path} {base}`로 생성한다.
6. 새 워크트리에서 의존성 설치 필요 여부와 테스트 baseline을 확인한다.
7. 작업 종료 시 `branch-cleanup.md` 또는 `development-finish.md`로 정리한다.

## 주의

- 기존 워크트리를 삭제하거나 덮어쓰지 않는다.
- 사용자 변경이 있는 워크트리에서 임의로 reset/checkout 하지 않는다.
- 짧은 단일 파일 수정에는 기본값으로 쓰지 않는다.

## Superpowers 참조

- `using-git-worktrees`
