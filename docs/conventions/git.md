# Git Strategy — 마음의 고향

---

## 1. 브랜치 전략

```
main              ← 배포 가능한 상태만
└── develop       ← 개발 통합 브랜치
    ├── feat/xxx  ← 기능 개발
    ├── fix/xxx   ← 버그 수정
    ├── refactor/xxx ← 리팩토링
    └── docs/xxx  ← 문서 작업
```

- `main`: 항상 배포 가능한 상태. 직접 커밋 금지.
- `develop`: 기능 통합. feat/fix/refactor/docs 브랜치가 여기로 머지.
- `feat/기능명`: 새 기능 개발. 예: `feat/purchase-item`, `feat/chat-room`
- `fix/이슈명`: 버그 수정. 예: `fix/point-deduction-race-condition`
- `refactor/대상`: 리팩토링. 예: `refactor/wallet-port-simplify`
- `docs/대상`: 문서 작업. 예: `docs/initial-context-files`, `docs/erd-update`

---

## 2. 커밋 메시지

```
type: 간결한 설명 (한글 허용)

- 상세 내용 (선택)
```

### 타입

| 타입 | 용도 |
|------|------|
| feat | 새 기능 |
| fix | 버그 수정 |
| refactor | 리팩토링 (기능 변경 없음) |
| test | 테스트 추가/수정 |
| docs | 문서 변경 |
| chore | 빌드, 설정 등 기타 |

### 예시

```
feat: 포인트 차감 UseCase 구현

- DeductPointUseCase, DeductPointService 추가
- 낙관적 락 기반 동시성 제어 포함
- 단위 테스트 3개 (성공 1, 실패 2)
```

```
fix: 아이템 구매 시 멱등성 키 미검증 수정

- insertIfAbsent 호출 누락 수정
- 중복 구매 방지 테스트 추가
```

---

## 3. PR 규칙

- 하나의 PR은 하나의 목적만 가진다. (기능 + 리팩토링 동시 금지)
- PR 설명에 "무엇을, 왜" 변경했는지 적는다.
- 테스트가 포함되어야 머지 가능하다.
- CI(GitHub Actions)가 통과해야 머지 가능하다.

---

## 4. .gitignore 필수 항목

```
# IDE
.idea/
*.iml

# Build
build/
out/

# Environment
.env
*.env.local

# OS
.DS_Store
Thumbs.db

# Diagram sources (로컬 작업용, 빌드 산출물만 커밋)
*.mermaid
```