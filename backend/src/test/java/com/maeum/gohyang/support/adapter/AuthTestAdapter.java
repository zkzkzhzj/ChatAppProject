package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Optional;

/**
 * 인증 엔드포인트를 테스트하기 위한 도메인별 TestAdapter.
 *
 * 역할:
 * - /api/v1/auth/* 엔드포인트 호출을 의미 있는 메서드 이름으로 감싼다.
 * - JSON 응답 파싱 로직을 이 클래스 안에 캡슐화한다.
 * - 회원가입 성공 시 토큰을 ScenarioContext에 자동 저장한다.
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
        findAccessToken().ifPresent(scenarioContext::setCurrentAccessToken);
    }

    public void requestGuestToken() {
        testAdapter.post(GUEST_PATH);
    }

    /**
     * 마지막 응답에서 accessToken을 찾는다. 없거나 파싱 실패 시 empty.
     */
    public Optional<String> findAccessToken() {
        try {
            String body = scenarioContext.getLastResponseBody();
            JsonNode tokenNode = objectMapper.readTree(body).get("accessToken");
            if (tokenNode == null || tokenNode.isNull() || tokenNode.asText().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(tokenNode.asText());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * 마지막 응답에 accessToken이 반드시 있어야 하는 상황에서 사용한다.
     *
     * @throws IllegalStateException accessToken이 없거나 파싱 실패 시
     */
    public String getAccessToken() {
        return findAccessToken()
                .orElseThrow(() -> new IllegalStateException(
                        "응답에 accessToken이 없습니다. 응답 본문: " + scenarioContext.getLastResponseBody()));
    }

    public boolean hasAccessToken() {
        return findAccessToken().isPresent();
    }
}
