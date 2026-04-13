package com.maeum.gohyang.cucumber.steps;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.beans.factory.annotation.Autowired;

import com.maeum.gohyang.support.adapter.ChatTestAdapter;
import com.maeum.gohyang.support.context.ScenarioContext;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

/**
 * npc_chat.feature 시나리오의 단계 정의.
 *
 * 설계 원칙:
 * - HTTP 호출은 ChatTestAdapter에 위임한다.
 * - 상태 저장은 ScenarioContext에 위임한다.
 * - 검증 표현은 비즈니스 언어로 작성한다.
 */
public class CommunicationSteps {

    @Autowired
    private ChatTestAdapter chatTestAdapter;

    @Autowired
    private ScenarioContext scenarioContext;

    @When("게스트가 마을 채팅에 메시지 전송을 시도한다")
    public void 게스트가_마을_채팅에_메시지_전송을_시도한다() {
        chatTestAdapter.trySendMessageAsGuest();
    }

    @When("{string}를 마을 채팅에 전송한다")
    @When("{string}을 마을 채팅에 전송한다")
    public void 메시지를_마을_채팅에_전송한다(String message) {
        chatTestAdapter.sendVillageMessage(message);
    }

    @Then("NPC로부터 응답 메시지를 받는다")
    public void NPC로부터_응답_메시지를_받는다() {
        assertThat(scenarioContext.getLastStatusCode())
                .as("메시지 전송 응답 코드")
                .isEqualTo(200);

        String body = scenarioContext.getLastResponseBody();
        assertThat(body)
                .as("응답에 npcMessage가 포함되어야 한다")
                .contains("npcMessage")
                .contains("body")
                .contains("senderType");
    }
}
