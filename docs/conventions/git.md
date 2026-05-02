# Git Strategy — 마음의 고향

---

## 1. 브랜치 전략

```text
main              ← 배포 가능한 상태만
└── develop       ← 개발 통합 브랜치
    ├── feat/xxx  ← 기능 개발
    ├── fix/xxx   ← 버그 수정
    ├── refactor/xxx ← 리팩토링
    ├── infra/xxx ← 인프라/CI/DX 설정
    ├── chore/xxx ← 기타 잡무
    └── docs/xxx  ← 문서 작업
```

- `main`: 항상 배포 가능한 상태. 직접 커밋 금지.
- `develop`: 기능 통합. feat/fix/refactor/docs 브랜치가 여기로 머지.
- `feat/기능명`: 새 기능 개발. 예: `feat/purchase-item`, `feat/chat-room`
- `fix/이슈명`: 버그 수정. 예: `fix/point-deduction-race-condition`
- `refactor/대상`: 리팩토링. 예: `refactor/wallet-port-simplify`
- `infra/대상`: 인프라·CI/DX 설정. 예: `infra/ci-dx-pipeline`, `infra/docker-compose`
- `chore/대상`: 기타 잡무. 예: `chore/dependency-update`
- `docs/대상`: 문서 작업. 예: `docs/initial-context-files`, `docs/erd-update`

### 브랜치 생명주기

**하나의 브랜치 = 하나의 PR = 하나의 목적.** 브랜치에서 PR을 올리면 그 브랜치의 역할은 끝난다. 다음 작업은 반드시 새 브랜치에서 시작한다. 같은 브랜치에서 여러 PR을 날리지 않는다.

---

## 2. 커밋 시점과 푸시 시점

**커밋 ≠ 푸시.** 커밋은 로컬 저장점이고, 푸시는 원격 반영이다. 둘을 구분해서 관리한다.

### 커밋 — 작동하는 최소 단위마다

"컴파일되고 관련 테스트가 통과하는 상태"면 커밋할 수 있다. 자주 커밋할수록 롤백 포인트가 많아진다.

```text
feat: AuthController 구현
fix: Spring Boot 4.x Flyway 모듈 추가
test: Identity Cucumber 인수 테스트 추가
fix: Cucumber 이중 실행 방지
```

이렇게 4번 커밋하면 Flyway 이슈만 되돌리거나 Cucumber 픽스만 분리해서 볼 수 있다.
Phase 전체를 하나의 커밋으로 묶으면 그 수단이 사라진다.

### AI 세션에서의 커밋 규칙

Claude Code 세션 중에도 동일한 원칙이 적용된다. **세션이 끝날 때 몰아서 커밋하지 않는다.**

아래 시점마다 커밋한다:

- 도메인/서비스/어댑터 구현 완료 (빌드 통과 확인 후)
- 리팩토링 완료 (테스트 통과 확인 후)
- 문서 작업 완료

푸시는 작업 단위(Phase, 기능, 리팩토링)가 끝난 뒤 한 번에 한다.

### 푸시 — 논리적으로 완결된 기능 단위

기능이 "동작하는" 수준에서 푸시한다. 중간 WIP 상태를 원격에 올릴 필요는 없다.

| 상황 | 커밋 | 푸시 |
|------|------|------|
| 컨트롤러 하나 추가 | ✅ | 선택 |
| 빌드 오류 수정 | ✅ | 선택 |
| Phase 완료 | ✅ | ✅ |
| 기능 하나 완료 (테스트 포함) | ✅ | ✅ |
| 오래 자리를 비울 때 (백업 목적) | ✅ | ✅ |

---

## 3. 커밋 메시지

```text
type: 간결한 설명 (한글 허용)

- 상세 내용 (선택)
```

### 타입

| 타입 | 용도 |
|------|------|
| feat | 새 기능 |
| fix | 버그 수정 |
| refactor | 리팩토링 (기능 변경 없음) |
| infra | 인프라·CI/DX 설정 |
| test | 테스트 추가/수정 |
| docs | 문서 변경 |
| chore | 빌드, 설정 등 기타 |

### 예시

```text
feat: 포인트 차감 UseCase 구현

- DeductPointUseCase, DeductPointService 추가
- 낙관적 락 기반 동시성 제어 포함
- 단위 테스트 3개 (성공 1, 실패 2)
```

```text
fix: 아이템 구매 시 멱등성 키 미검증 수정

- insertIfAbsent 호출 누락 수정
- 중복 구매 방지 테스트 추가
```

---

## 4. PR 규칙

- 하나의 PR은 하나의 목적만 가진다. (기능 + 리팩토링 동시 금지)
- **1 step = 1 PR (엄격, 트랙 `harness-spec-driven` C2 도입, 2026-04-30).** 트랙 spec 의 `tasks` 항목과 PR 이 1:1 매핑된다 (`docs/conventions/spec-driven.md` §2.2). 한 PR 에 여러 step 섞지 않으며, 한 step 이 여러 PR 로 쪼개지지 않는다. **예외**: 메타·도구 트랙(예: `harness-spec-driven`) 은 1 PR · N 커밋 (phase 별).
- PR 설명에 "무엇을, 왜" 변경했는지 적는다. 트랙 spec 링크 의무 (`docs/specs/features/{feature}.md`).
- 테스트가 포함되어야 머지 가능하다.
- CI(GitHub Actions)가 통과해야 머지 가능하다.

---

## 5. .gitignore 필수 항목

```text
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
