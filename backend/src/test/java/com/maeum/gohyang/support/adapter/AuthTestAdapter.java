package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

/**
 * 인증 엔드포인트를 테스트하기 위한 도메인별 TestAdapter.
 *
 * 역할:
 * - /api/v1/auth/* 엔드포인트 호출을 의미 있는 메서드 이름으로 감싼다.
 * - JSON 응답 파싱 로직을 이 클래스 안에 캡슐화한다.
 *   Step 정의는 파싱 방법이 아닌 비즈니스 의미("accessToken이 있다")에 집중한다.
 */
@Component
public class AuthTestAdapter {

    private static final String REGISTER_PATH = "/api/v1/auth/register";
    private static final String GUEST_PATH = "/api/v1/auth/guest";

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuthTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
    }

    public void requestRegister(String email, String password) {
        testAdapter.post(REGISTER_PATH, Map.of("email", email, "password", password));
    }

    public void requestGuestToken() {
        testAdapter.post(GUEST_PATH);
    }

    /**
     * 마지막 응답 본문에서 accessToken 값을 반환한다.
     *
     * @throws IllegalStateException accessToken 필드가 없거나 파싱 실패 시
     */
    public String getAccessToken() {
        String body = scenarioContext.getLastResponseBody();
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode tokenNode = root.get("accessToken");
            if (tokenNode == null || tokenNode.isNull()) {
                throw new IllegalStateException("응답에 accessToken 필드가 없습니다. 응답 본문: " + body);
            }
            return tokenNode.asText();
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("응답 파싱에 실패했습니다. 응답 본문: " + body, e);
        }
    }

    public boolean hasAccessToken() {
        try {
            String token = getAccessToken();
            return token != null && !token.isBlank();
        } catch (IllegalStateException e) {
            return false;
        }
    }
}
