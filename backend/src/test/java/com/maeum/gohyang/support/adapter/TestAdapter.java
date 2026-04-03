package com.maeum.gohyang.support.adapter;

import com.maeum.gohyang.support.context.ScenarioContext;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 테스트에서 HTTP API를 호출하기 위한 추상화 기반 클래스.
 *
 * 역할:
 * - 테스트 코드를 RestClient 구현 세부사항으로부터 격리한다.
 * - 모든 HTTP 요청/응답을 ScenarioContext에 저장하여 단계(Step) 간 상태를 공유한다.
 * - 도메인별 TestAdapter(ActuatorTestAdapter 등)의 공통 HTTP 기반을 제공한다.
 *
 * RestClient를 선택한 이유:
 * - Spring 6.1+의 현대적인 동기 HTTP 클라이언트 (Builder API 스타일)
 * - spring-web 내장으로 별도 의존성 불필요
 * - TestRestTemplate은 Spring Boot 4.x에서 별도 모듈(spring-boot-resttestclient)로 이동됨
 *
 * RestClient 초기화를 지연(lazy)하는 이유:
 * - @SpringBootTest(RANDOM_PORT)에서 local.server.port는 WebServerInitializedEvent
 *   발행 이후에 환경(Environment)에 추가된다.
 * - 이 이벤트는 finishBeanFactoryInitialization() 이후에 발행되므로,
 *   생성자에서 @Value("${local.server.port}")로 포트를 읽으면 플레이스홀더 해석 실패가 발생한다.
 * - 따라서 첫 HTTP 호출 시점에 Environment에서 포트를 읽어 RestClient를 초기화한다.
 *   이 시점은 서버가 완전히 기동된 이후(테스트 Step 실행 중)이므로 포트가 항상 확정되어 있다.
 *
 * exchange()를 쓰는 이유:
 * - retrieve().toEntity()는 4xx/5xx에서 예외를 던진다.
 * - 테스트에서는 오류 응답도 검증해야 하므로, 상태 코드에 무관하게
 *   ResponseEntity를 반환하는 exchange() 방식을 사용한다.
 *
 * 사용 원칙:
 * - 단계 정의(Steps)는 이 클래스를 직접 사용하지 않는다.
 *   반드시 도메인별 TestAdapter를 통해 호출한다.
 */
@Component
public class TestAdapter {

    private final ScenarioContext scenarioContext;
    private final Environment environment;
    private RestClient restClient;

    public TestAdapter(ScenarioContext scenarioContext, Environment environment) {
        this.scenarioContext = scenarioContext;
        this.environment = environment;
    }

    private RestClient getRestClient() {
        if (restClient == null) {
            int port = Integer.parseInt(environment.getRequiredProperty("local.server.port"));
            restClient = RestClient.create("http://localhost:" + port);
        }
        return restClient;
    }

    public ResponseEntity<String> get(String path) {
        ResponseEntity<String> response = getRestClient().get()
                .uri(path)
                .exchange((req, res) -> toResponseEntity(res));
        scenarioContext.setLastResponse(response);
        return response;
    }

    public ResponseEntity<String> get(String path, String bearerToken) {
        ResponseEntity<String> response = getRestClient().get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .exchange((req, res) -> toResponseEntity(res));
        scenarioContext.setLastResponse(response);
        return response;
    }

    public ResponseEntity<String> post(String path, Object body) {
        ResponseEntity<String> response = getRestClient().post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange((req, res) -> toResponseEntity(res));
        scenarioContext.setLastResponse(response);
        return response;
    }

    public ResponseEntity<String> post(String path, Object body, String bearerToken) {
        ResponseEntity<String> response = getRestClient().post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .body(body)
                .exchange((req, res) -> toResponseEntity(res));
        scenarioContext.setLastResponse(response);
        return response;
    }

    private ResponseEntity<String> toResponseEntity(ClientHttpResponse res) throws IOException {
        String body = new String(res.getBody().readAllBytes(), StandardCharsets.UTF_8);
        return ResponseEntity.status(res.getStatusCode()).body(body);
    }
}
