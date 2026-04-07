package com.maeum.gohyang.cucumber.steps;

import com.maeum.gohyang.support.adapter.VillageTestAdapter;
import com.maeum.gohyang.support.context.ScenarioContext;
import io.cucumber.java.en.And;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * village/registration.feature 시나리오의 단계 정의.
 *
 * 설계 원칙:
 * - HTTP 호출은 VillageTestAdapter에 위임한다. 이 클래스는 URL, 폴링 로직을 모른다.
 * - 상태 저장은 ScenarioContext에 위임한다. 이 클래스는 instance field에 값을 저장하지 않는다.
 * - 검증 표현은 비즈니스 언어로 작성한다 ("캐릭터가 존재한다", "기본 공간이 존재한다").
 */
public class VillageSteps {

    @Autowired
    private VillageTestAdapter villageTestAdapter;

    @Autowired
    private ScenarioContext scenarioContext;

    @And("캐릭터가 생성될 때까지 최대 {int}초 대기한다")
    public void 캐릭터가_생성될_때까지_최대_N초_대기한다(int maxSeconds) {
        villageTestAdapter.waitForCharacter(maxSeconds);
    }

    @And("내 캐릭터가 존재한다")
    public void 내_캐릭터가_존재한다() {
        assertThat(scenarioContext.getLastStatusCode())
                .as("캐릭터 조회 응답 코드")
                .isEqualTo(200);
    }

    @And("내 기본 공간이 존재한다")
    public void 내_기본_공간이_존재한다() {
        villageTestAdapter.fetchMySpace();
        assertThat(scenarioContext.getLastStatusCode())
                .as("기본 공간 조회 응답 코드")
                .isEqualTo(200);
    }

    @And("게스트 캐릭터가 반환된다")
    public void 게스트_캐릭터가_반환된다() {
        villageTestAdapter.fetchMyCharacterWithGuestToken();
        assertThat(scenarioContext.getLastStatusCode())
                .as("게스트 캐릭터 조회 응답 코드")
                .isEqualTo(200);
    }

    @And("게스트가 내 공간을 조회하면 403을 받는다")
    public void 게스트가_내_공간을_조회하면_403을_받는다() {
        villageTestAdapter.fetchMySpaceWithGuestToken();
        assertThat(scenarioContext.getLastStatusCode())
                .as("게스트 공간 조회는 403이어야 한다")
                .isEqualTo(403);
    }
}
