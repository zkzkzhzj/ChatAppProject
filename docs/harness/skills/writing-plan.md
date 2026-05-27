---
description: Break an approved design into small implementation steps
tags: [harness, skills, planning]
version: 1.0.0
---

# Writing Plan

## 목적

승인된 설계를 작고 검증 가능한 구현 단계로 나눈다.

## 사용 조건

- 새 기능, 새 API, DB 변경, 하네스 변경처럼 변경 범위가 넓다.
- 여러 계층이나 여러 파일을 건드린다.
- 병렬 에이전트나 Critic Gate가 필요한 작업이다.
- 1회 수정으로 끝내기 어렵다.

## 절차

1. 설계 요약과 성공 조건을 확인한다.
2. 변경 파일 후보를 계층별로 나눈다.
3. 각 단계를 2-5분 단위의 작은 작업으로 쪼갠다.
4. 각 단계에 검증 방법을 붙인다.
5. 필요한 Agent와 Critic을 단계별로 표시한다.
6. PR을 나눌지, 한 PR로 묶을지 결정한다.
7. 장기 작업이면 `track-start.md`로 넘긴다.

## 계획 형식

| 단계 | 범위 | 파일 후보 | 검증 | 필요한 역할 |
|------|------|-----------|------|-------------|
| 1 | 준비 | - | - | Main Codex |

## Superpowers 참조

- `writing-plans`
