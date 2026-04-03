package com.maeum.gohyang.cucumber.steps;

import com.maeum.gohyang.support.adapter.ActuatorTestAdapter;
import com.maeum.gohyang.support.context.ScenarioContext;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * health_check.feature 시나리오의 단계 정의.
 *
 * 설계 원칙:
 * - HTTP 호출은 ActuatorTestAdapter에 위임한다. 이 클래스는 URL, 파싱 방법을 모른다.
 * - 상태 저장은 ScenarioContext에 위임한다. 이 클래스는 instance field에 값을 저장하지 않는다.
 * - 검증 표현은 비즈니스 언어로 작성한다 ("status가 UP이다", "코드가 200이다").
 */
public class HealthCheckSteps {

    @Autowired
    private ActuatorTestAdapter actuatorTestAdapter;

    @Autowired
    private ScenarioContext scenarioContext;

    @Given("서버가 실행 중이다")
    public void 서버가_실행_중이다() {
        // @SpringBootTest가 서버를 기동하므로 여기서는 별도 작업이 필요하지 않다.
        // Given 단계를 명시하는 이유: 시나리오의 전제 조건을 문서화하기 위함.
    }

    @When("헬스체크 API를 호출한다")
    public void 헬스체크_API를_호출한다() {
        actuatorTestAdapter.requestHealth();
    }

    @Then("응답 상태 코드는 {int}이다")
    public void 응답_상태_코드는_이다(int expectedStatusCode) {
        assertThat(scenarioContext.getLastStatusCode())
                .as("HTTP 응답 상태 코드")
                .isEqualTo(expectedStatusCode);
    }

    @And("서비스 상태는 {string}이다")
    public void 서비스_상태는_이다(String expectedStatus) {
        assertThat(actuatorTestAdapter.getHealthStatus())
                .as("Actuator health status")
                .isEqualTo(expectedStatus);
    }
}
