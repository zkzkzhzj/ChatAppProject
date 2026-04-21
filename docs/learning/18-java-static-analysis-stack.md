# 18. Java 정적 분석 스택 — 도구 선정부터 한글 BDD 억제까지

> 맥락: CI/DX 인프라를 구축하면서 Java 정적 분석 도구를 선택하고, 테스트 코드의 한글 BDD 메서드명과 정적 분석 규칙이 충돌하는 문제를 같이 풀었다.
>
> 원본: 이 문서는 구 `18-java-static-analysis-tools.md` + `19-checkstyle-test-suppression-strategy.md`를 병합한 것이다. 2026-04-21 리팩토링.

---

## 1. 배경

프로덕션 코드에는 `maxWarnings = 0` 수준의 엄격한 정적 분석을 적용하고 싶었다. 하지만 이 프로젝트는 Cucumber Steps를 한글 메서드명으로 작성한다 (`채팅방이_정상적으로_생성된다()`). 많은 정적 분석 규칙이 영문 camelCase를 전제하므로, **엄격함과 BDD 가독성을 동시에 유지하려면 "도구 선정 + 억제 전략"이 한 묶음**으로 결정돼야 했다.

---

## 2. 도구 비교

### SpotBugs
- FindBugs의 후계자. 바이트코드 분석 방식
- **장점**: 런타임 패턴(NPE, 리소스 누수 등) 탐지가 강함
- **단점**: **빌드 후** 별도 단계로 실행 → 피드백 루프가 길다. False positive 많음. Gradle 플러그인이 위반 발견 시 기본적으로 빌드 실패 → 초기 도입 시 기존 코드 위반이 빌드를 막는다
- **실제 시도**: 도입 후 바로 빌드 실패. 위반 억제 설정이 번거로웠다

### Error Prone (Google) + NullAway (Uber)
- **컴파일 타임**에 javac 플러그인으로 동작. 코드를 컴파일하면서 동시에 분석
- **장점**: 별도 단계 없이 `compileJava`에 통합. warn/error 수준 조절 가능. Google 내부에서 수년간 검증됨
- **NullAway**: NPE를 컴파일 타임에 잡는 경량 null 체커. `@Nullable` 어노테이션 기반
- **단점**: javac에 종속. Kotlin 미지원 (현재 프로젝트는 Java라 무관)

### PMD
- 소스 코드 패턴 매칭 기반. Checkstyle과 역할이 일부 겹침
- Checkstyle이 스타일을, Error Prone이 버그 패턴을 커버하므로 **추가 가치가 적다**

### SonarQube / SonarLint
- 종합 코드 품질 플랫폼. 서버 설치 필요(SonarQube) 또는 IDE 플러그인(SonarLint)
- 현재 규모에서 서버를 운영할 이유가 없고, Error Prone이 핵심 기능을 대체

---

## 3. 선택: Checkstyle + Error Prone + NullAway

**이유:**
1. **컴파일 타임 통합** — 빌드 흐름에 자연스럽게 녹아든다. 별도 태스크 불필요
2. **점진적 도입 가능** — `warn("NullAway")`로 시작, 안정화 후 `error()`로 전환
3. **구글 내부 검증** — 수십억 줄 코드베이스에서 사용 중
4. **역할 분리 명확** — Checkstyle은 스타일(Naver Hackday Convention), Error Prone은 버그 패턴

**트레이드오프:**
- NullAway 경고가 많이 나올 수 있다 (현재 47개). warn 모드라 빌드는 통과
- `@Nullable`을 체계적으로 붙여야 효과가 극대화된다. 점진적으로 적용

---

## 4. Gradle 설정 시행착오

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

---

## 5. 억제 전략의 출발점 — 한글 BDD vs Checkstyle

Checkstyle `maxWarnings = 0` (zero-tolerance)를 적용한 뒤, 테스트 코드에서 59개 위반이 발생했다. 위반 유형은 크게 세 가지:

1. **MethodName / AbbreviationAsWordInName** — Cucumber Steps의 한글 메서드명 (`채팅방이_정상적으로_생성된다()`)
2. **ImportOrder** — 테스트 파일들의 import 순서
3. **NeedBraces / OperatorWrap** — 소수의 스타일 위반

### 핵심 문제: 한글 메서드명 vs Checkstyle 규칙

Naver Hackday Convention의 `MethodName` 규칙은 `^[a-z][a-z0-9][a-zA-Z0-9_]*$` 패턴을 강제한다. 영문 camelCase 전용이라 **한글 메서드명은 원천적으로 위반**이다.

