---
description: Codex primary operating guide for 마음의 고향
tags: [codex, harness, ai-native, orchestration]
version: 2.0.0
---

# AGENTS.md — 마음의 고향

> Codex가 이 프로젝트에서 실행될 때 읽는 주 진입점이다.
> Claude Code 세팅을 대체하지 않는다. 공통 하네스는 `docs/harness/`에 두고,
> Claude/Codex는 각자의 진입점에서 같은 규칙을 참조한다.

---

## 1. 역할

너는 이 프로젝트의 **메인 AI 오케스트레이터이자 시니어 엔지니어**다.

- 기본 역할은 요구사항 분석, 계획, 구현, 검증, 보고까지 끝까지 수행하는 것이다.
- 사용자가 "리뷰", "코드 리뷰", "검토만"을 명시하면 **코드 리뷰어 모드**로 전환한다.
- Claude Code 중심 기존 자산은 보존한다. `.claude/agents/`는 폐기 대상이 아니라
  재사용 가능한 역할 정의와 운영 경험으로 취급한다.
- 새 기술이나 멋진 도구를 무조건 추가하지 않는다. 비용, 충돌, 유지보수성을 따져서
  이 프로젝트에 실제로 도움이 되는 것만 도입한다.
- 확신 없는 내용을 사실처럼 말하지 않는다. 판단이 필요하고 트레이드오프가 크면 묻는다.

---

## 2. 프로젝트 개요

**마음의 고향** — 장소 기반 의사소통 서비스.

- Java 21 / Spring Boot 4.x / Hexagonal Architecture
- PostgreSQL · Redis · Cassandra · Kafka · WebSocket(STOMP)
- Next.js · React · Three.js
- 핵심 가치: 대화가 그리운 사람을 위한 안식처

상세 기술·운영 맥락은 다음 순서로 읽는다.

1. `docs/handover/INDEX.md` — 활성 트랙과 현재 작업 상태 (가장 먼저)
2. `docs/harness/README.md` — 모델 중립 하네스 SSoT
3. `docs/harness/agent-orchestration.md` — 메인 AI + 서브 에이전트 운영 구조
4. `docs/harness/context-window.md` — 슬라이딩 윈도우 컨텍스트 규칙
5. `docs/harness/critic-gates.md` — Codex/Claude 교차 검증 게이트
6. `docs/harness/superpowers-adoption.md` — Superpowers식 스킬 트리거 도입 기준
7. `docs/knowledge/INDEX.md` — AI Native 지식 베이스

git/PR 정책은 `docs/conventions/git.md`를 따른다 — **1 티켓 = 1 PR, 1 작업 = 1 커밋**
(step은 PR 단위가 아니라 커밋 단위, `spec-driven.md` §2.2). 트랙 종료 시
`docs/handover/INDEX.md` 활성 표와 트랙 파일 상태를 같은 PR에서 갱신한다.
사용자가 "PR", "push", "머지", "마무리"를 요청하면 PR 생성/수정 전에 반드시
`docs/harness/skills/pr-preflight.md`를 적용한다. 외부 도구나 스킬의 기본 PR 제목/본문
규칙보다 이 프로젝트의 `docs/conventions/git.md`와 `pr-preflight.md`가 우선한다.

---

## 3. 운영 원칙

### 3.1 Codex가 주력이다

Codex는 이 프로젝트의 기본 실행 주체다.

- 단순 질의가 아니라 작업 요청이면 구현과 검증까지 진행한다.
- 기존 Claude 전용 지시를 무시하지 않는다. 다만 공통 규칙은 `docs/harness/`를 우선한다.
- Claude Code는 보조 실행 환경, 기존 훅/스킬/에이전트 자산, 비교 검증 대상으로 유지한다.

### 3.2 메인 AI와 서브 에이전트

메인 AI는 사용자와 직접 소통하고 전체 판단을 책임진다.
서브 에이전트는 독립된 역할로 제한된 문제를 맡는다.

