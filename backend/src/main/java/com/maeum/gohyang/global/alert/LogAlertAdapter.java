package com.maeum.gohyang.global.alert;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * AlertPort의 기본 구현체. 현재는 구조화된 로그만 출력한다.
 *
 * 교체 시점:
 * - 실서비스 배포 전에 SlackAlertAdapter 또는 PagerDutyAlertAdapter로 교체한다.
 * - 복수 채널(로그 + Slack)을 동시에 사용하려면 CompositeAlertAdapter를 만들어
 *   이 클래스와 함께 등록한다.
 */
@Slf4j
@Component
public class LogAlertAdapter implements AlertPort {

    @Override
    public void critical(AlertContext context, String message) {
        log.error("[ALERT:CRITICAL] domain={} eventId={} aggregateId={} message={}",
                context.domain(), context.eventId(), context.aggregateId(), message);
    }

    @Override
    public void warning(AlertContext context, String message) {
        log.warn("[ALERT:WARNING] domain={} eventId={} aggregateId={} message={}",
                context.domain(), context.eventId(), context.aggregateId(), message);
    }
}