`AbbreviationAsWordInName`도 연속 대문자 2개까지만 허용하는데, `NPC`·`API`·`HTTP` 같은 약어가 한글 메서드명 안에 들어가면 걸린다.

### 선택지 비교

| 방식 | 장점 | 단점 |
|------|------|------|
| A. 한글 메서드명 포기, 영문으로 전환 | Checkstyle 통과 | BDD 가독성 급락. Given-When-Then을 한글로 쓰는 이유가 사라짐 |
| B. MethodName 규칙 자체를 완화 | 설정 간단 | 프로덕션 코드까지 느슨해짐 |
| C. **Suppression 파일로 테스트만 억제** | 프로덕션 규칙 유지 + 테스트 자유도 확보 | 별도 파일 관리 필요 |
| D. 각 메서드에 `@SuppressWarnings` | 세밀한 제어 | 모든 BDD 메서드마다 어노테이션 — 너무 번거로움 |

### 선택: C (Suppression 파일)

**이유:**
1. 프로덕션 코드의 네이밍 규칙은 그대로 유지된다
2. 테스트 코드에만 한정된 예외이므로 범위가 명확
3. 새 테스트 파일 추가해도 별도 설정 없이 자동 적용

**구현:**
```xml
<!-- config/checkstyle/suppressions.xml -->
<suppressions>
    <suppress files="src[\\/]test[\\/]" checks="MethodName"/>
    <suppress files="src[\\/]test[\\/]" checks="AbbreviationAsWordInName"/>
</suppressions>
```

```xml
<!-- checkstyle.xml에 추가 -->
<module name="SuppressionFilter">
    <property name="file" value="${config_loc}/suppressions.xml"/>
</module>
```

`${config_loc}`은 Checkstyle이 자동으로 `checkstyle.xml`이 위치한 디렉토리로 해석한다. 경로를 하드코딩하지 않아도 된다.

---

## 6. Error Prone `UnicodeInCode`와의 충돌

같은 맥락에서 Error Prone의 `UnicodeInCode` 규칙도 한글 메서드명을 잡았다. "주석과 리터럴 외에 non-ASCII 문자 사용 금지" 규칙이다.

Checkstyle과 달리 Error Prone은 Suppression 파일이 아니라 **Gradle 태스크 단위로** 설정한다:

```kotlin
// 테스트 코드는 BDD 한글 메서드명을 사용하므로 UnicodeInCode 비활성화
tasks.named<JavaCompile>("compileTestJava") {
    options.errorprone {
        disable("UnicodeInCode")
    }
}
```

`compileTestJava`만 타겟하므로 프로덕션 코드(`compileJava`)에는 영향 없다.

---

## 7. Import 순서 — static import의 위치

Checkstyle ImportOrder의 `option = "top"` 설정은 **static import가 일반 import 위에** 와야 한다는 뜻이다.

```java
// 올바른 순서 (option = "top")
import static org.assertj.core.api.Assertions.assertThat;  // static 먼저

import java.util.List;       // java.*

import org.springframework.*; // org.*

import com.maeum.*;          // com.*

import io.cucumber.*;         // unmatched (맨 뒤, 그룹 간 빈줄 없음)
```

처음에 static import를 맨 아래에 놓았다가 위반이 났다. **IntelliJ 기본 설정은 static을 맨 아래에 놓음** → Checkstyle에 맞추려면 IDE 설정을 바꿔야 한다.

**IntelliJ 설정 경로:** `Settings → Editor → Code Style → Java → Imports → Import Layout`

---

## 8. 교훈

1. **Checkstyle zero-tolerance를 적용하면 테스트 코드도 대상이다.** 프로덕션만 통과시키고 끝이 아니다
2. **한글 BDD와 영문 전용 린트 규칙은 충돌한다.** 억제 전략을 초기에 결정해야 나중에 위반이 쌓이지 않는다
3. **Error Prone과 Checkstyle은 억제 방식이 다르다.** Checkstyle은 XML Suppression, Error Prone은 Gradle DSL. 각 도구의 설정 체계를 이해해야 한다
4. **`option = "top"`은 IntelliJ 기본과 다르다.** IDE 설정을 맞추지 않으면 코드 작성할 때마다 수동 정렬 필요
5. **정적 분석은 "도구 선정"과 "억제 전략"이 한 세트다.** 도입하면 반드시 못 맞추는 케이스가 나오고, 그걸 어떻게 처리할지가 핵심 설계 결정이다
