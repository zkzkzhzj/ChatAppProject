plugins {
	java
	id("org.springframework.boot") version "3.5.0"
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

	// JWT (JJWT)
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

	// Lombok
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// DB Drivers
	runtimeOnly("org.postgresql:postgresql")

	// Test
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")

	// Testcontainers 2.x — 1.x 대비 WSL2 named pipe 호환성 개선
	testImplementation("org.testcontainers:testcontainers:2.0.3")
	testImplementation("org.testcontainers:testcontainers-postgresql:2.0.3")
	testImplementation("org.testcontainers:testcontainers-kafka:2.0.3")

	// Cucumber BDD
	testImplementation("io.cucumber:cucumber-java:7.22.2")
	testImplementation("io.cucumber:cucumber-spring:7.22.2")
	testImplementation("io.cucumber:cucumber-junit-platform-engine:7.22.2")

	// JUnit Platform Suite — CucumberTestSuite의 @Suite, @IncludeEngines 어노테이션에 필요
	testImplementation("org.junit.platform:junit-platform-suite")

	testCompileOnly("org.projectlombok:lombok")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
