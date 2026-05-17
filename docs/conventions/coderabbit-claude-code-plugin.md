# CodeRabbit Claude Code 플러그인 — 설치 + 사용 가이드 + 1주 시범 정책

> 트랙 `ai-native-2026-05-upgrade` (#93) Step 2 산출물.
> 1차 출처: sweep v1 §D.4 + sweep v2 §D.2 (Anthropic 자체 Code Review 비교).
> 정책 적용 시점: 2026-05-17 시범 시작 → 2026-05-24 협력 vs 충돌 판단 (Step 3).

---

## 1. 무엇인가

**CodeRabbit Claude Code 플러그인** — 기존 PR 봇으로 운영 중인 CodeRabbit 을 Claude Code 안에서 직접 호출하는 통합. 자율 루프 가능:

```text
Claude writes code
  → /coderabbit review (또는 자연어 "What's wrong with my changes?")
  → CodeRabbit 결로 리뷰 코멘트
  → Claude fixes 자동 (또는 사용자 승인 후)
  → 사용자 최종 승인
```

기존: PR 결박 결박 결박 결박 CodeRabbit 결박 결박. 신규: 작업 중 즉시 호출 가능.

## 2. 설치

### 2.1 공식 페이지

- [claude.com/plugins/coderabbit](https://claude.com/plugins/coderabbit) — Anthropic 공식 플러그인 마켓 등재
- [docs.coderabbit.ai/cli/claude-code-integration](https://docs.coderabbit.ai/cli/claude-code-integration) — CodeRabbit 측 통합 가이드

### 2.2 CodeRabbit CLI 설치 + 인증 (필수 선결)

Claude Code 플러그인은 내부적으로 **CodeRabbit CLI** 를 호출하므로 CLI 설치 + 인증이 선결 의무 — 공식 docs (docs.coderabbit.ai/cli/claude-code-integration) 의 명시 단계.

```bash
# CodeRabbit CLI 설치
npm install -g @coderabbitai/cli
# 또는 macOS: brew install coderabbit-cli

# 인증 (OAuth 브라우저 플로우)
coderabbit auth login
```

CodeRabbit Pro 구독 필요 (트라이얼 / 무료 플랜으로도 일정 한도 내 가능).

### 2.3 Claude Code 플러그인 설치

CLI 인증 완료 후 Claude Code 안에서:

```text
/plugin install coderabbit
```

또는 외부 CLI:

```bash
claude plugin install coderabbit
```

설치 후 확인:

```text
/plugin list
```

→ `coderabbit` 등록 확인.

### 2.4 설치 검증 — 공식 slash 명령

Anthropic / CodeRabbit 공식 docs 의 정식 명령은 **`/coderabbit:review`** (콜론 + scope, 우리가 기존 잘못 박은 `/coderabbit review --staged` 와 다름):

```text
/coderabbit:review uncommitted
/coderabbit:review committed
/coderabbit:review --base main
```

→ 각각 staged / uncommitted, 최근 committed, base 와의 비교 결과 출력. **uncommitted** 가 첫 검증에 가장 적합.

## 3. 사용 패턴

### 3.1 자율 루프 (Claude writes → CodeRabbit reviews → Claude fixes)

작업 흐름:

1. Claude 결박 코드 작성 (Edit / Write)
2. Claude 결박 `/coderabbit review` 자동 호출 (또는 사용자 명시 호출)
3. CodeRabbit 결박 리뷰 코멘트 출력 (CRITICAL / MAJOR / MINOR)
4. Claude 결박 CRITICAL / MAJOR 코멘트 자동 fix (사용자 승인 후)
5. fix 후 재 review (최대 2회 — 무한 루프 차단)
6. 사용자 최종 승인 + commit + push

### 3.2 자연어 호출

```text
사용자: "지금 변경한 거 CodeRabbit 결박 검토 받아봐"
Claude: (자동 /coderabbit review 호출)
```

### 3.3 PR 봇 결박 결박 — 별개

본 플러그인 = **작업 중 즉시 호출** 결박. PR 봇 = **PR 생성 시 자동 호출** 결박. 둘은 독립적. 둘 다 활성화 가능 (중복 리뷰 결박 결박 결박 결박 결박 결박 — 본 시범 결박 결박).

## 4. 1주 시범 정책 (2026-05-17 ~ 2026-05-24)

### 4.1 시범 목적

CodeRabbit Claude Code 플러그인 결박 우리 **자동 fix-loop** (트랙 `harness-spec-driven` C3 산출물 — 테스트 실패 → 자체 수정 3회 / review CRITICAL → 자체 수정 2회) 와 **협력** 또는 **충돌** 결박 결박 결박 결박 결박 결박 결박 결박.

### 4.2 시범 기간

- 시작: 2026-05-17
- 종료: 2026-05-24 (7일)
- 트랙 ⓒ Step 3 결박 결박 결박 (시범 결과 결박 결박 정책 정착)

### 4.3 시범 운영 규칙

- 트랙 시작 시 본 플러그인 1회 이상 호출
- 호출 시점 + 결과 (CodeRabbit 코멘트 갯수 / 자체 fix-loop 결박 결박 결박 / 토큰 비용) 기록 → learning 84 보강
- 충돌 신호 결박 즉시 중단 + 다시 PR 봇만 의존:
  - 자체 fix-loop 가 한 번 잡았는데 CodeRabbit 도 같은 항목 다시 잡음 (중복) → 토큰 낭비
  - CodeRabbit 결박 잡은 항목을 자체 fix-loop 가 무한 반복 fix 시도 (수렴 X)
  - 토큰 비용 결박 결박 결박 결박 결박 결박 (시범 전 baseline 결박 결박 결박 결박 결박)

### 4.4 판단 기준 (Step 3 시점)

| 결과 | 정책 |
|---|---|
| **협력 OK** — 자체 fix-loop 와 CodeRabbit 가 다른 항목 잡음 / 중복 < 20% | 정착 — 모든 트랙 시작 시 본 플러그인 활성 default |
| **부분 협력** — 일부 트랙에서만 가치 (예: 복잡 도메인 / 보안 영역) | 조건부 — 특정 트랙 시작 시만 명시 활성화 |
| **충돌** — 중복 ≥ 50% 또는 무한 루프 발생 | 비활성 — PR 봇만 유지. learning 84 결박 회피 사유 기록 |

## 5. 비활성화

```text
/plugin disable coderabbit
```

또는 영구 제거:

```text
/plugin uninstall coderabbit
```

PR 봇은 별도 — GitHub repo 결박 직접 삭제 (Settings → Integrations).

## 6. 트랙 ⓒ Step 2 검증 기준

- [ ] 플러그인 설치 완료 (`/plugin list` 결박 결박 결박)
- [ ] 1회 이상 `/coderabbit review` 호출 + 결과 확인
- [ ] 시범 운영 규칙 (§4.3) 숙지
- [ ] 본 가이드 문서 작성 (자체)

## 7. References

- 트랙: [docs/handover/track-ai-native-2026-05-upgrade.md](../handover/track-ai-native-2026-05-upgrade.md)
- Spec: [docs/specs/features/ai-native-2026-05-upgrade.md](../specs/features/ai-native-2026-05-upgrade.md) D3
- sweep v1 §D.4 / sweep v2 §D.2
- 1주 시범 결과 learning: 84 (트랙 종료 시 작성)
- 자동 fix-loop 기존 정책: 트랙 `harness-spec-driven` C3 산출물 (learning 66)
