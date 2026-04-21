# 전역 AlertPort 패턴 — 운영 알람 설계

## 배경

OutboxKafkaRelay에서 Kafka 발행 실패를 처리하면서 생긴 질문:  
"로그만 찍으면 에러가 쌓여도 아무도 모른다. 어떻게 알람을 붙여야 하는가?"

---

## 핵심 구분: 운영 알람 vs 유저 알림

처음엔 "알람 도메인을 만들면 되지 않나?"는 아이디어가 나왔다.  
하지만 알람에는 두 종류가 있고, 이 둘은 성격이 완전히 다르다.

```text
운영 알람 (Operational Alert)
  → 수신자: 개발자/운영팀
  → 채널: Slack, PagerDuty
  → 성격: 인프라 관심사. 도메인 로직이 아님.
  → 위치: global/alert/

유저 알림 (User Notification)
  → 수신자: 서비스 유저
  → 채널: FCM, WebSocket
  → 성격: 비즈니스 기능. 도메인으로 분리 필요.
  → 위치: notification/ 도메인 (미구현)
```

운영 알람을 "알람 도메인"으로 만들면:

- 모든 도메인이 notification 도메인에 의존해야 함 → 도메인 간 직접 참조 위반
- Kafka 이벤트로 우회하면 "Kafka가 죽었다"는 알람을 Kafka로 보내는 아이러니 발생

따라서 운영 알람은 `global/error/`처럼 전역 인프라 패키지에 둔다.

---

## AlertPort 인터페이스 설계

```java
public interface AlertPort {
    void critical(AlertContext context, String message);  // 즉시 대응
    void warning(AlertContext context, String message);   // 확인 필요
}
```

`AlertContext`에 `eventId`(UUID)를 포함한 이유:

- 로그에서 `grep "eventId=abc-123"`으로 해당 이벤트의 발행 → 소비 → 실패까지 전체 흐름을 추적 가능
- aggregateId(userId 등)로 "어떤 유저의 데이터에 문제가 생겼는지" 특정 가능

---

## OutboxKafkaRelay에서의 에러 분류

```text
Transient (일시적)     → 재시도 가능
  - NetworkException
  - BrokerNotAvailableException
  → retryCount 증가, PENDING 유지

Permanent (영구적)     → 재시도 불가, 즉시 FAILED
  - RecordTooLargeException
  - TopicAuthorizationException
  → FAILED + alertPort.critical()

Systemic (시스템적)    → 연속 N개 실패 → Kafka 장애 의심
  → alertPort.critical() + relay 중단
```

---

## 구현체 교체 전략

```text
현재:   LogAlertAdapter     → 로그만 출력
추후:   SlackAlertAdapter   → Slack Webhook 호출
배포:   CompositeAlertAdapter → 로그 + Slack 동시
```

교체 방법: Spring Bean 등록만 바꾸면 된다. AlertPort를 사용하는 코드는 건드릴 필요 없다.

```java
// 나중에 추가할 SlackAlertAdapter 스켈레톤
@Component
@Primary  // LogAlertAdapter 대신 이게 사용됨
public class SlackAlertAdapter implements AlertPort {
    @Override
    public void critical(AlertContext context, String message) {
        // Slack Incoming Webhook POST 호출
    }
}
```

---

## 알람 남발 방지 원칙

- `critical`은 "사람이 지금 당장 봐야 함"에만. 과도하게 쓰면 노이즈로 전락한다.
- `warning`은 "지금 당장은 아니지만 오늘 중으로 확인"에 사용한다.
- 에러 1개마다 알람을 보내지 않는다. 임계값(MAX_RETRY, SYSTEMIC_THRESHOLD)을 기준으로 보낸다.

---

## 참고

- ADR-004: `docs/architecture/decisions/004-global-alert-port.md`
- 관련 코드: `global/alert/AlertPort.java`, `global/infra/outbox/OutboxKafkaRelay.java`
