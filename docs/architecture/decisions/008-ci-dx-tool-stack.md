# ADR-008: CI/DX 도구 스택 선정

> 작성일: 2026-04-13
> 상태: 확정

---

## 맥락

프로젝트 초기 단계에서 코드 품질 파이프라인을 구축한다. 목표는 두 가지:

1. **스타일·버그·아키텍처 위반을 빌드 시점에 자동으로 잡는다.** PR 리뷰에서 "import 순서 고쳐주세요"를 반복하지 않는다.
2. **도구를 레이어로 분리한다.** 각 도구가 하나의 관심사만 책임지고, 역할이 겹치지 않는다.

---

## 결정: 5-레이어 품질 파이프라인

| 레이어 | 도구 | 관심사 | 동작 시점 |
|--------|------|--------|-----------|
| Style | Checkstyle (백엔드), Prettier (프론트엔드) | 코드 포맷, 네이밍, import 순서 | 컴파일 후 / pre-commit hook |
| Bugs | Error Prone + NullAway (백엔드), ESLint (프론트엔드) | 컴파일 타임 버그 패턴, NPE | 컴파일 중 / pre-commit hook |
| Architecture | ArchUnit | 헥사고날 레이어 의존 방향, 도메인 경계 | 테스트 실행 시 |
| Coverage | JaCoCo | 테스트 커버리지 측정 및 임계값 강제 | 테스트 후 |
| Process | Husky + lint-staged, CodeRabbit | Git hook 자동화, PR AI 리뷰 | commit/push 시, PR 생성 시 |

---

## 개별 도구 선정 이유

### 1. Checkstyle — Naver Hackday Java Convention 기반

**왜 Naver Convention인가:**

- 한국 Java 커뮤니티에서 가장 널리 쓰이는 공개 컨벤션. 구글 스타일과 달리 한국 개발자 관습(import 그룹 순서 등)에 맞춰져 있다.
- XML 규칙 파일이 공개되어 있어 Checkstyle에 바로 적용할 수 있다.
- 컨벤션 문서와 Checkstyle 규칙이 1:1 매핑되어 있어 "이 규칙이 왜 있는가"를 문서에서 바로 찾을 수 있다.

**우리 프로젝트에 맞게 변경한 것:**

- 탭 → 스페이스 4칸 (기존 코드 컨벤션 유지)
- `NewlineAtEndOfFile` LF 강제 제거 (Windows 개발 환경)
- import 그룹에서 `naver.`, `nhncorp.` 제거
- 테스트 코드 `MethodName`, `AbbreviationAsWordInName` 억제 (BDD 한글 메서드명 허용)

**왜 zero-tolerance (`maxWarnings = 0`)인가:**

- 프로젝트 초기 단계라 코드량이 적다. 지금 전부 잡는 게 나중에 수백 개 쌓인 뒤 잡는 것보다 비용이 낮다.
- ratchet(기존 위반 허용, 신규만 금지) 방식은 대규모 레거시 코드베이스에 적합하지, 신규 프로젝트에는 과하다.

### 2. Error Prone + NullAway — 컴파일 타임 버그 탐지

**왜 Error Prone인가 (vs SpotBugs, PMD):**

- 상세 비교는 `docs/learning/18-java-static-analysis-stack.md` 참조.
- 핵심: javac 플러그인으로 동작하여 별도 빌드 단계 불필요. 점진적 도입(`warn` → `error`) 가능. SpotBugs는 바이트코드 분석이라 빌드 후 별도 실행이 필요하고, 초기 도입 시 false positive로 빌드가 바로 깨진다.

**NullAway 설정:**

- `warn` 모드로 시작. 빌드는 깨지지 않지만 경고가 출력된다.
- `AnnotatedPackages = com.maeum.gohyang`으로 우리 패키지만 대상.
- `@Nullable` 어노테이션을 점진적으로 붙여가며 안정화되면 `error`로 전환.

**테스트 코드 `UnicodeInCode` 비활성화:**

- BDD 한글 메서드명이 non-ASCII 규칙에 걸린다. `compileTestJava`에서만 `disable("UnicodeInCode")`.
- 상세 근거는 `docs/learning/18-java-static-analysis-stack.md` 섹션 5~6 참조.

### 3. ArchUnit — 아키텍처 규칙 자동 검증

**왜 필요한가:**

- CLAUDE.md Critical Rule #1(Domain Entity에 인프라 어노테이션 금지), #2(도메인 간 직접 참조 금지)를 사람이 리뷰로 잡는 건 한계가 있다. 특히 AI가 코드를 생성하는 환경에서 구조적 위반이 빠르게 유입될 수 있다.
- ArchUnit은 JUnit 테스트로 실행되므로 별도 인프라 없이 기존 테스트 파이프라인에 통합된다.

**검증 규칙:**

