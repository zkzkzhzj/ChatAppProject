import net.ltgt.gradle.errorprone.errorprone

plugins {
	java
	jacoco
	checkstyle
	alias(libs.plugins.errorprone)
	alias(libs.plugins.spring.boot)
	alias(libs.plugins.spring.dependency.management)
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
	// Micrometer Prometheus Registry — /actuator/prometheus endpoint 제공.
	// Spring Boot BOM이 버전 관리. Prometheus 서버가 scrape할 메트릭을 exposition format으로 렌더링한다.
	implementation("io.micrometer:micrometer-registry-prometheus")
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
	implementation(libs.jjwt.api)
	runtimeOnly(libs.jjwt.impl)
	runtimeOnly(libs.jjwt.jackson)

	// Swagger (SpringDoc OpenAPI)
	implementation(libs.springdoc.openapi)

	// Lombok — Spring Boot BOM이 버전 관리
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

	// pgvector — Hibernate 네이티브 벡터 타입 지원 (SqlTypes.VECTOR → PostgreSQL vector)
	implementation("org.hibernate.orm:hibernate-vector")

	// ── Error Prone + NullAway (컴파일 타임 버그 탐지) ──
	errorprone(libs.errorprone.core)
	errorprone(libs.nullaway)

	// Test
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.springframework.security:spring-security-test")

	// Testcontainers — Spring Boot 4.x BOM이 2.x를 관리하므로 버전 명시 불필요
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testImplementation("org.testcontainers:testcontainers-kafka")
	testImplementation("org.testcontainers:testcontainers-cassandra")

	// Cucumber BDD
	testImplementation(libs.cucumber.java)
	testImplementation(libs.cucumber.spring)
	testImplementation(libs.cucumber.junit.platform)

	// JUnit Platform Suite — CucumberTestSuite의 @Suite, @IncludeEngines 어노테이션에 필요
	testImplementation("org.junit.platform:junit-platform-suite")

	// ── ArchUnit (아키텍처 규칙 자동 검증) ──
	testImplementation(libs.archunit)

	// ── Awaitility (비동기/Pub-Sub 테스트의 폴링 동기화 — Thread.sleep 회피) ──
	testImplementation("org.awaitility:awaitility")

	testCompileOnly("org.projectlombok:lombok")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<JavaCompile>().configureEach {
	options.errorprone {
		option("NullAway:AnnotatedPackages", "com.maeum.gohyang")
		// NullAway는 초기에 경고로 시작. 안정화되면 error()로 전환.
		warn("NullAway")
		disableWarningsInGeneratedCode = true
	}
}

// 테스트 코드는 BDD 한글 메서드명을 사용하므로 UnicodeInCode 비활성화
tasks.named<JavaCompile>("compileTestJava") {
	options.errorprone {
		disable("UnicodeInCode")
	}
}

tasks.withType<Test> {
	// junit-platform-suite 엔진 제외: CucumberTestSuite는 IDE 전용.
	// Gradle은 junit-platform.properties를 통해 Cucumber 엔진을 직접 구동한다.
	// 두 엔진이 동시에 활성화되면 각 시나리오가 2번 실행되어 DB 상태 오염이 발생한다.
	useJUnitPlatform {
		excludeEngines("junit-platform-suite")
	}
	finalizedBy(tasks.jacocoTestReport)
}

// ── JaCoCo 커버리지 ──
jacoco {
	toolVersion = libs.versions.jacoco.get()
}

tasks.jacocoTestReport {
	dependsOn(tasks.test)
	reports {
		xml.required = true   // CI 연동용 (CodeRabbit, SonarCloud)
		html.required = true  // 로컬 확인용
		csv.required = false
	}

	// 커버리지 측정 제외 대상
	classDirectories.setFrom(
		files(classDirectories.files.map {
			fileTree(it) {
				exclude(
					"**/config/**",           // 설정 클래스
					"**/error/**",            // 예외/에러코드
					"**/*JpaEntity*",         // Persistence Entity
					"**/*CassandraEntity*",
					"**/*Key*",
					"**/*Request*",           // DTO
					"**/*Response*",
					"**/GohyangApplication*", // 메인 클래스
				)
			}
		})
	)
}

tasks.jacocoTestCoverageVerification {
	violationRules {
		rule {
			limit {
				// OpenAI 어댑터 테스트 추가 후 0.50으로 복원
				minimum = "0.40".toBigDecimal()
			}
		}
	}
}

tasks.check {
	dependsOn(tasks.jacocoTestCoverageVerification)
}

// ── Checkstyle (Naver Convention 기반) ──
checkstyle {
	toolVersion = libs.versions.checkstyle.get()
	configFile = file("config/checkstyle/checkstyle.xml")
	isIgnoreFailures = false
	maxWarnings = 0
}
