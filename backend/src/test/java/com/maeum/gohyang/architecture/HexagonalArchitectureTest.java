package com.maeum.gohyang.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;

/**
 * CLAUDE.md Critical Rules를 ArchUnit으로 자동 검증한다.
 *
 * Rule 1: Domain Entity에 인프라 어노테이션 금지
 * Rule 2: 도메인 간 직접 참조 금지
 */
class HexagonalArchitectureTest {

    private static final String BASE_PACKAGE = "com.maeum.gohyang";
    private static JavaClasses classes;

    @BeforeAll
    static void setUp() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(BASE_PACKAGE);
    }

    @Nested
    @DisplayName("Critical Rule #1 — Domain Entity에 인프라 어노테이션 금지")
    class DomainPurityTest {

        @Test
        @DisplayName("domain 패키지의 클래스는 JPA 어노테이션을 사용하지 않는다")
        void domainShouldNotUseJpaAnnotations() {
            noClasses()
                    .that().resideInAnyPackage("..domain..")
                    .and().resideOutsideOfPackage("..adapter..")
                    .should().beAnnotatedWith("jakarta.persistence.Entity")
                    .orShould().beAnnotatedWith("jakarta.persistence.Table")
                    .orShould().beAnnotatedWith("jakarta.persistence.Column")
                    .orShould().beAnnotatedWith("jakarta.persistence.Id")
                    .because("Critical Rule #1: Domain Entity는 순수 POJO여야 한다")
                    .check(classes);
        }

        @Test
        @DisplayName("domain 패키지의 클래스는 Spring 어노테이션에 의존하지 않는다")
        void domainShouldNotDependOnSpring() {
            noClasses()
                    .that().resideInAnyPackage("..domain..")
                    .and().resideOutsideOfPackage("..adapter..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("org.springframework..")
                    .because("Domain은 Spring Framework에 의존하지 않는다")
                    .check(classes);
        }
    }

    @Nested
    @DisplayName("Critical Rule #2 — 도메인 간 직접 참조 금지")
    class DomainBoundaryTest {

        @Test
        @DisplayName("identity 도메인은 다른 도메인의 내부를 직접 참조하지 않는다")
        void identityShouldNotAccessOtherDomains() {
            noClasses()
                    .that().resideInAnyPackage("..identity..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "..communication.domain..",
                            "..communication.adapter..",
                            "..communication.application..",
                            "..village.domain..",
                            "..village.adapter..",
                            "..village.application.."
                    )
                    .because("Critical Rule #2: 도메인 간 직접 참조 금지")
                    .check(classes);
        }

        @Test
        @DisplayName("village 도메인은 다른 도메인의 내부를 직접 참조하지 않는다")
        void villageShouldNotAccessOtherDomains() {
            noClasses()
                    .that().resideInAnyPackage("..village..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "..identity.domain..",
                            "..identity.adapter..",
                            "..identity.application..",
                            "..communication.domain..",
                            "..communication.adapter..",
                            "..communication.application.."
                    )
                    .because("Critical Rule #2: 도메인 간 직접 참조 금지")
                    .check(classes);
        }

        @Test
        @DisplayName("communication 도메인은 다른 도메인의 내부를 직접 참조하지 않는다")
        void communicationShouldNotAccessOtherDomains() {
            noClasses()
                    .that().resideInAnyPackage("..communication..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "..identity.domain..",
                            "..identity.adapter..",
                            "..identity.application..",
                            "..village.domain..",
                            "..village.adapter..",
                            "..village.application.."
                    )
                    .because("Critical Rule #2: 도메인 간 직접 참조 금지")
                    .check(classes);
        }
    }

    @Nested
    @DisplayName("헥사고날 레이어 의존 방향")
    class LayerDependencyTest {

        @Test
        @DisplayName("domain 패키지는 adapter 패키지에 의존하지 않는다")
        void domainShouldNotDependOnAdapter() {
            noClasses()
                    .that().resideInAnyPackage("..domain..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("..adapter..")
                    .because("Domain → Adapter 의존은 헥사고날 아키텍처 위반이다")
                    .check(classes);
        }

        @Test
        @DisplayName("application 패키지는 adapter 패키지에 의존하지 않는다")
        void applicationShouldNotDependOnAdapter() {
            noClasses()
                    .that().resideInAnyPackage("..application..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("..adapter..")
                    .because("Application → Adapter 의존은 헥사고날 아키텍처 위반이다")
                    .check(classes);
        }
    }
}
