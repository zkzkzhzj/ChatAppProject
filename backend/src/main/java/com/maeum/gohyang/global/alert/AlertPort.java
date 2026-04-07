package com.maeum.gohyang.global.alert;

/**
 * 운영 알람 발송 포트.
 *
 * 용도: 개발자/운영팀을 향한 시스템 상태 알람.
 *       유저에게 보내는 알림(FCM, WebSocket)은 notification 도메인에서 별도 관리한다.
 *
 * 구현체 교체 전략:
 * - 현재: LogAlertAdapter (로그 출력만)
 * - 추후: SlackAlertAdapter, PagerDutyAlertAdapter
 * - 구현체를 교체하거나 추가해도 이 포트를 사용하는 코드는 변경 불필요
 *
 * 사용 원칙:
 * - critical: 즉시 대응이 필요한 상황. Kafka 다운, 이벤트 영구 실패 등.
 * - warning:  확인이 필요하지만 당장 서비스에 지장은 없는 상황.
 */
public interface AlertPort {

    /**
     * 즉시 대응이 필요한 심각한 오류.
     * 예: Outbox 이벤트 max retry 초과, Kafka 연속 장애
     */
    void critical(AlertContext context, String message);

    /**
     * 확인이 필요하지만 긴급하지 않은 경고.
     * 예: 재시도 임계값 근접, 처리 지연 감지
     */
    void warning(AlertContext context, String message);
}
