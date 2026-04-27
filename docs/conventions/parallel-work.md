# Parallel Work — 병행 작업 컨벤션

> 여러 Claude Code 세션이 동시에 다른 작업을 진행할 때의 충돌 회피 규칙.
>
> **세팅 마이그레이션 배경**: 단일 세션 가정으로 만들어진 기존 구조(handover.md 1개, 메모리 1개)가 병행 시 머지 충돌·정보 덮어쓰기를 유발. 트랙 단위로 분리해 충돌 표면적을 0으로 줄인다.

---

## 1. 트랙(Track) 정의

**하나의 트랙 = 하나의 목적 + 하나 이상의 PR + 자기 sub-handover**

예시:

- `ws-redis` — 채팅 broker B안 재설계 (Step 1~7)
- `ui-mvp-feedback` — MVP 피드백 F-1 ~ F-5 대응
- `s3-media` — S3 도입 (집 배경 이미지 등)

**트랙 단위로 세션을 가른다.** 한 세션은 한 트랙만 작업. 한 트랙을 여러 세션이 나눠 진행할 수는 있지만, 한 세션이 여러 트랙을 섞으면 트랙 분리의 의미가 사라진다.

---

## 2. 트랙 시작 절차

### 2.1 신규 트랙 시작 시

> **0번 — 이슈 먼저.** 트랙 시작 전에 GitHub 이슈를 먼저 만든다. 트랙 ID·브랜치명·track 파일은 모두 이 이슈에서 파생된다. 이슈 없는 트랙은 "왜 시작했는지" 외부에서 추적 불가.

0. **GitHub 이슈 생성** — `.github/ISSUE_TEMPLATE/` 의 bug / feature 템플릿 사용. 발급된 이슈 번호 `#N` 확보
1. **트랙 ID 정의** — 이슈 제목에서 추출한 짧은 영문 kebab-case (예: `ws-redis`, `ui-mvp-feedback`, `ghost-session`)
2. **`docs/handover/INDEX.md` 갱신** — "활성 트랙" 표에 한 줄 추가 (이슈 번호 컬럼 포함)
3. **`docs/handover/track-{id}.md` 신규 작성** — INDEX.md의 "트랙 파일 템플릿" 따름. 첫 줄에 `Issue: #N` 표시
4. **`docs/learning/RESERVED.md`에 번호 대역 예약** — 5번 단위 권장 (예: 49~53)
5. **새 git 브랜치 분기** — `main`에서 분기. 컨벤션 (브랜치명에는 `#` 안 넣음 — 일부 쉘/도구 호환):
   - 기능 구현: `feat/{track-id}-step{N}` (예: `feat/ws-redis-step2`)
   - 인프라/설정: `infra/{track-id}` (예: `infra/s3-bucket-setup`)
   - 버그 수정: `fix/{track-id}` (예: `fix/ghost-session`)
   - UI 수정: `fix/{track-id}-{specifics}` 또는 `feat/{track-id}-{feature}`
   - 이슈 연결은 **PR 본문에 `Closes #N`** 으로 명시 (브랜치명 X)
6. **(선택) memory에 트랙 상태 파일** — 작업 빈도가 높은 트랙은 `memory/track_{id}_status.md` 분리 권장

### 2.2 기존 트랙 이어받기 시

1. `docs/handover/INDEX.md`에서 활성 트랙 확인
2. 해당 `track-{id}.md` 정독 — "현재 단계 상세" + "다음 세션 착수 전 확인 사항"
3. 메인 `docs/handover.md`는 전체 그림용. **트랙 상세는 sub만**.
4. 작업 시작 전 main pull → 트랙 브랜치 rebase

---

## 3. 충돌 위험 파일 분류

### 3.1 Tier 0 — 거의 항상 충돌 (트랙별 분리 필수)

