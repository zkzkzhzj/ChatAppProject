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

    /**
     * 현재 시나리오에서 인증에 사용할 Access Token.
     * 회원가입/로그인 성공 후 AuthTestAdapter가 설정한다.
     * 이후 인증이 필요한 API 호출(VillageTestAdapter 등)에서 자동으로 사용된다.
     */
    private String currentAccessToken;

    /**
     * 현재 시나리오에서 사용 중인 이메일.
     * Given 단계에서 설정되고, When 단계의 회원가입 요청에서 사용된다.
     */
    private String currentEmail;

    private Long currentChatRoomId;

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

    public void setCurrentAccessToken(String token) {
        this.currentAccessToken = token;
    }

    public String getCurrentAccessToken() {
        if (currentAccessToken == null) {
            throw new IllegalStateException("인증 토큰이 없습니다. 회원가입 또는 로그인 단계가 먼저 실행되어야 합니다.");
        }
        return currentAccessToken;
    }

    public boolean hasAccessToken() {
        return currentAccessToken != null && !currentAccessToken.isBlank();
    }

    public void setCurrentEmail(String email) {
        this.currentEmail = email;
    }

    public String getCurrentEmail() {
        if (currentEmail == null) {
            throw new IllegalStateException("이메일이 설정되지 않았습니다. Given 단계에서 이메일을 먼저 설정해야 합니다.");
        }
        return currentEmail;
    }

    public void setCurrentChatRoomId(long chatRoomId) {
        this.currentChatRoomId = chatRoomId;
    }

    public long getCurrentChatRoomId() {
        if (currentChatRoomId == null) {
            throw new IllegalStateException("채팅방이 생성되지 않았습니다. 채팅방 생성 단계가 먼저 실행되어야 합니다.");
        }
        return currentChatRoomId;
    }
}
