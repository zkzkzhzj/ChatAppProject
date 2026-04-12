보안 관점에서 코드를 전문 검증한다.
Spring Security 설정, 인증/인가 누락, 민감 정보 노출, OWASP Top 10 관점으로 집중 탐지한다.

## 실행 순서

### 1단계 — Codex 보안 전문 리뷰 실행

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-security.md"
TMPFILE="/tmp/codex_security_${TIME}.txt"

codex review "보안 관점에서 전체 프로젝트를 전문적으로 리뷰해줘. 집중 검토 항목: (1) 인증/인가 — @RestController 엔드포인트 중 SecurityConfig에 매핑되지 않은 URL, @PreAuthorize 누락, (2) 민감 정보 노출 — Response DTO에 password/token/secret/key 필드 포함, log.info/debug에 민감 정보 출력, (3) 하드코딩 시크릿 — Java 코드 내 API Key, 비밀번호, 시크릿 하드코딩, (4) CORS 설정 — allowedOrigins(*) 사용 여부, (5) WebSocket 보안 — STOMP 연결 시 JWT 검증 로직 없음, (6) SQL Injection — @Query의 String concatenation, nativeQuery에서 파라미터 직접 삽입, (7) 입력 검증 — WebSocket 메시지 길이/형식 검증 누락, REST DTO @Valid 누락, (8) CSRF — 설정 상태 확인, (9) application.yml 내 평문 시크릿. 각 항목은 파일명:라인번호 형식으로, [CRITICAL] / [WARNING] / [INFO] / LGTM 형식으로 출력해줘. 확신 없는 내용은 추정 명시. $ARGUMENTS" > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 2단계 — 결과 저장
Read로 `$TMPFILE` 전체를 읽고 Write로 `$REVIEW_FILE`에 저장.

저장 형식:
```markdown
# 보안 리뷰 — {DATE} {TIME}

## 대상
- 종류: 보안 전문 리뷰 (Spring Security, OWASP Top 10)

## Codex 리뷰 결과
(TMPFILE 내용 전체)

## 추가 메모
($ARGUMENTS로 전달받은 내용이 있으면 기록)
```

저장 후 "보안 리뷰가 `{REVIEW_FILE}`에 저장되었습니다." 출력.

---

## 사용 예시

```
/보안리뷰
/보안리뷰 WebSocket 인증 집중 분석
/보안리뷰 Spring Security 설정 전체 점검
```

---

## 참고: 다른 리뷰 스킬과의 차이

| | /코드리뷰 | /동시성리뷰 | /보안리뷰 |
|--|---------|-----------|---------|
| 대상 | uncommitted changes 전반 | 동시성·락·N+1·Kafka | Security·인증·노출·OWASP |
| 트리거 | 수동 또는 git commit 훅 | 수동 | 수동 |
| 저장 파일 | `HH-MM-uncommitted.md` | `HH-MM-concurrency.md` | `HH-MM-security.md` |
