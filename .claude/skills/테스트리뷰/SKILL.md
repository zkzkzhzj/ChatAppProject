테스트 코드 품질을 전문적으로 검증한다.
BDD Given-When-Then 형식, 성공/실패 케이스 완전성, 테스트 독립성, 의미 없는 테스트를 집중 탐지한다.

## 실행 순서

### 1단계 — 변경사항 확인
```bash
git diff HEAD --name-only
git status --short
```
변경된 테스트 파일과 소스 파일 목록 확인.

### 2단계 — Codex 테스트 품질 리뷰 실행

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-test-quality.md"
TMPFILE="/tmp/codex_test_quality_${TIME}.txt"

codex review "테스트 코드 품질을 전문적으로 리뷰해줘. backend/src/test/java 전체와 변경된 소스 코드를 함께 보고 교차검증해줘. 집중 검토: (1) BDD 형식 — Given-When-Then 구조 명확성, 테스트명이 행동을 서술하는가, (2) 케이스 완전성 — Happy Path만 있고 실패/예외 케이스 누락, 경계값 테스트 부재, (3) 테스트 독립성 — 실행 순서 의존, @BeforeAll 공유 상태, DB 상태 오염, (4) 의미 없는 테스트 — 항상 통과하는 테스트, assert 없는 테스트, 구현 복사 테스트, (5) 통합 테스트 — Testcontainers 사용 여부, Mock 과용으로 실제 동작 미검증, (6) 테스트 누락 — 새 Service/Domain에 테스트 없음, 비즈니스 규칙 검증 누락. 각 항목 파일명:라인번호 형식, [CRITICAL] / [WARNING] / [INFO] / LGTM 형식. $ARGUMENTS" > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 3단계 — 결과 저장
Read로 `$TMPFILE` 읽고 Write로 `$REVIEW_FILE` 저장.

저장 형식:
```markdown
# 테스트 품질 리뷰 — {DATE} {TIME}

## 대상
- 종류: 테스트 품질 전문 리뷰

## Codex 리뷰 결과
(TMPFILE 내용 전체)

## 추가 메모
($ARGUMENTS)
```

저장 후 "테스트 리뷰가 `{REVIEW_FILE}`에 저장되었습니다." 출력.

---

## 사용 예시

```
/테스트리뷰
/테스트리뷰 메시지 전송 로직 테스트 집중 분석
/테스트리뷰 Kafka consumer 테스트 확인
```
