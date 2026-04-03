package com.maeum.gohyang.support;

import io.cucumber.spring.CucumberContextConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Cucumber + Spring Boot 통합 진입점.
 *
 * 역할:
 * - @CucumberContextConfiguration: Cucumber이 이 클래스를 Spring Context 설정 기준으로 사용한다.
 *   이 어노테이션이 없으면 Cucumber는 Spring을 어떻게 부팅할지 알 수 없다.
 *   abstract 클래스인 BaseTestContainers에 붙일 수 없으므로 이 클래스가 반드시 존재해야 한다.
 *
 * - @SpringBootTest(RANDOM_PORT): 실제 서블릿 컨테이너를 랜덤 포트로 기동한다.
 *   MockMvc 대신 RANDOM_PORT를 선택한 이유:
 *   실제 필터, 인터셉터, 시큐리티가 모두 동작하는 환경에서 테스트하기 위함.
 *
 * - extends BaseTestContainers: 컨테이너 기동 및 @DynamicPropertySource 주입을 상속한다.
 *
 * - @ActiveProfiles("test"): application-test.yml 적용 (Cassandra 자동 설정 비활성화 등)
 *
 * 이 클래스의 몸체가 비어있는 이유:
 * 이 클래스의 목적은 "어떻게 동작하는가"가 아니라 "어떻게 설정하는가"를 선언하는 것이다.
 * 실제 인프라 설정은 BaseTestContainers에, 컨테이너 포트 주입은 @DynamicPropertySource에 있다.
 */
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class CucumberSpringConfig extends BaseTestContainers {
}
