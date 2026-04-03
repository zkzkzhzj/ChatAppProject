package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Spring Actuator 엔드포인트를 테스트하기 위한 도메인별 TestAdapter.
 *
 * 역할:
 * - /actuator/* 엔드포인트 호출을 의미 있는 메서드 이름으로 감싼다.
 * - JSON 응답 파싱 로직을 이 클래스 안에 캡슐화한다.
 *   Step 정의는 파싱 방법이 아닌 비즈니스 의미("상태가 UP인가")에 집중한다.
 *
 * ObjectMapper를 직접 생성하는 이유:
 * Spring Boot 4.x는 Jackson 3.x(tools.jackson.*)를 사용하지만, Kafka 등 다른 의존성은
 * Jackson 2.x(com.fasterxml.jackson.*)를 포함한다. Spring이 등록하는 ObjectMapper 빈은
 * tools.jackson.databind.ObjectMapper이므로 이 클래스도 동일 타입을 사용한다.
 * 단순 JSON 파싱이 목적이므로 Spring 컨텍스트에서 주입받지 않고 직접 생성한다.
 */
@Component
public class ActuatorTestAdapter {

    private static final String HEALTH_PATH = "/actuator/health";

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ActuatorTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
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
