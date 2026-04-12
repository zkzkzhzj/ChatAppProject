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

    @When("게스트가 NPC 채팅방 생성을 시도한다")
    public void 게스트가_NPC_채팅방_생성을_시도한다() {
        chatTestAdapter.tryCreateChatRoomWithGuestToken();
    }

    @When("NPC 채팅방을 생성한다")
    public void NPC_채팅방을_생성한다() {
        chatTestAdapter.createNpcChatRoom("마을 방문자");
    }

    @Then("채팅방이 정상적으로 생성된다")
    public void 채팅방이_정상적으로_생성된다() {
        assertThat(scenarioContext.getLastStatusCode())
                .as("채팅방 생성 응답 코드")
                .isEqualTo(201);
        assertThat(scenarioContext.getCurrentChatRoomId())
                .as("채팅방 ID가 발급되어야 한다")
                .isPositive();
    }

    @When("{string}를 NPC에게 전송한다")
    @When("{string}을 NPC에게 전송한다")
    public void 메시지를_NPC에게_전송한다(String message) {
        chatTestAdapter.sendMessage(scenarioContext.getCurrentChatRoomId(), message);
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
                .contains("body");
    }
}
