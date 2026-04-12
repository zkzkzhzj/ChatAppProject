package com.maeum.gohyang.support.adapter;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.support.context.ScenarioContext;

/**
 * Village 엔드포인트를 테스트하기 위한 도메인별 TestAdapter.
 *
 * 역할:
 * - /api/v1/village/* 엔드포인트 호출을 의미 있는 메서드 이름으로 감싼다.
 * - Kafka 비동기 이벤트 처리 후 생성되는 캐릭터/공간을 기다리는 폴링 로직을 캡슐화한다.
 *
 * 폴링이 필요한 이유:
 * - 회원가입 → Outbox 저장 → Kafka 발행 → Village 컨슈머 처리 순서로 비동기 처리된다.
 * - 회원가입 직후 캐릭터/공간이 즉시 존재하지 않을 수 있다.
 * - 최대 대기 시간 내에 200 응답이 오면 성공, 시간 초과 시 테스트 실패.
 */
@Component
public class VillageTestAdapter {

    private static final String CHARACTER_PATH = "/api/v1/village/characters/me";
    private static final String SPACE_PATH = "/api/v1/village/spaces/me";
    private static final long POLL_INTERVAL_MS = 500;

    private final TestAdapter testAdapter;
    private final ScenarioContext scenarioContext;

    public VillageTestAdapter(TestAdapter testAdapter, ScenarioContext scenarioContext) {
        this.testAdapter = testAdapter;
        this.scenarioContext = scenarioContext;
    }

    /**
     * 캐릭터가 생성될 때까지 폴링한다.
     * 최대 대기 시간 내에 200 응답이 오면 last response를 200으로 설정하고 반환한다.
     *
     * @param maxSeconds 최대 대기 시간(초)
     * @throws IllegalStateException 시간 초과 시
     */
    public void waitForCharacter(int maxSeconds) {
        String token = scenarioContext.getCurrentAccessToken();
        int maxAttempts = (int) (maxSeconds * 1000L / POLL_INTERVAL_MS);

        for (int i = 0; i < maxAttempts; i++) {
            var response = testAdapter.get(CHARACTER_PATH, token);
            if (response.getStatusCode().is2xxSuccessful()) {
                return;
            }
            sleep();
        }
        throw new IllegalStateException("캐릭터가 " + maxSeconds + "초 내에 생성되지 않았습니다.");
    }

    /**
     * 내 기본 공간을 조회한다. 결과는 ScenarioContext의 lastResponse에 저장된다.
     */
    public void fetchMySpace() {
        testAdapter.get(SPACE_PATH, scenarioContext.getCurrentAccessToken());
    }

    /**
     * 게스트 토큰으로 캐릭터를 조회한다. 200 응답을 기대한다.
     */
    public void fetchMyCharacterWithGuestToken() {
        testAdapter.get(CHARACTER_PATH, scenarioContext.getCurrentAccessToken());
    }

    /**
     * 게스트 토큰으로 공간을 조회한다. 403 응답을 기대한다.
     */
    public void fetchMySpaceWithGuestToken() {
        testAdapter.get(SPACE_PATH, scenarioContext.getCurrentAccessToken());
    }

    private void sleep() {
        try {
            Thread.sleep(POLL_INTERVAL_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("폴링 대기 중 인터럽트 발생", e);
        }
    }
}
