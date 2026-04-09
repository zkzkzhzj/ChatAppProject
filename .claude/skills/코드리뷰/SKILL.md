변경된 코드(uncommitted)에 대해 Codex가 AGENTS.md 기준으로 리뷰를 수행하고, 결과를 날짜/시간별로 기록한다.

## 실행 순서

### 1단계 — 변경사항 확인
`git diff HEAD`와 `git status`를 실행해서 변경된 파일 목록을 먼저 파악한다.
변경사항이 없으면 "리뷰할 변경사항이 없습니다."라고 말하고 종료한다.

### 2단계 — Codex 리뷰 실행 (출력을 파일로 직접 저장)

codex review 출력은 수 MB에 달할 수 있어 stdout으로 받으면 Bash 도구 용량 초과로 접근이 불가능해진다.
**반드시 아래처럼 파일로 리다이렉트해서 실행한다.**

codex 0.118.0에서 `--uncommitted`와 `[PROMPT]`는 함께 쓸 수 없다.
따라서 실행 명령은 그대로 유지하되, Claude는 아래 기준을 만족하도록 Codex 결과를 해석하고 저장해야 한다.

리뷰 기준:
- 변경 파일만 보고 끝내지 말고, 해당 변경이 호출하는 서비스, 어댑터, 도메인, DTO, 테스트, 설정, 스키마까지 필요한 범위를 따라가서 검토한다.
- AGENTS.md의 Critical Rules 위반 여부를 최우선으로 확인한다.
- 특히 `@Autowired` 필드 주입, `throw new RuntimeException()`, check-then-act 패턴(`exists`, `isPresent`, 중복검사 후 insert), 동시성 전략 누락, 예외 삼키기, 이벤트 유실 가능성을 엄격히 본다.
- WebSocket/REST 입력 검증 불일치, 트랜잭션 경계 위반, 보안 설정 과개방 여부를 점검한다.
- 테스트 코드도 리뷰 대상에 포함한다. Happy Path만 있고 실패 케이스가 없으면 언급한다.
- 사소한 스타일보다 실제 장애 가능성, 데이터 정합성, 운영 리스크를 우선한다.
- 확신 없는 내용은 사실처럼 쓰지 않는다.

`$ARGUMENTS`가 있으면 Codex에 직접 전달할 수 없으므로, 저장 파일의 "추가 메모" 항목에 기록한다.

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
REVIEW_FILE="docs/reviews/${DATE}/${TIME}-uncommitted.md"
TMPFILE="/tmp/codex_uncommitted_review_${TIME}.txt"

codex review --uncommitted > "$TMPFILE" 2>&1
echo "exit=$?"
```

### 3단계 — 리뷰 결과를 문서로 저장
codex 실행이 완료되면 Read 도구로 `$TMPFILE` 전체를 읽고 Write 도구로 `REVIEW_FILE`에 저장한다.
파일이 크면 offset을 사용해 전체를 확인한다.

저장 형식:
```markdown
# 코드 리뷰 — {DATE} {TIME}

## 대상
- 종류: uncommitted changes
- 변경 파일: (git status 결과)

## Codex 리뷰 결과
(TMPFILE의 codex 최종 응답 전체)

## 추가 메모
($ARGUMENTS로 전달받은 내용이 있으면 기록)
```

파일 저장 후 "리뷰가 `{REVIEW_FILE}`에 저장되었습니다."라고 출력한다.

---

## 사용 예시

```
/코드리뷰
/코드리뷰 인증 로직 집중 분석
```
