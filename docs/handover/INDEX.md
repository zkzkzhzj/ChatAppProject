# 작업 트랙 인덱스 — 마음의 고향

> **새 세션을 열었다면 이 파일부터 읽는다.** 자기가 작업할 트랙을 식별한 뒤, 해당 `track-*.md`를 읽고 시작한다.
>
> 메인 `docs/handover.md`는 전체 완료 요약 · 핵심 설계 결정만 담는다. **현재 진행 중인 작업의 상세 상태는 모두 이 디렉토리의 트랙 파일에 있다.**
>
> 병행 작업 충돌 회피 정책은 `docs/conventions/parallel-work.md` 참조.

---

## 활성 트랙 (Active)

| 트랙 ID | 파일 | 작업 영역 | 상태 | 이슈 | 시작일 |
|---------|------|-----------|------|------|--------|
| — | — | (활성 트랙 없음) | — | — | — |

> ws-redis Step 3 (클라이언트 재작성 + WS 모듈 분리) 착수 시 본 표에 다시 추가. `track-ws-redis.md` §9 인수인계 참조.
> 새 트랙을 시작할 때 이 표에 한 줄 추가하고, 해당 트랙 파일을 신규 작성한다.

## 완료 트랙 (Recently Closed)

| 트랙 ID | 결정 이력 (학습노트) | 종료일 | PR |
|---------|---------------------|--------|----|
| `harness-spec-driven` | [66 (spec-driven 4층 + fix-loop + Comprehension Gate)](../learning/66-spec-driven-fix-loop-comprehension-gate.md) · [67 (wiki 활용 강화 — 폐지 권고 철회)](../learning/67-wiki-policy-rejection-reversal.md) · [68 (NPC 차별점 ADR)](../learning/68-npc-service-differentiator-adr.md) | 2026-04-30 | #47 |
| `infra-tls-hardening` | [65 (Cookie 보안 속성 깊은 다이브)](../learning/65-cookie-security-attributes-deep-dive.md) | 2026-04-28 | #43 |
| `ws-redis` Step 2 | [44 (Spring STOMP 외부 broker)](../learning/44-spring-stomp-external-broker-choice.md) · [45 (raw WS + Redis Pub/Sub 설계서)](../learning/45-websocket-redis-pubsub-redesign.md) · [46 (마을·서버 확장 모델)](../learning/46-village-scaling-decisions.md) · [53 (헥사고날 outbound port 호출자 룰)](../learning/53-hexagonal-outbound-port-caller-rule.md) · [59 (WS 서버 분리 vs 모놀리식)](../learning/59-ws-server-separation-vs-monolith.md) | 2026-04-27 | #26 |
| `ghost-session` | [54 (presence cleanup 진단)](../learning/54-presence-cleanup-ghost-character-diagnosis.md) · [60 (STOMP reconnect 두 레이어)](../learning/60-stomp-reconnect-layered-conflict.md) | 2026-04-27 ~ 2026-04-28 | #36 · #37 · #41 |
| `ui-mvp-feedback` | [49 (React IME)](../learning/49-react-input-ime-handling.md) · [50 (모바일 터치)](../learning/50-mobile-touch-movement.md) | 2026-04-26 | #27 |

> 완료된 트랙의 `track-*.md`는 머지 후 삭제하고 학습노트로 결정 이력만 보존한다 (메인 `handover.md` §2 "전체 완료 요약" 표에도 한 줄 등록).

---

## 보류 / 미시작 트랙 (Planned)

| 트랙 ID | 예상 작업 영역 | 메모 |
|---------|---------------|------|
| `token-auto-renewal` | Issue #38 — refresh token + rotation, HttpOnly cookie 발급, WS 토큰 갱신, 게스트 영속 식별자 | 수행계획서·결정 게이트 통과·구현계획서 [track-token-auto-renewal.md](./track-token-auto-renewal.md) 에 보존. **2026-05-02 재차 보류** — Redis 저장소 선택의 5패턴 비교 + 블로그 포스팅까지 깊이 있게 가져갈 주제로 판단, UI 디자인 트랙 우선 처리 후 재개 |
| `s3-media` | S3 도입 (집 배경 이미지, 캐릭터 등) | 사전 결정 필요: 무엇을 올릴지 / 비용 정책 / 유해 필터 |
| UI 디자인 트랙 (트랙 ID 미정) | 마을/UI 디자인 개선 | **다음 착수 예정** (token-auto-renewal 보류 후 우선) |