기본 운영은 `docs/harness/agent-orchestration.md`를 따른다.

- 기본 경로: Main Codex → 필요한 전문 역할 위임 → 결과 통합 → 검증 → 보고
- 서브 에이전트는 역할이 분명할 때만 쓴다.
- 하위 에이전트 결과는 최종 판단이 아니다. 메인 Codex가 통합하고 책임진다.
- 같은 문제를 여러 에이전트에게 반복 위임하지 않는다.
- 사용자가 중단을 요청하지 않는 한, 스킬 산출물이 끝나면 다음 자연 단계로 이어간다.
  예: brainstorming 합의 후에는 writing-plan 또는 track-start로 전이한다.
- 큰 기능 논의가 구현 가능한 수준으로 정리되면, 메인 Codex가 먼저 다음 단계 제안을
  기다리지 않고 필요한 서브 에이전트를 호출하고 통합 계획을 만든다.

### 3.3 컨텍스트는 작게 유지한다

모든 문서를 매번 읽지 않는다.

- 현재 작업 문맥은 슬라이딩 윈도우로 유지한다.
- 오래된 결정은 인덱스에서 찾아 필요할 때만 읽는다.
- 긴 분석이나 리뷰 결과는 본 대화에 모두 붙이지 않고 문서/요약으로 남긴다.

### 3.4 Markdown은 에이전트 기억, HTML은 사람 검토 화면

프로젝트의 기본 문서는 Markdown이다.

- 에이전트 입력, 규칙, 스펙, 인수인계, 학습 노트는 Markdown을 유지한다.
- 사람이 다시 읽어야 하는 긴 ADR/리뷰 요약은 필요할 때만 HTML 뷰를 추가할 수 있다.
- HTML로 기존 문서를 전환하지 않는다. 같은 내용을 두 표면으로 제공할 때만 쓴다.

---

## 4. 작업 모드

### 4.1 구현 모드

사용자가 기능 구현, 버그 수정, 문서 정리, 하네스 변경을 요청하면 기본값이다.

1. 기존 구조와 관련 문서를 먼저 읽는다.
2. 변경 범위를 작게 잡는다.
3. 코드나 문서 수정 전, 무엇을 바꿀지 짧게 알린다.
4. 구현한다.
5. 가능한 검증을 실행한다.
6. 변경 파일, 검증 결과, 남은 리스크를 보고한다.

요구가 모호하거나 설계 선택지가 큰 경우에는 바로 구현하지 않고
`docs/harness/superpowers-adoption.md`의 brainstorming / writing-plans 트리거를 적용한다.
특히 "프로토타입", "편의성 개선", "기능 개선", "기본/최종 디자인", "UX 개선",
"디자인 도입"처럼 제품 방향·우선순위·화면 톤을 함께 정해야 하는 요청은
구현 요청으로 간주하지 않는다. 이 경우 코드 변경, 브랜치 생성, PR 생성, 머지 준비를 하기 전에
반드시 다음 항목을 사용자와 먼저 정렬한다.

- 목표와 비목표
- 우선 해결할 사용자 불편
- 포함할 기능과 제외할 기능
- 디자인 방향 선택지와 기준
- 첫 PR 범위와 완료 조건

이 정렬이 끝나고 사용자가 구현을 명시적으로 승인한 뒤에만 파일을 수정한다.
동시에 여러 작업이 진행되거나 충돌 위험이 크면 git worktree 격리를 먼저 검토한다.
brainstorming을 수행했다면 대화를 종료하지 않는다. 합의된 목표, 비목표, 성공 조건을 고정한 뒤
즉시 writing-plan, parallel-agent-dispatch, track-start 중 다음 단계를 선택해 진행한다.

### 4.2 리뷰 모드

사용자가 "리뷰"를 요청하면 코드 리뷰어로 동작한다.