| 파일/디렉토리 | 분리 방법 |
|--------------|-----------|
| `docs/handover.md` (메인) | 트랙 진행 중 수정 금지. **트랙 머지 PR 안에서만** 갱신 (머지 후 별도 docs PR 금지 — §8 참조) |
| `docs/handover/track-*.md` | 트랙별 별도 파일이라 자연 분리. 종료 표시도 머지 PR 안에서 |
| `memory/project_status.md`, `memory/project_next_session.md` | 트랙별 `memory/track_{id}_status.md` 분리 권장 |
| `docs/learning/INDEX.md` | RESERVED.md로 번호 충돌 방지. INDEX는 노트 추가 시 한 줄씩 |

### 3.2 Tier 1 — 자주 충돌 (수정 전 동기화 필수)

| 파일 | 동기화 방법 |
|------|-------------|
| `build.gradle.kts` | 의존성 추가 시 다른 트랙 동시 작업 여부 확인. 머지 후순위면 rebase |
| `src/main/resources/application.yml` | 같은 키 X. 섹션 분리. 추가 시 트랙명 코멘트 권장 |
| `deploy/docker-compose.yml` | 새 컨테이너/env 추가 시 트랙 머지 순서 사전 협의 |
| `deploy/.env` | 새 env var 추가 시 같은 이름 X |
| `frontend/package.json` | 의존성 추가 시 같은 패턴 |
| `CLAUDE.md` | 거의 안 바뀜. 바꿔야 하면 단독 PR |

### 3.3 Tier 2 — 가끔 충돌 (자연스러운 머지 가능)

대부분의 일반 코드 파일. 트랙별 작업 영역이 패키지/디렉토리로 자연 분리되어 있다면 충돌 거의 없음.

---

## 4. 머지 정책

### 4.1 한 번에 한 트랙만 main 머지

병렬 머지 금지. **트랙 A 머지 → main 동기화 → 트랙 B는 main pull 후 rebase → 머지** 순서.

### 4.2 머지 직전 체크리스트

> **트랙 종료 docs 는 본 머지 PR 에 모두 포함한다.** 머지 후 별도 docs PR 금지 (§8 참조).

- [ ] 자기 트랙의 `track-{id}.md` 갱신 (✅ 종료 표시 + Step 상태 정정)
- [ ] `docs/handover/INDEX.md` — 활성 트랙 표에서 제거, 완료 트랙 표에 한 줄 추가 (학습노트 링크 포함)
- [ ] 메인 `docs/handover.md` — §1 활성 트랙에서 제거 + "최근 종료 트랙" 갱신 + §2 "전체 완료 요약" 표에 한 줄 추가 + §4 진행 중 트랙에서 제거 (해당 시 후속 트랙 후보 추가)
- [ ] RESERVED.md의 사용한 번호 "사용 완료" 표시 + 미사용 예약 번호 "반환"
- [ ] memory 파일 갱신 (트랙별 분리 안 한 경우)
- [ ] 다른 활성 트랙의 Tier 1 파일 동시 수정 여부 확인 (동시 수정이면 머지 순서 협의)

### 4.3 머지 후

- 다른 활성 트랙 세션은 작업 시작 전 main pull → 자기 브랜치 rebase
- conflict 발생 시 트랙 간 영역 침범인지 단순 인접 라인인지 확인

---

## 5. 세션 간 통신 규칙

세션끼리 직접 대화는 안 함. **모든 정보는 파일을 통해서만** 교환.

### 5.1 정보 종류별 매개체

| 정보 종류 | 매개체 |
|-----------|--------|
| "지금 어느 트랙들이 활성 상태?" | `docs/handover/INDEX.md` |
| "이 트랙은 어디까지 왔나?" | `docs/handover/track-{id}.md` |
| "다음에 뭘 해야 하나?" (트랙 내) | `track-{id}.md`의 "다음 세션 착수 전 확인 사항" |
| "왜 이런 결정을 했나?" | `docs/learning/{n}-*.md` |
| "어떤 번호 쓸 수 있나?" | `docs/learning/RESERVED.md` |
| "내가 작업 중인 영역 다른 트랙도 건드리나?" | 각 `track-{id}.md`의 "충돌 위험 파일" 섹션 |

