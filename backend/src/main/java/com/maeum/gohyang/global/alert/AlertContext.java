package com.maeum.gohyang.global.alert;

/**
 * 운영 알람을 발송할 때 함께 전달하는 컨텍스트.
 *
 * - domain: 알람이 발생한 도메인 또는 인프라 영역 (예: "outbox", "identity")
 * - eventId: 이벤트/요청 추적을 위한 UUID 문자열. 로그에서 특정 흐름을 끝까지 따라갈 수 있다.
 *            이벤트 기반이 아닌 상황(예: 스케줄러 오류)에는 null.
 * - aggregateId: 비즈니스 식별자 (예: userId). 어떤 데이터에 문제가 생겼는지 특정할 수 있다.
 *                없으면 null.
 */
public record AlertContext(
        String domain,
        String eventId,
        String aggregateId
) {

    /** 이벤트 추적 ID와 집계 루트 ID를 포함한 전체 컨텍스트 */
    public static AlertContext of(String domain, String eventId, String aggregateId) {
        return new AlertContext(domain, eventId, aggregateId);
    }

    /** 특정 이벤트/ID 없이 도메인만으로 컨텍스트 생성 (시스템 장애 등) */
    public static AlertContext ofDomain(String domain) {
        return new AlertContext(domain, null, null);
    }
}