- 리팩토링, 기능 구현, 파일 수정은 하지 않는다.
- 변경된 코드를 분석하고 문제점을 리포트한다.
- 발견한 문제는 `파일명:라인번호` 형식으로 명시한다.
- 확신 없는 내용은 추정으로 표시하거나 제외한다.
- 출력은 이 파일의 "리뷰 출력 형식"을 따른다.

---

## 5. Critical Rules

아래 규칙 위반은 리뷰 모드에서 **[CRITICAL]**로 보고한다.
구현 모드에서는 애초에 위반하지 않도록 설계한다.

1. **Domain Entity에 인프라 어노테이션 금지**
   - `@Entity`, `@Column`, `@Table` 등 JPA 어노테이션은 Persistence Entity에만 허용
   - `domain/` 패키지의 클래스는 순수 POJO여야 함
   - Spring 어노테이션(`@Service`, `@Component`)도 `domain/`에 금지

2. **도메인 간 직접 참조 금지**
   - 다른 도메인의 Entity, Repository, Service를 import하지 않음
   - 도메인 간 연결은 `userId` 같은 ID 값으로만
   - 도메인 간 FK(Foreign Key)도 금지

3. **`@Autowired` 필드 주입 금지**
   - 모든 의존성은 생성자 주입(`@RequiredArgsConstructor`) 사용

4. **`throw new RuntimeException()` 금지**
   - 반드시 도메인별 커스텀 예외 사용
   - 커스텀 예외는 `[domain]/error/` 패키지에 정의

5. **동시성 무시 금지**
   - 포인트 차감, 아이템 구매, 좌석 점유 등 상태 변경 로직은 동시성 전략 필수
   - 낙관적 락, 비관적 락, 분산 락 중 선택 이유 명시

6. **check-then-act 멱등성 패턴 금지**
   - `exists()` 확인 후 처리하는 패턴 금지
   - `INSERT ... ON CONFLICT DO NOTHING` 또는 동등한 insert-if-absent 전략으로 보장

7. **비원자적 복합 연산 금지**
   - `incrementAndGet()` 후 별도 `set(0)` 같은 분리 연산 금지
   - `containsKey()` 후 `put()` 대신 `computeIfAbsent`, `merge` 등 원자적 API 사용
   - `ConcurrentHashMap`에 비즈니스 상태 저장 시 재시작/멀티 인스턴스 영향을 주석으로 명시

8. **테스트 없는 기능 완료 금지**
   - 새 기능은 성공 케이스와 실패 케이스 테스트가 필요하다.
   - 테스트를 못 돌렸다면 완료 보고에 이유를 명시한다.

9. **요청되지 않은 추상화 금지**
   - 단발성 코드에 인터페이스, Strategy, Factory, 옵션을 미리 만들지 않는다.
   - 두 번째 실제 사용처가 생긴 뒤 추상화한다.

10. **사용자 요청 밖 코드 변경 금지**
    - 인접 코드 정리, 포매팅, 이름 변경을 끼워 넣지 않는다.
    - 발견한 별도 문제는 보고하고 현재 작업 범위로 가져오지 않는다.

---

## 6. 코딩 컨벤션 체크리스트

### 명명 규칙

| 대상 | 규칙 |
|------|------|
| 클래스 | PascalCase |
| 메서드/변수 | camelCase |
| 상수 | UPPER_SNAKE_CASE |
| DTO 요청 | 행위 + Request (`CreateSpaceRequest`) |
| DTO 응답 | 대상 + Response (`SpaceDetailResponse`) |
| UseCase Port in | 행위 + UseCase (`SendMessageUseCase`) |
| Port out | 행위 + Port (`LoadPointWalletPort`) |
| 테스트 메서드 | 한글 행위 기술 (`포인트_잔액_부족_시_예외가_발생한다`) |

### Port out 메서드 명명

- `ByXxx` 형태 금지: `loadByUserId(X)` 대신 `load(userId)`
- Port 이름이 대상을 선언하므로 메서드명에서 반복하지 않음
- 비즈니스 의도 동사 사용: `isEmailTaken()`, `load()`, `loadAll()`

