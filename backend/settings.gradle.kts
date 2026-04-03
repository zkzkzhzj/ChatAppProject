// Foojay API를 통해 build.gradle.kts에 명시된 Java 버전(21)을 자동으로 다운로드한다.
// 시스템 Java 버전과 무관하게 이 프로젝트는 항상 Java 21을 사용하도록 격리된다.
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.9.0"
}

rootProject.name = "gohyang"