### 5.2 보류 메모

다른 트랙과 관련 있지만 **지금 트랙에서 다룰 일이 아닌 주제**는 자기 트랙 파일의 "보류 메모" 섹션에 기록. 나중에 그 트랙을 시작하는 세션이 본다.

---

## 6. 안티 패턴 (하지 말 것)

| 안티 패턴 | 왜 문제 |
|----------|---------|
| 한 세션에서 여러 트랙 동시 작업 | 트랙 분리 의미 무효화. 머지 단위가 섞임 |
| 메인 `handover.md`를 트랙 진행 중 갱신 | 다른 세션과 거의 100% 충돌 |
| RESERVED.md 확인 없이 learning 번호 사용 | 동일 번호 두 트랙이 사용 → 머지 깨짐 |
| Tier 1 파일을 협의 없이 동시 수정 | 머지 conflict 폭탄 |
| 트랙 종료 안 하고 새 트랙 시작 | INDEX 가독성 깨짐, 인지 부하 증가 |
| 같은 브랜치에서 여러 PR | 기존 git 컨벤션 위반 (`git.md` §1 참조) |

---

## 7. 실전 시나리오: `ws-redis`와 `ui-mvp-feedback` 병행

```text
세션 A (ws-redis Step 2 작업 중):
  브랜치: feat/ws-redis-step2
  주 작업 영역:
    - communication/adapter/in/websocket/ (신규 핸들러)
    - global/config/ (JwtHandshakeInterceptor 신규)
    - communication/adapter/out/messaging/redis/ (신규)

세션 B (ui-mvp-feedback F-3 IME 작업 중):
  브랜치: fix/ui-mvp-feedback-mac-ime
  주 작업 영역:
    - frontend/src/components/chat/ChatInput.tsx
    - frontend/src/hooks/useImeComposition.ts (신규)

겹치는 파일: 없음
Tier 1 동시 수정: 없음
머지 순서: 무관, 어느 쪽 먼저 머지해도 됨
```

```text
세션 A (ws-redis Step 5 운영 배포):
  Tier 1 수정: deploy/docker-compose.yml (Redis 추가), application.yml (Redis 설정)

세션 C (s3-media 인프라 작업):
  Tier 1 수정: deploy/.env (S3 env), application.yml (AWS 설정)

겹치는 파일: application.yml
키 충돌: 없음 (spring.redis.* vs spring.cloud.aws.s3.*)
머지 순서: 협의. 한 쪽 먼저 머지 → 다른 쪽 rebase
```

---

## 8. 트랙 종료 후 정리

> **모든 정리는 트랙 머지 PR 안에서 끝낸다. 머지 후 별도 docs cleanup PR 금지.**
>
> 머지 후 정리 PR 을 따로 만들면 한 작업에 브랜치/PR 이 두 개 나오고, 트랙 종료 정보가 메인에 늦게 반영되어 다른 세션이 종료된 트랙을 활성으로 오인할 수 있다. 트랙 머지 = 트랙 종료 시그널이므로 같은 PR 에서 처리.

1. 트랙 파일에 "✅ 종료 (YYYY-MM-DD)" 표시
2. `docs/handover/INDEX.md` — 활성 트랙에서 제거, 완료 트랙 표에 한 줄 추가 (학습노트 링크 포함)
3. 메인 `docs/handover.md` — §1 인덱스 정정 + §2 전체 완료 요약 표에 한 줄 추가 + §4 진행 중 트랙 정리
4. RESERVED.md의 사용 안 한 예약 번호 "반환" 처리
5. 트랙 전용 memory 파일이 있다면 정리 (요약만 메인 메모리로 이관 후 삭제 또는 archive)

위 1~5 는 §4.2 머지 직전 체크리스트와 일치 — 머지 PR 안에서 한 번에 처리한다.

---

## 9. 본 컨벤션 변경 시

본 문서를 수정하는 PR은 **단독 PR**로 한다. 다른 트랙 작업과 섞으면 정책 변경이 묻힌다.