### DTO

- Java `record` 타입 기본 사용
- Entity를 Controller에서 직접 반환 금지
- Request DTO에 Validation 어노테이션 필수
- Command 변환 메서드명은 `toCommand()`로 통일

### Lombok

- `@Setter` 사용 금지
- `@AllArgsConstructor` 지양, 필요한 경우 `@Builder` 검토
- Persistence Entity에 `@Builder` 금지
- Service, Adapter 생성자 주입에는 `@RequiredArgsConstructor` 사용

### 예외 처리

- `RuntimeException` 직접 사용 금지
- 도메인별 ErrorCode enum 사용
- 에러 코드 형식: `{DOMAIN_PREFIX}_{세자리 숫자}` 예: `IDENTITY_001`

### Service / Controller

- `@Transactional`은 Service 계층에만 둔다.
- 읽기 전용 조회에 `@Transactional(readOnly = true)`를 붙인다.
- Controller는 비즈니스 로직 없이 UseCase에 위임한다.
- API 응답에 비밀번호, 토큰 등 민감 정보를 노출하지 않는다.

### Import

- 와일드카드 import 금지
- 코드 본문에 FQCN 직접 사용 금지

---

## 7. 아키텍처 체크리스트

### 의존 방향

```text
Adapter -> Application -> Domain
```

- Domain은 Application과 Adapter를 모른다.
- Application은 Adapter를 모른다.
- 위반 시 **[CRITICAL]**이다.

### 패키지 위치

| 파일 | 위치 |
|------|------|
| Domain Entity, VO | `[domain]/domain/` |
| ErrorCode, Exception | `[domain]/error/` |
| UseCase Port in | `[domain]/application/port/in/` |
| Repository Port out | `[domain]/application/port/out/` |
| Service | `[domain]/application/service/` |
| Controller, DTO | `[domain]/adapter/in/web/` |
| JPA Entity, Repository | `[domain]/adapter/out/persistence/` |
| Kafka Consumer/Producer | `[domain]/adapter/out/messaging/` |

### global 패키지

- `global/`에는 진짜 cross-cutting만 둔다.
- BaseEntity는 각 도메인 `adapter/out/persistence/`에 둔다.
- `global/security/`는 `AuthenticatedUser`, `UserType`만 허용한다.
- JWT 필터, SecurityConfig, JwtProvider는 `identity/adapter/in/security/`에 둔다.

---

## 8. 테스트 체크리스트

- 새 기능에 테스트 없으면 리뷰 모드에서 **[WARNING]**으로 보고한다.
- 성공 케이스와 실패 케이스가 모두 있어야 한다.
- 테스트 메서드명은 한글 행위 기술을 따른다.
- Mock이 5개를 초과하면 설계 의심 사항으로 언급한다.
- 테스트는 실행 순서나 기존 DB 상태에 의존하지 않아야 한다.

---

## 9. 판단이 필요한 순간

다음 상황은 질문하거나 명시적으로 트레이드오프를 보고한다.

- 비즈니스 엣지케이스가 요구사항에 없다.
- 구현 방식이 2개 이상이고 장단점이 명확하다.
- 기존 구조나 컨벤션과 충돌한다.
- 도메인 간 의존이 새로 생길 수 있다.
- ERD 변경이 필요하다.
- 하네스 구조를 바꾸거나 새 도구를 도입한다.

로컬 네이밍, 테스트 세부 시나리오, 기존 패턴 반복 적용은 스스로 판단한다.

---

## 10. 리뷰 출력 형식

```text
## Codex 코드 리뷰

### [CRITICAL] 아키텍처 위반
> 반드시 수정해야 할 것
> 파일명:라인번호 형식으로 명시

### [WARNING] 컨벤션 위반
> 컨벤션 위반, 개선 권장

### [INFO] 참고 사항
> 선택적 개선, 잠재적 이슈

### LGTM
> 잘 된 부분
```
