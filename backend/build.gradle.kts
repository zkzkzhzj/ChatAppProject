plugins {
	java
	id("org.springframework.boot") version "4.0.3"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.maeum"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// Spring Boot Starters
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
	implementation("org.springframework.boot:spring-boot-starter-data-cassandra")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-websocket")
	implementation("org.springframework.kafka:spring-kafka")
	// spring-boot-kafka: Spring Boot 4.x에서 Kafka 자동 구성이 별도 모듈로 분리됨.
	// spring-kafka만으로는 KafkaTemplate 빈이 자동 생성되지 않는다.
	implementation("org.springframework.boot:spring-boot-kafka")

	// JWT (JJWT)
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

	// Lombok
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// Flyway
	// spring-boot-flyway: Spring Boot 4.x에서 Flyway 자동 구성이 별도 모듈로 분리됨.
	// flyway-core만으로는 마이그레이션이 실행되지 않는다. (ADR-003 참조)
	implementation("org.springframework.boot:spring-boot-flyway")
	implementation("org.flywaydb:flyway-core")
	implementation("org.flywaydb:flyway-database-postgresql")

	// DB Drivers
	runtimeOnly("org.postgresql:postgresql")

	// Test
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.springframework.security:spring-security-test")

	// Testcontainers — Spring Boot 4.x BOM이 2.x를 관리하므로 버전 명시 불필요
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testImplementation("org.testcontainers:testcontainers-kafka")
	testImplementation("org.testcontainers:testcontainers-cassandra")

	// Cucumber BDD
	testImplementation("io.cucumber:cucumber-java:7.34.2")
	testImplementation("io.cucumber:cucumber-spring:7.34.2")
	testImplementation("io.cucumber:cucumber-junit-platform-engine:7.34.2")

	// JUnit Platform Suite — CucumberTestSuite의 @Suite, @IncludeEngines 어노테이션에 필요
	testImplementation("org.junit.platform:junit-platform-suite")

	testCompileOnly("org.projectlombok:lombok")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<Test> {
	// junit-platform-suite 엔진 제외: CucumberTestSuite는 IDE 전용.
	// Gradle은 junit-platform.properties를 통해 Cucumber 엔진을 직접 구동한다.
	// 두 엔진이 동시에 활성화되면 각 시나리오가 2번 실행되어 DB 상태 오염이 발생한다.
	useJUnitPlatform {
		excludeEngines("junit-platform-suite")
	}
}