> 시작 시점에 위 표에서 빼서 "활성 트랙" 표로 옮긴다.

---

## 트랙 시작 절차

> 상세 절차 + 0번 step 의 사유는 [`docs/conventions/parallel-work.md`](../conventions/parallel-work.md) §2.1 참조. 본 항목은 요약.

0. **GitHub 이슈 생성 + 라벨 신설** (`gh label create track:{id}`) — 트랙 ID·브랜치명·spec·track 파일 모두 이슈에서 파생. parallel-work.md §2.1 0번 step 정합
1. 위 활성 표에 트랙 한 줄 추가 (이슈 번호 컬럼 포함)
2. **Spec 파일 작성** (`docs/specs/features/{feature}.md` — `_template.md` 사용. 트랙 `harness-spec-driven` C2 의무화)
3. `docs/handover/track-{id}.md` 신규 작성 (이 파일 마지막 "트랙 파일 템플릿 v2" 참조 — Issue·Spec 메타데이터 명시)
4. `docs/learning/RESERVED.md`에 자기 트랙용 번호 대역 예약 (5번 단위 권장)
5. 새 git 브랜치 분기 (`main`에서 분기, 이름 컨벤션 `feat/{id}-step{N}` 또는 `infra/{id}` 등)
6. 시작 보고 — 메인 `docs/handover.md` 갱신은 **트랙 머지 시점에만**

---

## 트랙 종료 절차 (머지 후)

1. 트랙 파일에 "✅ 종료" 표시
2. 위 인덱스 표에서 "활성"에서 제거 (또는 "완료" 섹션으로 이동 — 추후 개선)
3. 메인 `docs/handover.md`에 한 줄 요약 추가 (어떤 트랙이 완료됐는지)
4. learning RESERVED.md의 해당 번호 "사용 완료" 표시

---

## 트랙 파일 템플릿 (v2 — 트랙 `harness-spec-driven` C2 도입, 2026-04-30)

> v2 변경점: §0.5 Acceptance Criteria 추가 / Issue·Spec 메타데이터 명시 / step 표에 의존·이슈·PR 컬럼 추가 / 1 step = 1 PR 명시 / §6 보류 메모 추가.

새 트랙 파일을 만들 때 아래 구조 유지:

```markdown
# Track: {trackId}

> 작업 영역: ...
> 시작일: YYYY-MM-DD
> Issue: #{N}
> 브랜치: {feat|fix|infra|chore|docs}/{...}
> Spec: [docs/specs/features/{feature}.md](../specs/features/{feature}.md)

## 0. 한 줄 요약
{이 트랙이 무엇을 달성하려는가}

## 0.5 Acceptance Criteria (이게 통과하면 트랙 종료)
- [ ] ...
- [ ] ...
> spec §6 Verification 과 1:1 매핑. 트랙 종료 시 같이 체크.

## 1. 배경 / 왜
{이 트랙이 필요한 이유. 관련 learning/spec/incident 링크}

## 2. 전체 로드맵 (1 step = 1 PR — git.md §4)
| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 1    | ...  | —   | ✅/🔧/대기 | #N | #M |

## 3. 현재 단계 상세
{진행 중인 Step의 작업 항목, 결정 사항, 막힌 지점}
{decisions 추가/변경 시 spec §4 동기화}

## 4. 충돌 위험 파일
{이 트랙이 건드리는 공유 파일 목록 — 다른 트랙도 알 수 있게. parallel-work.md §3 Tier 분류 참조}

## 5. 다음 세션 착수 전 확인 사항
{이 트랙을 이어서 작업할 사람이 시작 전에 점검해야 할 것}

## 6. 보류 메모
{다른 트랙·후속 작업으로 미루는 것들 — 종료 시 RESERVED 또는 INDEX 후속 트랙으로 승격}
```
