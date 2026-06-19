---
type: Convention
description: Markdown frontmatter metadata policy for agent-readable project documents
tags: [docs, frontmatter, okf-lite, ai-native]
version: 1.0.0
---

# 문서 Frontmatter 규칙

> Google Cloud knowledge-catalog OKF SPEC의 좋은 부분만 흡수한다.
> 목표는 OKF 전체 호환이 아니라, Markdown 문서를 에이전트와 도구가 안정적으로 찾고
> 분류할 수 있는 최소 메타데이터 계약이다.

---

## 1. 적용 범위

신규 문서는 가능한 한 frontmatter를 붙인다.

우선 적용 대상:

- `docs/harness/**`
- `docs/harness/skills/**`
- `docs/harness/agents/**`
- `docs/conventions/**`
- `docs/specs/features/**`
- `docs/architecture/decisions/**`
- `docs/wiki/**`
- `docs/learning/**`

기존 문서는 작업할 때 자연스럽게 보강한다. 단순히 `type`만 넣기 위한 대량 변경은 하지 않는다.

---

## 2. 기본 필드

### 2.1 필수

```yaml
---
type: Convention
description: One sentence summary
tags: [docs, frontmatter]
---
```

| 필드 | 의미 |
|------|------|
| `type` | 문서의 역할. 에이전트 라우팅과 검색 기준 |
| `description` | 한 문장 요약. 인덱스나 세션 시작 요약에 쓰기 좋게 작성 |
| `tags` | 검색용 태그. 도메인명, 기술명, 절차명을 포함 |

### 2.2 권장

| 필드 | 의미 |
|------|------|
| `version` | 규칙/하네스/스킬처럼 버전 관리가 필요한 문서 |
| `status` | `draft`, `active`, `accepted`, `deprecated` 등 상태가 중요한 문서 |
| `created` | 작성일 |
| `last-updated` | 의미 있는 내용이 마지막으로 바뀐 날짜 |
| `resource` | GitHub issue, PR, ADR, 외부 URL 등 정본 또는 원천 링크 |

`last-updated`는 git 이력의 대체물이 아니다. 사람이 보거나 에이전트가 노화 판단에 쓸
문서에만 둔다.

---

## 3. 표준 Type

| Type | 대상 |
|------|------|
| `Operating Guide` | `AGENTS.md`, `CLAUDE.md` 같은 진입점 |
| `Harness Guide` | 하네스 정책 문서 |
| `Harness Skill` | 반복 절차와 체크리스트 |
| `Agent Role` | 서브 에이전트 역할 카드 |
| `Convention` | 코딩, git, 테스트, 문서 규칙 |
| `Feature Spec` | `docs/specs/features/*.md` |
| `Track` | `docs/handover/track-*.md` |
| `Learning Note` | `docs/learning/*.md` |
| `ADR` | `docs/architecture/decisions/*.md` |
| `Wiki Concept` | `docs/wiki/**/*.md` |
| `Knowledge Note` | `docs/knowledge/**/*.md` |
| `Report` | 리뷰, 검증, 조사 리포트 |

새 type을 만들 수는 있지만, 먼저 위 목록으로 표현 가능한지 확인한다.

---

## 4. Resource 규칙

`resource`는 문서가 참조하는 원천이나 외부 식별자가 있을 때만 쓴다.

예시:

```yaml
resource:
  issue: "#46"
  pr: "#47"
  adr: "ADR-010"
  external: "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md"
```

규칙:

- 내부 링크만 있는 문서에는 억지로 넣지 않는다.
- 외부 URL은 문서 본문 references에도 남긴다.
- 여러 원천이 있으면 객체 형태를 쓴다.

---

## 5. 디렉터리 Index와 Log

`INDEX.md`는 progressive disclosure용 카탈로그다. 모든 디렉터리에 만들지 않는다.

사용 기준:

- 새 세션이 자주 진입하는 디렉터리
- 문서 수가 많고 라우팅이 필요한 디렉터리
- 사람이 직접 탐색하는 지식 베이스

`log.md`는 디렉터리 단위 변경 이력이 실제로 가치 있을 때만 둔다.

현재 기본 대상:

- `docs/wiki/log.md` — wiki 갱신 이력
- `docs/harness/log.md` — 하네스 규칙 변경 이력

---

## 6. 작성 예시

### 하네스 스킬

```yaml
---
type: Harness Skill
description: Start a new tracked work stream
tags: [harness, skills, track]
version: 1.0.0
---
```

### Feature Spec

```yaml
---
type: Feature Spec
feature: movement-key-stuck-on-blur
track: movement-key-stuck-on-blur
issue: "#123"
status: draft
created: 2026-06-17
last-updated: 2026-06-17
---
```

### Wiki Concept

```yaml
---
type: Wiki Concept
title: 인증 흐름
tags: [identity, jwt, security, guest]
related: [identity/guest-policy.md]
last-verified: 2026-06-17
---
```

---

## 7. 도입하지 않는 것

- OKF 전체 호환 선언
- 모든 Markdown 파일 일괄 마이그레이션
- 모든 디렉터리의 `INDEX.md` / `log.md` 강제 생성
- frontmatter schema 검증 도구의 즉시 도입

필요해지면 `docs/harness/log.md`에 근거를 남기고 별도 트랙에서 도입한다.

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-06-17 | OKF-lite 문서 메타데이터 규칙 신설 |
