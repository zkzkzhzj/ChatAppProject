동시성·데이터 정합성·성능 관점에서 코드를 전문 검증한다.
check-then-act 패턴, 트랜잭션 범위, 락 전략, Kafka 멱등성, N+1 쿼리를 집중 탐지한다.

## 실행 순서

### 1단계 — 변경사항 확인
`git diff HEAD --name-only`와 `git status`로 변경 파일 목록 확인.
변경사항이 없으면 전체 프로젝트 대상으로 진행.

### 2단계 — Codex 동시성 전문 리뷰 실행

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-concurrency.md"
TMPFILE="/tmp/codex_concurrency_${TIME}.txt"

codex review "동시성·데이터 정합성·성능 관점에서 코드를 전문적으로 리뷰해줘. 집중 검토 항목: (1) check-then-act 패턴 — existsBy/findBy 조회 후 save() 패턴에서 동시 요청 시 중복 삽입 가능성, (2) 낙관적/비관적 락 — 포인트 차감, 아이템 구매, 수량 변경 등 상태 변경 로직에 @Version 또는 @Lock 누락, (3) 트랜잭션 범위 — @Transactional 메서드 내 외부 API 호출/파일 I/O 포함 여부, 관련 로직이 서로 다른 트랜잭션으로 분리된 경우, (4) Kafka 멱등성 — @KafkaListener에서 같은 메시지 두 번 처리 시 안전한지, idempotency key 또는 중복 방어 로직 존재 여부, (5) N+1 쿼리 — LAZY fetch 필드를 루프에서 접근하는 패턴, @EntityGraph 또는 JOIN FETCH 누락, (6) 분산 환경 안전성 — 로컬 캐시에 상태 저장, 분산 락 필요한 로직에 Redisson 등 미사용. 각 항목은 파일명:라인번호 형식으로, [CRITICAL] / [WARNING] / [INFO] / LGTM 형식으로 출력해줘. 확신 없는 내용은 추정 명시. $ARGUMENTS" > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 3단계 — 결과 저장
Read로 `$TMPFILE` 전체를 읽고 Write로 `$REVIEW_FILE`에 저장.

저장 형식:
```markdown
# 동시성·성능 리뷰 — {DATE} {TIME}

## 대상
- 종류: 동시성·데이터 정합성·성능 전문 리뷰

## Codex 리뷰 결과
(TMPFILE 내용 전체)

## 추가 메모
($ARGUMENTS로 전달받은 내용이 있으면 기록)
```

저장 후 "동시성 리뷰가 `{REVIEW_FILE}`에 저장되었습니다." 출력.

---

## 사용 예시

```
/동시성리뷰
/동시성리뷰 포인트 차감 로직 집중 분석
/동시성리뷰 Kafka consumer 멱등성 확인
```
