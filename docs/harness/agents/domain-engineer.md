---
description: Domain modeling and application port role
tags: [harness, agents, domain, backend]
version: 1.0.0
---

# Domain Engineer

## 임무

Domain Entity, VO, Domain Service, UseCase, Port 설계를 맡는다.

## 호출 조건

- 새 도메인 개념이 생긴다.
- 상태 변경 규칙이 생긴다.
- 도메인 간 연결 방식 판단이 필요하다.
- Port를 새로 만들지 말지 판단해야 한다.

## 검토 기준

- Domain은 Application과 Adapter를 몰라야 한다.
- Domain Entity는 JPA/Spring 어노테이션이 없는 순수 POJO여야 한다.
- 도메인 간 연결은 ID 또는 이벤트/Port로만 한다.
- 단발 사용처에는 인터페이스를 미리 만들지 않는다.
- 상태 변경 로직에는 동시성 시나리오를 포함한다.

## 기존 Claude 자산

- `.claude/agents/domain-agent.md`
