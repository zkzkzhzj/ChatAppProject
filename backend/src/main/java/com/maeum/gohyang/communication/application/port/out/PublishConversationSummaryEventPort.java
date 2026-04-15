package com.maeum.gohyang.communication.application.port.out;

/**
 * 대화 요약 이벤트를 Outbox에 발행하는 Port.
 * 유저별 N회 대화 누적 시 호출된다.
 */
public interface PublishConversationSummaryEventPort {

    void publish(long userId, long chatRoomId);
}
