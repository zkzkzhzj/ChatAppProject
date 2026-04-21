# MD 정합성 리뷰 — 2026-04-21 13-39

## 대상
- 종류: 문서 정합성 + 코드↔명세 교차검증 (Frontend Docker healthcheck IPv6 이슈 관련)
- 변경 범위:
  - `frontend/Dockerfile` (HEALTHCHECK 복원)
  - `deploy/docker-compose.yml` (`HOSTNAME: 0.0.0.0` 주입)
  - `docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md` (신규)
  - `docs/knowledge/INDEX.md` (infra 섹션 추가)
  - `docs/knowledge/changelog.md` (2026-04-21 엔트리 추가)

## Codex 리뷰 결과 (요약)

원본 전체 로그: `docs/reviews/2026-04-21/13-39-md-review-codex-raw.txt`

Codex 최종 결론:
> 검증 대상 코드 자체는 `HOSTNAME=0.0.0.0`과 `wget http://127.0.0.1:3000/` 조합으로 의도와 일치합니다. INDEX 링크는 존재하고, changelog 형식과 wiki/handover 잔여 healthcheck 과제도 명백한 불일치는 없으며, 발견된 문제는 문서 발췌값 불일치에 한정됩니다.

### [P3 / WARNING] 문서 발췌값과 실제 Dockerfile 불일치
- `docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md:119-120`
- 실제 `frontend/Dockerfile:50-51`과 HEALTHCHECK 파라미터가 다름
  - 실제: `--interval=10s --timeout=5s --start-period=30s --retries=5` + `>/dev/null 2>&1`
  - 문서: `--interval=15s --timeout=3s --start-period=10s --retries=3` (리다이렉션 없음)
- 운영자가 문서만 보고 재현 시 잘못된 healthcheck 파라미터를 쓸 수 있음 → 수정 필요

## 보완 검증 및 수정 내역

### 추가 교차 검증 (Read/Grep)
1. `frontend/Dockerfile:49-51` — HEALTHCHECK wget 명령 실제 라인 확인 ✓
2. `deploy/docker-compose.yml:221-224` — frontend 서비스 environment에 `HOSTNAME: 0.0.0.0` 추가 + 2줄 주석 ✓
3. `docs/knowledge/INDEX.md:38-42` — "인프라 / 배포 트러블슈팅" 섹션 추가, 링크 `infra/nextjs-docker-healthcheck-ipv6-binding.md` 유효 (EXISTS 확인) ✓
4. `docs/knowledge/changelog.md:1-33` — 2026-04-21 엔트리 추가, 형식 일관성 (다른 엔트리와 동일한 h2 + h3 + bullet 구조) ✓
5. `docs/wiki/` 하위 healthcheck/HOSTNAME/IPv6/wget 관련 기술 설명 검색 → 없음 (wiki는 도메인 지식 중심이라 Docker healthcheck 이슈는 knowledge/infra 계층이 적절) ✓
6. `docs/handover.md` healthcheck 관련 기존 서술 검색 → 2건 (369행 "CodeRabbit 대응 Dockerfile HEALTHCHECK", 777행 "HealthCheckSteps")만 있고 둘 다 이번 이슈와 무관. "Frontend healthcheck 재도입" 미해결 과제 항목은 handover.md에 **문자열 그대로 존재하지 않음** — 별도 처리 불필요 ✓
7. `docs/learning/*nextjs*.md` 및 `docs/learning/*healthcheck*.md` 검색 → 아직 learning-agent가 작성 중인 듯 파일 없음 (병렬 작업이라 정상, 참조 생략)

### 자동 수정 (명백한 정합성 문제)
1. **`docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md:117-121`** — Dockerfile 발췌를 실제 코드와 일치시킴
   - HEALTHCHECK 파라미터 `15s/3s/10s/3` → `10s/5s/30s/5`
   - wget 명령에 `>/dev/null 2>&1` 리다이렉션 추가
   - 실제 Dockerfile `Line 49` 주석도 같이 포함
   - 왜 그 값을 택했는지 (`start-period=30s` Next.js 웜업, `retries=5` CD 안정성, 리다이렉션 = Docker 로그 노이즈 억제) 부연 설명 1문단 추가

### 수정한 파일
| 파일 | 변경 내용 |
|------|----------|
| `docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md` | HEALTHCHECK 발췌 파라미터/리다이렉션을 실제 Dockerfile과 일치. 파라미터 선택 근거 1문단 추가 |

## 사용자 판단 필요 (리포트만, 자동 수정하지 않음)

1. **`docs/handover.md` 업데이트 포인트 (사용자 직접 처리 예정)**
   - 현재 handover.md에는 "Frontend healthcheck 재도입" 항목이 **문자열 그대로는 없음**. 369행의 4/15 항목 "Dockerfile HEALTHCHECK" 언급은 이번 이슈와 무관한 PR #8 리뷰 대응.
   - 다만 PR #17/#18/#19 연쇄 실패 → #19 완료라는 **최신 4/21 서사**가 handover에 아직 반영되지 않았을 수 있음. 현재 상태 블록(2026-04-21 기준, 17차) 헤더와 실제 4/21 섹션(**4/21 — 12-factor Config 이관 + deploy/ 디렉토리 분리** 부분) 근처에 healthcheck IPv6 해결 항목을 한 줄 추가할지 검토 권장.
   - 제안 문구 예시:
     > **4/21 — Frontend Docker healthcheck IPv6 이슈 해결** ✅ (PR #19)
     > | 근본 원인 | Next.js standalone 기본 hostname=localhost + Node 17+ localhost IPv6 우선 + Alpine BusyBox IPv6 미지원 3중 교착 |
     > | 해결 | compose에서 `HOSTNAME=0.0.0.0` 주입 + Dockerfile `HEALTHCHECK wget` 복원 |
     > | 문서 | `docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md` (리서치 기반 의사결정 기록) |

2. **`docs/wiki/` 보강 여부**
   - 현재 wiki에는 Docker/healthcheck/배포 카테고리가 없음 (frontend/phaser-setup, websocket-client, asset-guide만 존재)
   - Wiki는 "정규 지식" 계층이라 **원샷 트러블슈팅은 knowledge/infra에 두는 것이 올바른 분류**. 신규 wiki 페이지 생성은 과도하다고 판단 → **변경 권하지 않음**.
   - 단, 장기적으로 `docs/wiki/infra/` 카테고리를 신설하고 INDEX에서 knowledge/infra로 포인터를 걸 수 있음 (선택사항).

3. **Critical Rule 위반 여부**
   - 위반 없음. 이번 변경은 인프라 설정 + 문서만이라 아키텍처/도메인 규칙과 무관.

## 검증 결과 요약

### 통과
- 코드(`frontend/Dockerfile`, `deploy/docker-compose.yml`) ↔ 의도 일치
- `docs/knowledge/INDEX.md` infra 섹션 링크 유효
- `docs/knowledge/changelog.md` 2026-04-21 엔트리 형식 일관성 유지
- `docs/wiki/` healthcheck 관련 stale 설명 없음 (충돌 없음)
- `docs/handover.md`에 "Frontend healthcheck 재도입" 미해결 과제 문자열 없음

### 조치 필요 (자동 수정함)
- `docs/knowledge/infra/nextjs-docker-healthcheck-ipv6-binding.md` Dockerfile 발췌 불일치 수정

### 사용자 판단 필요
- `docs/handover.md`에 4/21 healthcheck 해결 항목 한 줄 추가 (사용자 직접 처리 예정이라고 명시함)
- wiki 신규 페이지는 만들지 않는 것을 권장 (과도)
