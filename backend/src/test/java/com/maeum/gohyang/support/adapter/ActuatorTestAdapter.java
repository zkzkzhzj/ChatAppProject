package com.maeum.gohyang.support.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.stereotype.Component;

/**
 * Spring Actuator 엔드포인트를 테스트하기 위한 도메인별 TestAdapter.
 *
 * 역할:
 * - /actuator/* 엔드포인트 호출을 의미 있는 메서드 이름으로 감싼다.
 * - JSON 응답 파싱 로직을 이 클래스 안에 캡슐화한다.
 *   Step 정의는 파싱 방법이 아닌 비즈니스 의미("상태가 UP인가")에 집중한다.
 */
@Component
public class ActuatorTestAdapter {

    private static final String HEALTH_PATH = "/actuator/health";

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;
    private final ObjectMapper objectMapper;

    public ActuatorTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext, ObjectMapper objectMapper) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
        this.objectMapper = objectMapper;
    }

    /**
     * 헬스체크 API를 호출한다.
     * 응답은 ScenarioContext에 저장되며 이후 단계에서 검증할 수 있다.
     */
    public void requestHealth() {
        testAdapter.get(HEALTH_PATH);
    }

    /**
     * 마지막 헬스체크 응답에서 status 필드 값을 반환한다.
     *
     * @return "UP", "DOWN", "OUT_OF_SERVICE" 등 Actuator 상태 문자열
     */
    public String getHealthStatus() {
        String body = scenarioContext.getLastResponseBody();
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode statusNode = root.get("status");
            if (statusNode == null) {
                throw new IllegalStateException("헬스체크 응답에 status 필드가 없습니다. 응답 본문: " + body);
            }
            return statusNode.asText();
        } catch (Exception e) {
            throw new IllegalStateException("헬스체크 응답 파싱에 실패했습니다. 응답 본문: " + body, e);
        }
    }
}
