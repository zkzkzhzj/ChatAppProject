package com.maeum.gohyang.identity.application.port.out;

/**
 * 도메인 이벤트를 Outbox 테이블에 저장하는 포트.
 *
 * 회원가입 트랜잭션 내에서 호출되어, DB 커밋과 같은 원자성을 보장한다.
 * 회원가입이 롤백되면 이벤트도 함께 롤백된다.
 */
public interface SaveOutboxEventPort {

    void saveUserRegisteredEvent(Long userId);
}
