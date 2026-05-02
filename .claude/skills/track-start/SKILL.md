새 트랙을 시작한다. parallel-work.md §2.1 절차의 1커맨드 압축.

## 입력

- `$ARGUMENTS`: 트랙 ID (kebab-case). 예: `token-auto-renewal`. 비어있으면 묻는다.

## 사전 조건

- spec 파일 존재 (`docs/specs/features/{feature}.md`). 없으면 `/spec-new` 안내 후 종료
- 현재 main 브랜치 + 깨끗한 working tree

## 실행 순서

### 1단계 — 사전 조건 체크

```bash
git branch --show-current
git status --short
ls docs/specs/features/{feature}.md
```

조건 미달이면 종료.

### 2단계 — main 동기화

```bash
git checkout main
git pull --ff-only origin main
```

### 3단계 — 트랙 라벨 신설

```bash
gh label create "track:{track-id}" \
  --description "{한 줄 설명 — 사용자에게 묻기}" \
  --color "0E8A16" 2>/dev/null || true
```

### 4단계 — handover/INDEX.md 활성 표 행 추가

활성 표에 한 줄 추가:

```markdown
| `{track-id}` | [track-{track-id}.md](./track-{track-id}.md) | {영역} | 진행 중 (Step 1) | #{N} | YYYY-MM-DD |
```

### 5단계 — track-{id}.md 신규 작성

`docs/handover/INDEX.md` 의 "트랙 파일 템플릿 v2" 복사 → `docs/handover/track-{track-id}.md`.
메타데이터 채우기:

- 작업 영역
- 시작일 (오늘)
- Issue: #{N}
- 브랜치: `{type}/{track-id}-step1`
- Spec: `docs/specs/features/{feature}.md`

### 6단계 — RESERVED.md 번호 예약

사용자에게 예약 개수 묻기 (기본 5번 단위, 최소 1개).
가용 가장 작은 번호부터 N개 예약:

```markdown
| {N1} | `{track-id}` | (작성 시 채움) | 예약 |
| {N2} | `{track-id}` | (작성 시 채움) | 예약 |
```

`마지막 사용 번호` 는 갱신 X (예약은 사용 X).

### 7단계 — 새 git 브랜치 분기

브랜치 type 묻기 또는 자동 추론 (`feat` / `fix` / `refactor` / `infra` / `chore` / `docs`):

```bash
git checkout -b {type}/{track-id}-step1
```

### 8단계 — 시작 보고

다음을 1~2 화면에 정리해 출력:

- 트랙 ID, 이슈 #{N}, spec 경로, 브랜치명
- RESERVED 예약 번호 대역
- 다음 행동 안내: `/step-start 1` 로 첫 step 진입

## 사용 예시

```text
/track-start token-auto-renewal
/track-start s3-media-upload
```

## 관련 문서

- `docs/conventions/parallel-work.md` §2.1 (트랙 시작 절차)
- `docs/conventions/spec-driven.md` (4층 분리 모델)
- `docs/handover/INDEX.md` (트랙 파일 템플릿 v2)
