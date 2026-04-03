package com.maeum.gohyang.support.context;

import io.cucumber.spring.ScenarioScope;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * 하나의 Cucumber 시나리오 안에서 단계(Step) 간 상태를 공유하는 컨텍스트.
 *
 * @ScenarioScope: 각 시나리오마다 새 인스턴스가 생성된다.
 *                 시나리오 간 상태 오염(test pollution)이 발생하지 않는다.
 *
 * 사용 원칙:
 * - 단계 정의(Steps)는 직접 HTTP 응답을 보관하지 않고 이 클래스에 위임한다.
 * - TestAdapter가 응답을 저장하고, Steps가 응답을 검증하는 역할 분리를 유지한다.
 */
@ScenarioScope
@Component
public class ScenarioContext {

    private ResponseEntity<String> lastResponse;

    public void setLastResponse(ResponseEntity<String> response) {
        this.lastResponse = response;
    }

    public ResponseEntity<String> getLastResponse() {
        return lastResponse;
    }

    public int getLastStatusCode() {
        if (lastResponse == null) {
            throw new IllegalStateException("아직 HTTP 요청이 수행되지 않았습니다. API 호출 단계가 먼저 실행되어야 합니다.");
        }
        return lastResponse.getStatusCode().value();
    }

    public String getLastResponseBody() {
        if (lastResponse == null) {
            throw new IllegalStateException("아직 HTTP 요청이 수행되지 않았습니다. API 호출 단계가 먼저 실행되어야 합니다.");
        }
        return lastResponse.getBody();
    }
}
