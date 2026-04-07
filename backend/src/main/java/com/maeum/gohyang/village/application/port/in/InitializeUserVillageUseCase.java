package com.maeum.gohyang.village.application.port.in;

/**
 * 유저 가입 시 기본 캐릭터와 공간을 초기화하는 유스케이스.
 * UserRegisteredEventConsumer가 Kafka 메시지 수신 시 호출한다.
 */
public interface InitializeUserVillageUseCase {

    void execute(long userId);
}
