# ────────────────────────────────────────────
# Stage 1: Build
# ────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Gradle wrapper + 의존성 정의 파일만 먼저 복사.
# 소스 변경 시 의존성 레이어를 재사용해 빌드 속도를 높인다.
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./

# 의존성 다운로드 단계를 별도 레이어로 분리
# -Porg.gradle.java.installations.auto-download=false:
#   Foojay 플러그인이 JDK를 추가 다운로드하지 않도록 한다.
#   이미지에 Java 21 JDK가 이미 있으므로 불필요한 다운로드를 방지한다.
RUN ./gradlew dependencies --no-daemon -q \
    -Porg.gradle.java.installations.auto-download=false

# 소스 복사 및 실행 가능한 JAR 빌드 (-x test: 테스트는 CI에서 별도 실행)
COPY src src
RUN ./gradlew bootJar --no-daemon -x test \
    -Porg.gradle.java.installations.auto-download=false

# ────────────────────────────────────────────
# Stage 2: Runtime
# ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# curl: healthcheck 용도
RUN apk add --no-cache curl

# 보안: root 대신 전용 유저로 실행
RUN addgroup -S gohyang && adduser -S gohyang -G gohyang
USER gohyang

COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
