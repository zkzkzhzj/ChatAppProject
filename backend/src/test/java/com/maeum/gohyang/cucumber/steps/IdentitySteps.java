package com.maeum.gohyang.cucumber.steps;

import com.maeum.gohyang.support.adapter.AuthTestAdapter;
import com.maeum.gohyang.support.context.ScenarioContext;
import io.cucumber.java.en.And;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * authentication.feature 시나리오의 단계 정의.
 *
 * 설계 원칙:
 * - HTTP 호출은 AuthTestAdapter에 위임한다. 이 클래스는 URL, 파싱 방법을 모른다.
 * - 상태 저장은 ScenarioContext에 위임한다. 이 클래스는 instance field에 값을 저장하지 않는다.
 * - 검증 표현은 비즈니스 언어로 작성한다 ("accessToken이 포함되어 있다", "409를 받는다").
 */
public class IdentitySteps {

    @Autowired
    private AuthTestAdapter authTestAdapter;

    @Autowired
    private ScenarioContext scenarioContext;

    @Given("미가입 이메일 {string}이 있다")
    public void 미가입_이메일이_있다(String email) {
        // DB가 비어있는 상태이므로 별도 작업 불필요.
        // Given 단계를 명시하는 이유: 시나리오의 전제 조건("이 이메일은 아직 가입 전")을 문서화하기 위함.
    }

    @Given("{string}으로 이미 가입된 유저가 있다")
    public void 이미_가입된_유저가_있다(String email) {
        authTestAdapter.requestRegister(email, "password123");
    }

    @When("비밀번호 {string}으로 회원가입을 요청한다")
    public void 비밀번호로_회원가입을_요청한다(String password) {
        // ScenarioContext에서 이메일을 읽으려면 Given 단계에서 저장이 필요하지만,
        // feature 파일에서 이메일을 When 단계로 넘기지 않는 구조라
        // 현재 시나리오의 이메일("test@maeum.com")을 그대로 사용한다.
        // 시나리오가 늘어나면 ScenarioContext에 이메일을 저장하는 방식으로 확장한다.
        authTestAdapter.requestRegister("test@maeum.com", password);
    }

    @When("동일한 이메일로 회원가입을 요청한다")
    public void 동일한_이메일로_회원가입을_요청한다() {
        authTestAdapter.requestRegister("duplicate@maeum.com", "password123");
    }

    @When("GUEST 토큰 발급을 요청한다")
    public void GUEST_토큰_발급을_요청한다() {
        authTestAdapter.requestGuestToken();
    }

    @Then("HTTP 상태코드 {int}을 받는다")
    @Then("HTTP 상태코드 {int}를 받는다")
    public void HTTP_상태코드를_받는다(int expectedStatusCode) {
        assertThat(scenarioContext.getLastStatusCode())
                .as("HTTP 응답 상태 코드")
                .isEqualTo(expectedStatusCode);
    }

    @And("응답에 accessToken이 포함되어 있다")
    public void 응답에_accessToken이_포함되어_있다() {
        assertThat(authTestAdapter.hasAccessToken())
                .as("응답 본문에 accessToken이 존재해야 한다")
                .isTrue();
    }
}
