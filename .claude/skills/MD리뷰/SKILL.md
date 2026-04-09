프로젝트의 문서 정합성과 문서-코드 교차검증을 수행한다.
결과는 [CRITICAL] / [WARNING] / [INFO] / LGTM 형식으로 출력하고 docs/reviews/에 저장한다.

## 실행 순서

### 주의사항 (CLI 제약)
codex 0.118.0에서 `--base`/`--uncommitted`와 `[PROMPT]`는 함께 쓸 수 없다.
MD리뷰는 `codex review "PROMPT"` 방식으로 실행한다.
Codex가 프로젝트 전체와 AGENTS.md를 함께 참고한다고 가정한다.

### 1단계 — Codex로 문서 정합성 리뷰 실행 (출력을 파일로 직접 저장)

codex review 출력은 수 MB에 달할 수 있어 stdout으로 받으면 Bash 도구 용량 초과로 접근이 불가능해진다.
**반드시 아래처럼 파일로 리다이렉트해서 실행한다.**

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-md-review.md"
TMPFILE="/tmp/codex_md_review_${TIME}.txt"

codex review "AGENTS.md와 실제 코드베이스를 기준으로 문서 정합성 리뷰를 수행해줘. docs 아래 문서 전체와 backend/src/main/java, backend/src/test/java, application.yml, migration SQL을 필요 범위까지 읽고 교차검증해줘. 문서끼리 상충하는 설명, 문서와 실제 코드의 불일치, 잘못된 경로, 파일 위치, 패키지 구조, 엔드포인트, 이벤트 이름, 설정 키, 테스트 범위를 찾아줘. 특히 문서에 완료되었다고 적혀 있지만 코드에는 없는 항목, 코드에는 있는데 문서에 반영되지 않은 운영상 중요한 항목, 잘못된 의사결정을 유도하는 설명을 우선 보고해줘. 각 항목은 반드시 파일명:라인번호 형식으로 적고, [CRITICAL] / [WARNING] / [INFO] / LGTM 형식으로 출력해줘. 확신 없는 내용은 추정이라고 명시하거나 제외해줘. $ARGUMENTS" > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 2단계 — 리뷰 결과를 문서로 저장
codex 실행이 완료되면 Read 도구로 `$TMPFILE` 전체를 읽고 Write 도구로 `REVIEW_FILE`에 저장한다.
파일이 크면 offset을 사용해 전체를 확인한다.

저장 형식:
```markdown
# MD 정합성 리뷰 — {DATE} {TIME}

## 대상
- 종류: 문서 정합성 + 코드↔명세 교차검증

## Codex 리뷰 결과
(TMPFILE의 codex 최종 응답 전체)

## 추가 메모
($ARGUMENTS로 전달받은 내용이 있으면 기록)
```

파일 저장 후 "MD 리뷰가 `{REVIEW_FILE}`에 저장되었습니다."라고 출력한다.

---

## 사용 예시

```
/MD리뷰
/MD리뷰 API 명세 집중 점검
```

---

## 참고: 다른 리뷰 스킬과의 차이

| | /코드리뷰 | /전체리뷰 | /MD리뷰 |
|--|---------|---------|---------|
| 대상 | uncommitted changes | 전체 코드베이스 | 문서 + 코드 교차검증 |
| 기준 | AGENTS.md Critical Rules | AGENTS.md Critical Rules | 문서 정합성 + 코드 일치 여부 |
| 저장 파일 | `HH-MM-uncommitted.md` | `HH-MM-full.md` | `HH-MM-md-review.md` |

$ARGUMENTS
