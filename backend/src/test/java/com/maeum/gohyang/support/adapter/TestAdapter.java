package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * 테스트에서 HTTP API를 호출하기 위한 추상화 기반 클래스.
 *
 * 역할:
 * - 테스트 코드를 TestRestTemplate 구현 세부사항으로부터 격리한다.
 * - 모든 HTTP 요청/응답을 ScenarioContext에 저장하여 단계(Step) 간 상태를 공유한다.
 * - 도메인별 TestAdapter(ActuatorTestAdapter 등)의 공통 HTTP 기반을 제공한다.
 *
 * 사용 원칙:
 * - 단계 정의(Steps)는 이 클래스를 직접 사용하지 않는다.
 *   반드시 도메인별 TestAdapter를 통해 호출한다.
 * - 인증이 필요한 요청은 withAuth() 등 별도 메서드를 추가해 확장한다.
 */
@Component
public class TestAdapter {

    private final TestRestTemplate restTemplate;
    private final ScenarioContext scenarioContext;

    public TestAdapter(TestRestTemplate restTemplate, ScenarioContext scenarioContext) {
        this.restTemplate = restTemplate;
        this.scenarioContext = scenarioContext;
    }

    /**
     * GET 요청을 보내고 응답을 ScenarioContext에 저장한다.
     */
    public ResponseEntity<String> get(String path) {
        ResponseEntity<String> response = restTemplate.getForEntity(path, String.class);
        scenarioContext.setLastResponse(response);
        return response;
    }

    /**
     * Authorization 헤더를 포함한 GET 요청을 보낸다.
     */
    public ResponseEntity<String> get(String path, String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(path, HttpMethod.GET, entity, String.class);
        scenarioContext.setLastResponse(response);
        return response;
    }

    /**
     * JSON 바디를 포함한 POST 요청을 보낸다.
     */
    public ResponseEntity<String> post(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(path, HttpMethod.POST, entity, String.class);
        scenarioContext.setLastResponse(response);
        return response;
    }

    /**
     * Authorization 헤더를 포함한 POST 요청을 보낸다.
     */
    public ResponseEntity<String> post(String path, Object body, String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(bearerToken);
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(path, HttpMethod.POST, entity, String.class);
        scenarioContext.setLastResponse(response);
        return response;
    }
}
