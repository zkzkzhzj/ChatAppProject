package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.stereotype.Component;

/**
 * Communication 엔드포인트 테스트 어댑터.
 *
 * 역할:
 * - /api/v1/chat-rooms/* 호출을 의미 있는 메서드 이름으로 감싼다.
 * - chatRoomId 파싱 및 ScenarioContext 저장을 책임진다.
 */
@Component
public class ChatTestAdapter {

    private static final String CHAT_ROOMS_PATH = "/api/v1/chat-rooms";

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;

    public ChatTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
    }

    /** 인증 없이 NPC 채팅방 생성 시도 (게스트 403 검증용). */
    public void tryCreateChatRoomWithGuestToken() {
        testAdapter.post(CHAT_ROOMS_PATH,
                "{\"displayName\":\"게스트\"}",
                scenarioContext.getCurrentAccessToken());
    }

    /**
     * NPC 채팅방 생성 후 chatRoomId를 ScenarioContext에 저장한다.
     */
    public void createNpcChatRoom(String displayName) {
        var response = testAdapter.post(CHAT_ROOMS_PATH,
                "{\"displayName\":\"" + displayName + "\"}",
                scenarioContext.getCurrentAccessToken());

        String body = response.getBody();
        long chatRoomId = parseJsonLong(body, "chatRoomId");
        scenarioContext.setCurrentChatRoomId(chatRoomId);
    }

    /**
     * 메시지를 전송하고 응답을 ScenarioContext에 저장한다.
     */
    public void sendMessage(long chatRoomId, String messageBody) {
        testAdapter.post(CHAT_ROOMS_PATH + "/" + chatRoomId + "/messages",
                "{\"body\":\"" + messageBody + "\"}",
                scenarioContext.getCurrentAccessToken());
    }

    /** 응답 JSON에서 특정 필드의 long 값을 파싱한다. */
    private long parseJsonLong(String json, String field) {
        int keyIndex = json.indexOf("\"" + field + "\"");
        if (keyIndex < 0) throw new IllegalStateException("응답에 " + field + " 필드가 없습니다: " + json);
        int colonIndex = json.indexOf(":", keyIndex);
        int commaIndex = json.indexOf(",", colonIndex);
        int braceIndex = json.indexOf("}", colonIndex);
        int end = (commaIndex > 0 && commaIndex < braceIndex) ? commaIndex : braceIndex;
        return Long.parseLong(json.substring(colonIndex + 1, end).trim());
    }
}
