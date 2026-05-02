새 트랙의 spec 파일을 생성한다 (`docs/specs/features/{feature}.md`). spec-driven 4층 분리 모델의 Spec 층 진입점.

## 입력

- `$ARGUMENTS`: feature 이름 (kebab-case). 예: `token-auto-renewal`, `s3-media-upload`.
  비어있으면 사용자에게 묻는다.

## 사전 조건

- `docs/specs/features/_template.md` 존재 (트랙 `harness-spec-driven` C2 산출물)
- 활성 트랙이 있거나, 새 트랙으로 시작할 의사 명확

## 실행 순서

### 1단계 — 입력 확인 + 충돌 체크

```bash
ls docs/specs/features/{feature}.md
```

이미 존재하면 종료. 사용자에게 알리고 덮어쓰기 금지.

### 2단계 — 트랙·이슈 매핑

- 활성 트랙이 있으면 그 트랙 ID 사용
- 없으면 사용자에게 트랙 ID 묻기 (kebab-case)
- 이슈 번호 묻기. 최근 열린 이슈 5개 보여주기:

```bash
gh issue list --state open --limit 5
```

### 3단계 — 템플릿 복사

```bash
cp docs/specs/features/_template.md docs/specs/features/{feature}.md
```

### 4단계 — frontmatter 채우기

`docs/specs/features/{feature}.md` 의 frontmatter 갱신:

- `feature`: {feature}
- `track`: {track-id}
- `issue`: "#{N}"
- `status`: draft
- `created`: 오늘 날짜 (YYYY-MM-DD)
- `last-updated`: 오늘 날짜

### 5단계 — wiki 영향 페이지 자동 매핑 (의무 — wiki-policy.md §2.3)

`docs/wiki/INDEX.md` 읽고, feature 이름·키워드 기반으로 관련 wiki 페이지 후보 추출.
사용자에게: "이 wiki 페이지 link 가 §7 references 에 들어갈까?" 묻기.

처리 분기:

- 사용자가 페이지 1개 이상 선택 → §7 `관련 wiki` 라인에 link 추가
- 사용자가 명시적으로 "해당 없음" / "없음" → §7 `관련 wiki` 라인에 `해당 없음 (spec 작성 시점에 매핑된 wiki 페이지 없음)` 자동 기록 + 본 결정 사유 1줄 (선택)
- 빈 응답 / 침묵 → wiki/INDEX 1회 재제시 후 동일 분기 반복

> 사유: 강제 종료(빈 입력 → spec 생성 거부)보다 마찰이 낮고 결정 흔적은 그대로 남는다. 후속 트랙·다음 세션이 "이 spec 작성 시점에 wiki 검토했고 매핑 없음을 의식적으로 결정함"을 본문에서 확인할 수 있다 (CodeRabbit C7 리뷰 B5).

### 6단계 — 사용자 작성 안내

- spec 의 §1~§6 은 사용자가 직접 채워야 한다 (placeholder 만 들어있음)
- 특히 §4 `decisions` 의 4축 (왜·대안·빈틈·재검토 트리거) 미리 채우면 Comprehension Gate 자동 통과 (`docs/conventions/comprehension-gate.md` §7)
- 작성 후 `/track-start {track-id}` 로 트랙 시작

### 7단계 — 완료 보고

생성된 파일 경로 + frontmatter 요약 + 다음 행동 출력.

## 사용 예시

```text
/spec-new token-auto-renewal
/spec-new s3-media-upload
/spec-new                       (인자 없으면 묻기)
```

## 관련 문서

- `docs/conventions/spec-driven.md` (4층 분리 모델)
- `docs/conventions/wiki-policy.md` §2.3 (wiki 링크 의무)
- `docs/conventions/comprehension-gate.md` §7 (decisions 4축 ↔ 게이트 자동 통과)
- `docs/specs/features/_template.md` (템플릿)
