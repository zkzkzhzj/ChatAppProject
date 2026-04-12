# 18. Java 정적 분석 도구 선정 — SpotBugs vs Error Prone vs PMD

## 배경

CI/DX 인프라를 구축하면서 Java 정적 분석 도구를 선택해야 했다.
후보: SpotBugs, Error Prone (Google), PMD, SonarQube/SonarLint.

## 후보 비교

### SpotBugs
- FindBugs의 후계자. 바이트코드 분석 방식.
- 장점: 런타임 패턴(NPE, 리소스 누수 등)을 잘 탐지.
- 단점: **빌드 후** 별도 단계로 실행 → 피드백 루프가 길다. False positive 많음. Gradle 플러그인이 위반 발견 시 기본적으로 빌드 실패 → 초기 도입 시 기존 코드 위반이 빌드를 막는다.
- 실제 시도: 도입 후 바로 빌드 실패. 위반 억제 설정이 번거로웠다.

### Error Prone (Google) + NullAway (Uber)
- **컴파일 타임**에 javac 플러그인으로 동작. 코드를 컴파일하면서 동시에 분석.
- 장점: 별도 단계 없이 `compileJava`에 통합. warn/error 수준 조절 가능. Google 내부에서 수년간 검증됨.
- NullAway: NPE를 컴파일 타임에 잡는 경량 null 체커. `@Nullable` 어노테이션 기반.
- 단점: javac에 종속. Kotlin 미지원 (현재 프로젝트는 Java이므로 무관).

### PMD
- 소스 코드 패턴 매칭 기반. Checkstyle과 역할이 일부 겹침.
- Checkstyle이 이미 스타일을 커버하고, Error Prone이 버그 패턴을 커버하므로 **추가 가치가 적다**.

### SonarQube / SonarLint
- 종합 코드 품질 플랫폼. 서버 설치 필요 (SonarQube) 또는 IDE 플러그인 (SonarLint).
- 현재 규모에서 서버를 운영할 이유가 없고, Error Prone이 핵심 기능을 대체.

## 선택: Error Prone + NullAway

**이유:**
1. 컴파일 타임 통합 — 빌드 흐름에 자연스럽게 녹아든다. 별도 태스크 불필요.
2. 점진적 도입 가능 — `warn("NullAway")`로 시작, 안정화 후 `error()`로 전환.
3. 구글 내부 검증 — 수십억 줄 코드베이스에서 사용 중.
4. Checkstyle과 역할 분리 명확 — Checkstyle은 스타일, Error Prone은 버그 패턴.

**트레이드오프:**
- NullAway 경고가 많이 나올 수 있다 (현재 47개). 하지만 warn 모드라 빌드는 통과.
- `@Nullable` 어노테이션을 체계적으로 붙여야 NullAway 효과가 극대화된다. 점진적으로 적용.

## Gradle 설정 시행착오

Error Prone Gradle 플러그인(`net.ltgt.errorprone`) 설정에서 3번 실패했다:

1. `options.errorprone { option(...) }` → import 누락으로 "Unresolved reference"
2. `options.errorprone.errorproneArgs.addAll(...)` → 잘못된 API
3. `options.compilerArgs.addAll(...)` → Error Prone 플러그인과 호환 안 됨

**올바른 방법:**
```kotlin
import net.ltgt.gradle.errorprone.errorprone  // 이 import 필수

tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        option("NullAway:AnnotatedPackages", "com.maeum.gohyang")
        warn("NullAway")
        disableWarningsInGeneratedCode = true
    }
}
```

핵심: `net.ltgt.gradle.errorprone.errorprone` import가 없으면 `options.errorprone` DSL 블록을 인식하지 못한다.
