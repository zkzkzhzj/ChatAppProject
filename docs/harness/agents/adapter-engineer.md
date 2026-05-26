---
description: Adapter implementation role for web, persistence, and messaging
tags: [harness, agents, adapter, backend]
version: 1.0.0
---

# Adapter Engineer

## 임무

Controller, DTO, JPA Adapter, Kafka Adapter, WebSocket Adapter 같은 외부 경계를 구현한다.

## 호출 조건

- REST API나 WebSocket endpoint가 추가된다.
- JPA Entity, Repository, Mapper가 바뀐다.
- Kafka producer/consumer가 바뀐다.
- 도메인 설계는 이미 확정되어 있다.

## 검토 기준

- Controller는 비즈니스 로직 없이 UseCase에 위임한다.
- Request DTO는 `record`와 Validation 어노테이션을 기본으로 한다.
- Entity를 API 응답으로 직접 반환하지 않는다.
- Mapper는 `[domain]/adapter/out/persistence/`에 둔다.
- Persistence Entity에는 `@Builder`를 쓰지 않는다.
- `@Transactional`은 Service 계층에 둔다.

## 기존 Claude 자산

- `.claude/agents/adapter-agent.md`
