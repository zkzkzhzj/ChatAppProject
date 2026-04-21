# Gradle Java Toolchain과 Foojay Resolver

> 작성 시점: 2026-04-04
> 맥락: 팀원마다 로컬에 설치된 Java 버전이 다를 때, 프로젝트가 항상 Java 21로 빌드되도록 강제하는 방법

---

## 문제

- 팀원 A: Java 21 설치됨
- 팀원 B: Java 17 설치됨
- CI 서버: Java 21

`JAVA_HOME`이 다르면 빌드 결과가 달라질 수 있고,
Spring Boot 3.x는 Java 17 이상을 요구하지만 21과 17의 동작이 완전히 같지 않다.

---

## Gradle Toolchain 개념

`build.gradle.kts`에 명시적으로 Java 버전을 선언할 수 있다:

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

Gradle이 이 선언을 보고:

1. 시스템에 Java 21이 있으면 그걸 사용
2. 없으면 자동으로 다운로드 (Foojay Resolver가 담당)

`JAVA_HOME`이 Java 8이어도, Gradle이 빌드 시에는 Java 21을 사용한다.

---

## Foojay Toolchain Resolver

자동 다운로드를 가능하게 해주는 Gradle 플러그인.

```kotlin
// settings.gradle.kts
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.9.0"
}
```

Foojay(Friends of OpenJDK) API를 통해 적합한 JDK 배포판을 찾아 다운로드한다.
다운로드된 JDK는 `~/.gradle/jdks/`에 캐시된다.

### `-Porg.gradle.java.installations.auto-download=false` 플래그

Docker 빌드 중에는 이 플래그를 추가했다:

```dockerfile
RUN ./gradlew dependencies --no-daemon -q \
    -Porg.gradle.java.installations.auto-download=false
```

이유: Docker 이미지에 이미 Java 21 JDK가 있다(`eclipse-temurin:21-jdk-alpine`).
Foojay가 추가로 JDK를 다운로드하려 하면 빌드 시간이 늘어나고 불필요한 네트워크 트래픽이 발생한다.
이미 있는 JDK를 쓰도록 자동 다운로드를 비활성화한 것.

---

## 주의: IDE는 별도 설정

Toolchain은 Gradle 빌드 범위에만 적용된다.
IntelliJ에서 실행할 때는 IntelliJ 자체의 JDK 설정을 따른다.

즉:

- `./gradlew build` → 반드시 Java 21 사용 (Toolchain이 보장)
- IntelliJ 실행 버튼 → IntelliJ Project SDK 설정을 따름

IDE에서도 Java 21을 쓰려면 IntelliJ 설정에서 직접 SDK를 21로 지정해야 한다.
(File → Project Structure → Project SDK)

---

## 이 프로젝트에서 겪은 시행착오

IntelliJ 번들 JDK가 Java 25(개발 버전)여서 Kotlin DSL 파싱 오류가 발생했다.
Java 25의 버전 번호를 Kotlin 컴파일러가 파싱하지 못하는 버그.

`~/.jdks/corretto-17.0.18`이 설치되어 있었고,
Gradle 실행 시 `JAVA_HOME`을 명시적으로 지정해서 우회했다:

```bash
JAVA_HOME=/c/Users/zkzkz/.jdks/corretto-17.0.18 ./gradlew test
```

Gradle 자체(wrapper 실행)는 Java 17+이면 되고,
실제 컴파일/테스트에 쓰이는 JDK는 Toolchain 선언에 따라 Java 21이 별도로 사용된다.

이 두 가지 JDK 역할을 혼동하지 않는 게 중요하다:

- **Gradle 데몬 실행 JDK**: `JAVA_HOME` 또는 시스템 Java (17+이면 됨)
- **프로젝트 빌드/테스트 JDK**: `toolchain { languageVersion = 21 }` (Foojay가 자동 설치)
