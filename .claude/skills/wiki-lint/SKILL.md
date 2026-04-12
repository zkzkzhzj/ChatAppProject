Wiki의 건강 상태를 정기 점검한다. Karpathy LLM Wiki 패턴의 Lint Operation.
모순 탐지, 노화 감지, 고아 페이지, 교차참조 누락, 코드-Wiki 불일치, 데이터 갭을 검사한다.

## 실행 순서

### 1단계 — 전체 페이지 목록 수집
```bash
find docs/wiki -name "*.md" -not -name "INDEX.md" -not -name "log.md" | sort
```

### 2단계 — 6가지 Lint 검사 수행

각 검사를 순서대로 실행한다.

#### [LINT-1] 고아 페이지
- `docs/wiki/` 내 모든 .md 파일이 INDEX.md에 등록되어 있는지 확인
- INDEX.md에 없는 페이지 → [WARNING] 출력

#### [LINT-2] 교차참조 무결성
- 각 페이지의 frontmatter `related` 필드에 나열된 파일이 실제로 존재하는지 확인
- INDEX.md의 링크가 실제 파일을 가리키는지 확인
- 존재하지 않는 파일 참조 → [CRITICAL] 출력

#### [LINT-3] 노화 감지
- 각 페이지의 `last-verified` 날짜를 확인
- 오늘 기준 4주 이상 → [WARNING]
- 8주 이상 → [CRITICAL]
- `last-verified` 필드 없음 → [CRITICAL]

#### [LINT-4] frontmatter 스키마 검증
- 모든 페이지에 `title`, `tags`, `related`, `last-verified` 필드가 존재하는지 확인
- 누락된 필드 → [WARNING]

#### [LINT-5] 코드-Wiki 불일치 (샘플링)
- Wiki에 기술된 핵심 파일 경로가 실제로 존재하는지 확인 (Glob/Grep)
- 예: auth-flow.md에 `JwtProvider.java`가 언급되면 실제 존재 확인
- 파일이 없거나 이동됨 → [CRITICAL]

#### [LINT-6] 데이터 갭
- `backend/src/main/java/com/maeum/gohyang/` 아래 도메인 디렉토리를 스캔
- Wiki에 대응 페이지가 없는 도메인 → [WARNING]
- 특히 새로 추가된 Service, UseCase가 Wiki에 반영되지 않은 경우

### 3단계 — 결과 저장

```bash
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H-%M")
mkdir -p "docs/reviews/${DATE}"
LINT_FILE="docs/reviews/${DATE}/${TIME}-wiki-lint.md"
```

저장 형식:
```markdown
# Wiki Lint — {DATE} {TIME}

## [CRITICAL]
- [LINT-X] 설명

## [WARNING]
- [LINT-X] 설명

## LGTM
- 정상 항목 목록

## 통계
- 전체 페이지: N개
- CRITICAL: N개
- WARNING: N개
- LGTM: N개
```

### 4단계 — Wiki log.md에 기록
```markdown
## [YYYY-MM-DD] lint | Wiki 정기 점검
- CRITICAL: N개, WARNING: N개, LGTM: N개
- (주요 이슈 한 줄 요약)
```

---

## 사용 예시

```
/wiki-lint
```
