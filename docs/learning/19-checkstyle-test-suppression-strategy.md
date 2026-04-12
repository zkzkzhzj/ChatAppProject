# 19. Checkstyle 테스트 코드 억제 전략 — 한글 BDD 메서드명과 정적 분석의 충돌

## 배경

CI/DX 인프라에서 Checkstyle `maxWarnings = 0` (zero-tolerance)을 적용한 뒤, 테스트 코드에서 59개의 위반이 발생했다. 위반 유형은 크게 세 가지였다:

1. **MethodName / AbbreviationAsWordInName** — Cucumber Steps의 한글 메서드명 (`채팅방이_정상적으로_생성된다()`)
2. **ImportOrder** — 테스트 파일들의 import 순서
3. **NeedBraces / OperatorWrap** — 소수의 스타일 위반

## 핵심 문제: 한글 메서드명 vs Checkstyle 규칙

Naver Hackday Convention의 `MethodName` 규칙은 `^[a-z][a-z0-9][a-zA-Z0-9_]*$` 패턴을 강제한다. 이건 영문 camelCase 전용이라 한글 메서드명은 원천적으로 위반이다.

마찬가지로 `AbbreviationAsWordInName`은 연속 대문자 2개까지만 허용하는데, `NPC`, `API`, `HTTP` 같은 약어가 한글 메서드명 안에 들어가면 잡힌다.

### 선택지

| 방식 | 장점 | 단점 |
|------|------|------|
| A. 한글 메서드명 포기, 영문으로 전환 | Checkstyle 통과 | BDD 가독성 급락. Given-When-Then을 한글로 쓰는 이유 자체가 사라짐 |
| B. MethodName 규칙 자체를 완화 | 설정 간단 | 프로덕션 코드까지 느슨해짐 |
| C. **Suppression 파일로 테스트만 억제** | 프로덕션 규칙 유지 + 테스트 자유도 확보 | 별도 파일 관리 필요 |
| D. 각 메서드에 `@SuppressWarnings` | 세밀한 제어 | 모든 BDD 메서드마다 어노테이션 — 너무 번거로움 |

### 선택: C (Suppression 파일)

**이유:**
1. 프로덕션 코드의 네이밍 규칙은 그대로 유지된다.
2. 테스트 코드에만 한정된 예외이므로 범위가 명확하다.
3. 새 테스트 파일을 추가해도 별도 설정 없이 자동 적용된다.

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

## Error Prone UnicodeInCode와의 충돌

같은 맥락에서 Error Prone의 `UnicodeInCode` 규칙도 한글 메서드명을 잡았다. 이건 "주석과 리터럴 외에 non-ASCII 문자 사용 금지" 규칙이다.

Checkstyle과 달리 Error Prone은 Suppression 파일이 아니라 Gradle 태스크 단위로 설정한다:

```kotlin
// 테스트 코드는 BDD 한글 메서드명을 사용하므로 UnicodeInCode 비활성화
tasks.named<JavaCompile>("compileTestJava") {
    options.errorprone {
        disable("UnicodeInCode")
    }
}
```

`compileTestJava`만 타겟하므로 프로덕션 코드(`compileJava`)에는 영향 없다.

## Import 순서: static import의 위치

Checkstyle ImportOrder의 `option = "top"` 설정은 **static import가 일반 import 위에** 와야 한다는 뜻이다.

```java
// 올바른 순서 (option = "top")
import static org.assertj.core.api.Assertions.assertThat;  // static 먼저

import java.util.List;       // java.*

import org.springframework.*; // org.*

import com.maeum.*;          // com.*

import io.cucumber.*;         // unmatched (맨 뒤, 그룹 간 빈줄 없음)
```

처음에 static import를 맨 아래에 놓았다가 위반이 났다. IDE 기본 설정(IntelliJ는 static을 맨 아래에 놓음)과 충돌하므로, IntelliJ의 import order를 Checkstyle에 맞게 설정해야 한다.

**IntelliJ 설정 경로:** Settings → Editor → Code Style → Java → Imports → Import Layout

## 교훈

1. **Checkstyle zero-tolerance를 적용하면 테스트 코드도 대상이다.** 프로덕션만 통과시키고 끝이 아니다.
2. **한글 BDD와 영문 전용 린트 규칙은 충돌한다.** 억제 전략을 초기에 결정해야 나중에 위반이 쌓이지 않는다.
3. **Error Prone과 Checkstyle은 억제 방식이 다르다.** Checkstyle은 XML 파일, Error Prone은 Gradle DSL. 각 도구의 설정 체계를 이해해야 한다.
4. **`option = "top"`은 IntelliJ 기본과 다르다.** IDE 설정을 맞추지 않으면 코드를 작성할 때마다 수동 정렬이 필요하다.
