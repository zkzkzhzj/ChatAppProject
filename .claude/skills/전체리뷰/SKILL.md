커밋 여부와 관계없이 전체 프로젝트 코드베이스를 Codex가 AGENTS.md 기준으로 리뷰하고, 결과를 날짜/시간별로 기록한다.

## 실행 순서

### 주의사항 (CLI 제약)
codex 0.118.0에서 `--base`/`--uncommitted`와 `[PROMPT]`는 함께 쓸 수 없다.
전체리뷰는 `codex review "PROMPT"` 방식으로 실행한다.
이 방식은 프로젝트 전체를 스캔하며, Codex가 AGENTS.md를 함께 참고한다고 가정한다.

### 1단계 — 전체 프로젝트 리뷰 (출력을 파일로 직접 저장)

codex review 출력은 수 MB에 달할 수 있어 stdout으로 받으면 Bash 도구 용량 초과로 접근이 불가능해진다.
**반드시 아래처럼 파일로 리다이렉트해서 실행한다.**

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-full.md"
TMPFILE="/tmp/codex_full_review_${TIME}.txt"

codex review "AGENTS.md를 최우선 기준으로 전체 프로젝트를 전수 코드리뷰해줘. backend/src/main/java 전체, backend/src/test/java와 feature 테스트 전체, 그리고 필요하면 application.yml, migration SQL, 관련 문서까지 읽고 교차검증해줘. 반드시 Critical Rules 위반 여부를 먼저 검사하고, 특히 Domain Entity의 인프라 또는 Spring 어노테이션, 도메인 간 직접 참조, @Autowired 필드 주입, throw new RuntimeException(), 동시성 전략 부재, check-then-act 멱등성 패턴(exists/isPresent 후 insert), Kafka/outbox/idempotency의 예외 삼키기와 이벤트 유실 가능성, @Transactional의 Service 계층 원칙 위반, WebSocket과 REST 입력 검증 불일치, 테스트 누락을 중점적으로 봐줘. 변경 요약보다 실제 장애 가능성, 데이터 정합성, 운영 리스크를 우선해서 리뷰하고, 각 항목은 반드시 파일명:라인번호 형식으로 적어줘. 출력은 [CRITICAL] / [WARNING] / [INFO] / LGTM 형식을 따르고, 확신 없는 내용은 추정이라고 명시하거나 제외해줘. $ARGUMENTS" > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 2단계 — 리뷰 결과를 문서로 저장
codex 실행이 완료되면 Read 도구로 `$TMPFILE` 전체를 읽고 Write 도구로 `REVIEW_FILE`에 저장한다.
파일이 크면 offset을 사용해 전체를 확인한다.

저장 형식:
```markdown
# 전체 프로젝트 리뷰 — {DATE} {TIME}

## 대상
- 종류: full project scan (전체 프로젝트 스캔)

## Codex 리뷰 결과
(TMPFILE의 codex 최종 응답 전체)

## 추가 메모
($ARGUMENTS로 전달받은 내용이 있으면 기록)
```

파일 저장 후 "전체 리뷰가 `{REVIEW_FILE}`에 저장되었습니다."라고 출력한다.

---

## 사용 예시

```
/전체리뷰
/전체리뷰 동시성 관련 코드 집중 분석
```

---

## 참고: /코드리뷰 대비 차이

| | /코드리뷰 | /전체리뷰 |
|--|---------|---------|
| 대상 | uncommitted changes만 | 전체 프로젝트 |
| 용도 | 작업 중 빠른 피드백 | 전체 구조, 누락 규칙, 운영 리스크 점검 |
| 속도 | 빠름 | 느림 |
| 저장 파일 | `docs/reviews/YYYY-MM-DD/HH-MM-uncommitted.md` | `docs/reviews/YYYY-MM-DD/HH-MM-full.md` |
