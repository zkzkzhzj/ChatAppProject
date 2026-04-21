# ADR-004: 운영 알람 — 전역 AlertPort 패턴

## 상태

확정 (2026-04-07)

---

## 맥락

시스템의 여러 지점(Outbox 릴레이, Kafka 컨슈머 등)에서 운영팀에 알람을 보내야 하는 상황이 생긴다.  
이를 어떤 구조로 처리할 것인가?

---

## 알람의 두 가지 종류

이 ADR에서 다루는 것은 **운영 알람**이다.

| 종류 | 대상 | 채널 | 담당 |
|------|------|------|------|
| 운영 알람 (Operational Alert) | 개발자/운영팀 | Slack, PagerDuty | `global/alert/` |
| 유저 알림 (User Notification) | 서비스 유저 | FCM, WebSocket | `notification/` 도메인 (미구현) |

---

## 선택지

**A. 도메인별 AlertPort**

- 각 도메인이 자체 `OutboxAlertPort`, `VillageAlertPort` 등을 정의
- 단점: 동일한 인터페이스가 도메인 수만큼 복제됨

**B. 전역 AlertPort (`global/alert/`)**

- `global/error/`처럼 프로젝트 전역에서 사용하는 단일 인터페이스
- 어느 도메인이든 `AlertPort`를 생성자 주입으로 사용
- 단점: 없음 (`global/`은 모든 레이어에서 의존 가능)

**C. Notification 도메인으로 이벤트 전달**

- 도메인이 Kafka 이벤트로 알람 트리거 발행 → Notification 도메인이 처리
- 운영 알람치고는 과도한 복잡도

---

## 결정

**B. 전역 AlertPort** 채택.

- 운영 알람은 도메인 로직이 아니라 **인프라 관심사**다.
- `global/error/`와 동일한 위치 원칙을 따른다.
- 구현체 교체 시 `AlertPort`를 사용하는 코드는 변경 없이 어댑터만 바꾸면 된다.

---

## AlertContext 설계 이유

```java
public record AlertContext(
    String domain,       // 어느 도메인에서 발생했는지
    String eventId,      // UUID — 로그에서 특정 이벤트 흐름 추적
    String aggregateId   // userId 등 — 어떤 비즈니스 엔티티에 문제가 생겼는지
)
```

`eventId`가 있으면 로그에서 `grep eventId=<UUID>`로 해당 이벤트의 발행 → 소비 → 실패 전체 흐름을 하나의 쿼리로 추적할 수 있다.

---

## 구현체 로드맵

| 단계 | 구현체 | 설명 |
|------|--------|------|
| 현재 (MVP) | `LogAlertAdapter` | 구조화된 로그 출력만 |
| 실서비스 배포 전 | `SlackAlertAdapter` | Slack Incoming Webhook |
| 트래픽 증가 후 | `PagerDutyAlertAdapter` | critical은 PagerDuty, warning은 Slack |
| 복수 채널 필요 시 | `CompositeAlertAdapter` | 여러 구현체를 순서대로 호출 |

---

## 적용 원칙

- `critical`: 즉시 사람이 확인해야 하는 상황 (데이터 유실 가능, Kafka 장애 등)
- `warning`: 확인이 필요하지만 즉각 서비스 영향 없음 (재시도 임박, 지연 감지 등)
- 알람을 남발하면 노이즈가 되어 중요한 알람을 놓친다. `critical`은 진짜 긴급 상황에만.