- Domain 패키지는 JPA 어노테이션(`@Entity`, `@Table`, `@Column`, `@Id`) 금지
- Domain 패키지는 Spring Framework에 의존하지 않음
- 3개 도메인(identity, village, communication) 간 직접 참조 금지
- Domain → Adapter, Application → Adapter 의존 방향 금지

### 4. JaCoCo — 테스트 커버리지

**커버리지 임계값 50%의 근거:**

- 프로젝트 초기 단계. 도메인 로직과 핵심 흐름이 먼저 테스트되어야 하지만, config/DTO/예외 클래스까지 100% 커버할 필요는 없다.
- 테스트가 축적되면 점진적으로 올린다 (60% → 70%).

**제외 대상 선정 기준:**

- `**/config/**` — Spring 설정 클래스. 로직이 아닌 선언 위주.
- `**/error/**` — ErrorCode enum, 커스텀 예외. 테스트할 로직이 없다.
- `**/*JpaEntity*`, `**/*CassandraEntity*` — Persistence Entity. Domain Entity에서 로직을 테스트한다.
- `**/*Request*`, `**/*Response*` — DTO. 단순 데이터 캐리어.
- `**/GohyangApplication*` — 메인 클래스.

### 5. Gradle Version Catalog — 의존성 버전 중앙 관리

**왜 도입했는가:**

- `build.gradle.kts`에 버전이 흩어져 있으면 업그레이드 시 누락이 발생한다.
- `libs.versions.toml` 한 파일에서 모든 명시적 버전을 관리한다.

**BOM 관리 의존성을 카탈로그에 안 넣는 이유:**

- Spring Boot BOM이 관리하는 의존성(Lombok, Testcontainers, Jackson 등)은 이미 BOM이 버전을 정한다. 카탈로그에 중복으로 넣으면 BOM 업그레이드 시 충돌이 발생할 수 있다.
- 카탈로그에는 BOM이 관리하지 않는 의존성(JJWT, SpringDoc, Cucumber, ArchUnit 등)만 넣는다.

### 6. Husky + lint-staged + Prettier + ESLint — 프론트엔드 품질

**왜 Git hook인가:**

- 프론트엔드 코드가 포맷 안 맞은 채로 커밋되면 diff가 더러워진다.
- `pre-commit`에서 lint-staged를 통해 Prettier(포맷), ESLint(버그 패턴)를 스테이징된 파일에 자동 실행하여 커밋 전에 잡는다.

**ESLint 구성:**

- 기반: Next.js 공식 (`core-web-vitals` + `typescript`) + `typescript-eslint/strictTypeChecked` + `stylisticTypeChecked`.
- Airbnb 컨벤션은 ESLint 9(flat config) 미지원으로 제외. Airbnb 저장소는 2025-05 아카이브되어 향후 지원도 기대하기 어렵다.
- Import 정렬: `eslint-plugin-simple-import-sort`. 의존성 0개, autofix 지원. `eslint-plugin-import`보다 가볍고 ESLint 9와 호환 문제가 없다.

**Prettier 구성:**

- Airbnb 코딩 컨벤션(singleQuote, trailingComma 등) + Prettier 3.x 기본값 기반.
- `endOfLine: lf` — Windows 개발 환경이지만 Git/CI에서 줄바꿈 일관성을 위해 LF로 통일.

### 7. CodeRabbit — PR AI 리뷰

**왜 필요한가:**

- 1인 개발이라 리뷰어가 없다. AI가 PR 단위로 구조적 문제, 보안 취약점, 성능 이슈를 지적해준다.
- 무료 플랜으로 충분. GitHub App으로 설치만 하면 PR 생성 시 자동 리뷰.

---

## 도입하지 않은 도구와 이유

| 도구 | 미도입 이유 |
|------|-------------|
| **SpotBugs** | 바이트코드 분석이라 빌드 후 별도 단계 필요. 초기 도입 시 false positive로 빌드 즉시 실패. Error Prone이 상위 호환. |
| **PMD** | Checkstyle(스타일) + Error Prone(버그)이 이미 커버. 추가 가치 적음. |
| **SonarQube** | 서버 운영 필요. 현재 규모에서 과함. SonarLint(IntelliJ 플러그인)는 선택사항으로 남겨둠. |
| **SonarLint** | Error Prone + Checkstyle이 핵심 기능을 커버. 보안 취약점 탐지에 추가 가치가 있지만 필수는 아님. |

---

## 트레이드오프

1. **도구 수가 많다.** 5개 레이어에 11개 도구. 하지만 각 도구가 하나의 관심사만 책임지므로, 하나를 교체하거나 제거해도 나머지에 영향이 없다.
2. **빌드 시간 증가.** Error Prone은 컴파일 시간에 ~10% 추가, Checkstyle과 JaCoCo는 별도 태스크. 현재 전체 `check`가 ~60초이므로 허용 범위.
3. **NullAway warn 모드는 위반을 놓칠 수 있다.** 경고를 무시하면 NPE가 프로덕션에 갈 수 있다. 점진적으로 `@Nullable` 적용 후 `error`로 전환 예정.
