package com.maeum.gohyang.support.adapter;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.support.context.ScenarioContext;

/**
 * Communication 엔드포인트 테스트 어댑터.
 *
 * 역할:
 * - /api/v1/chat/* 호출을 의미 있는 메서드 이름으로 감싼다.
 * - ScenarioContext에 응답을 저장한다.
 */
@Component
public class ChatTestAdapter {

    private static final String CHAT_MESSAGES_PATH = "/api/v1/chat/messages";

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;

    public ChatTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
    }

    /** 게스트 토큰으로 마을 채팅 메시지 전송 시도 (403 검증용). */
    public void trySendMessageAsGuest() {
        testAdapter.post(CHAT_MESSAGES_PATH,
                "{\"body\":\"게스트 메시지\"}",
                scenarioContext.getCurrentAccessToken());
    }

    /** 마을 공개 채팅에 메시지를 전송한다. */
    public void sendVillageMessage(String messageBody) {
        testAdapter.post(CHAT_MESSAGES_PATH,
                "{\"body\":\"" + messageBody + "\"}",
                scenarioContext.getCurrentAccessToken());
    }
}
