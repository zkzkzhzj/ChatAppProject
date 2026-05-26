---
description: Critic and guardrail policy for AI-generated changes
tags: [harness, review, critic, ci]
version: 1.0.0
---

# Critic Gates

> AI가 빠르게 코드를 만들수록 검증은 더 좁고 강해야 한다.

---

## Critic의 목적

Critic은 동의자가 아니다. 구현자가 놓친 부분을 의심하는 역할이다.

검증 대상:

- 아키텍처 규칙 위반
- 보안 회귀
- 동시성/멱등성 누락
- 테스트 부재 또는 약한 테스트
- 문서와 코드 불일치
- CI에서 놓칠 수 있는 절차 위반

---

## 기본 게이트

| 시점 | 게이트 | 설명 |
|------|--------|------|
| 구현 중 | 자체 검증 | 변경 범위와 테스트를 메인 Codex가 즉시 확인 |
| 커밋 전 | 전문 Critic | 위험도에 따라 review/security/concurrency/test/docs 선택 |
| PR 전 | 전체 요약 리뷰 | 변경 의도, 테스트, 문서 정합성 확인 |
| CI | 자동 검증 | 빌드, 테스트, lint, markdown, 보안 스캔 |

---

## Codex와 Claude의 역할

Codex가 기본 구현과 1차 판단을 맡는다.

Claude Code 자산은 다음 방식으로 유지한다.

- 기존 `.claude/agents/*review*.md`는 리뷰 역할 정의로 참조한다.
- Claude 훅은 Claude Code 세션에서 계속 동작한다.
- Codex는 `AGENTS.md`와 `docs/harness/`를 기준으로 같은 정책을 수행한다.

모델 다양성이 필요한 경우, 같은 결과를 같은 모델 가족끼리만 검토하지 않는다.
가능하면 Codex 구현 결과를 Claude/CodeRabbit/CI가 압박하거나, Claude 구현 결과를 Codex가
압박한다.

---

## 위험도별 리뷰 선택

| 변경 유형 | 필요한 Critic |
|-----------|---------------|
| 문서만 변경 | Main Codex 자체 검증 |
| 단순 UI/문구 | Main Codex + 필요한 경우 Test Engineer |
| 새 API/DTO | Critic + Docs Consistency Check skill |
| DB/JPA/마이그레이션 | Critic + Concurrency Critic |
| 인증/인가/토큰 | Security Critic 필수 |
| 포인트/아이템/좌석/메시지 상태 변경 | Concurrency Critic 필수 |
| Kafka/outbox/idempotency | Concurrency Critic + Critic 필수 |
| 하네스/CI/훅 변경 | Critic + Docs Consistency Check / Learning Note skills 필수 |

---

## CI 가드레일 후보

현재 CI는 backend, frontend, markdown lint 중심이다.

가까운 시점에 검토할 보강:

- `.env` 파일 커밋 차단
- secret scan
- GitHub Actions 최소 권한 `permissions: {}`
- backend/frontend 변경 감지 후 필요한 job만 실행
- PR에서 markdown/harness 문서 링크 깨짐 검사

보류:

- 운영 이미지 Trivy 스캔 전체 파이프라인
- GitOps 자동 배포 락
- MCP 서버 관측 대시보드

보류 이유는 명확하다. 현재 이 저장소의 즉시 병목은 배포 DAG가 아니라 Codex 주력
전환과 하네스 중립화다.

---

## 절차 위반 가드

Critic은 커밋 전, PR 전, PR 중 어느 시점에도 호출할 수 있다.
다만 GitHub review comment나 PR discussion은 PR이 있어야 남길 수 있으므로,
PR 자체를 우회하는 행위는 별도 가드가 필요하다.

금지:

- main 직접 push
- `git commit --amend` 후 force push
- 검증 실패를 무시한 PR 생성
- 리뷰 결과를 문서에 남기지 않는 것

권장:

- 수정은 새 커밋으로 남긴다.
- 리뷰 결과는 `docs/reviews/YYYY-MM-DD/`에 저장한다.
- 사용자가 요청하지 않은 대형 리팩토링은 별도 트랙으로 분리한다.
