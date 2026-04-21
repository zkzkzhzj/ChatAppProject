# Package Structure — 마음의 고향

---

## 1. 최상위 구조

```text
com.maeum.gohyang
├── communication/       # Core — 채팅, 메시지, 참여자 ✅
├── village/             # Core — 공간, 위치, 캐릭터, NPC ✅
├── economy/             # Core — 포인트(Wallet) + 아이템(Inventory) (미구현, Phase 4 예정)
│   ├── wallet/          # 서브 도메인 — 포인트 지갑, 거래
│   └── inventory/       # 서브 도메인 — 아이템, 인벤토리
├── safety/              # Support — 신고, 제재 (미구현, Phase 7 예정)
├── identity/            # Generic — 인증/인가, 게스트 세션, Security 설정 ✅
├── notification/        # 인프라 서비스 — 이벤트 구독 기반 알림 발송 (미구현, Phase 6 예정)
└── global/              # 최소한의 cross-cutting만 ✅
    ├── config/          # Spring Configuration (WebSocket, Kafka, Redis 등)
    └── error/           # GlobalExceptionHandler, 커스텀 예외 베이스 클래스
```

---

## 2. 도메인 내부 구조 (헥사고날)

모든 도메인은 동일한 내부 구조를 따른다.

```text
[domain]/
├── domain/              # 순수 비즈니스 규칙 (POJO)
│   ├── Entity
│   ├── VO (Value Object)
│   ├── DomainService
│   └── DomainEvent
├── error/               # 이 도메인이 던지는 에러 정의
│   ├── *ErrorCode       # 에러 코드 enum (code, message, HttpStatus)
│   └── *Exception       # BusinessException 구현체
├── application/         # 유스케이스 조율
│   ├── port/
│   │   ├── in/          # Driving Port (UseCase 인터페이스)
│   │   └── out/         # Driven Port (Repository, Messaging 등)
│   └── service/         # UseCase 구현체
└── adapter/             # 기술 구현
    ├── in/
    │   ├── web/         # Controller, Request/Response DTO
    │   ├── websocket/   # WebSocket Handler (해당 도메인만)
    │   └── messaging/   # Kafka Consumer (이벤트 수신)
    └── out/
        ├── persistence/ # JPA Entity, Repository 구현체, Mapper
        ├── messaging/   # Kafka Producer, WebSocket broadcast
        ├── npc/         # 외부 LLM 연동 (Communication 도메인 전용)
        └── external/    # 기타 외부 API 연동
```

`error/`는 헥사고날 3계층(`domain`, `application`, `adapter`) 밖에 위치하지만 해당 bounded context 안에 있다.
에러 조건(DUPLICATE_EMAIL, GUEST_CHAT_NOT_ALLOWED 등)은 도메인 규칙이지만, `ErrorCode`가 `HttpStatus`를 포함하므로 순수 도메인(`domain/`)과 분리한다.
`application`과 `adapter` 양쪽에서 모두 참조된다.

---

## 3. 구체 예시 — Economy (Wallet + Inventory) [설계 초안, 미구현]

> 아래는 Phase 4에서 구현 예정인 Economy 도메인의 **설계 초안**이다. 현재 코드베이스에는 존재하지 않는다.

```text
economy/
├── wallet/
│   ├── domain/
│   │   ├── PointWallet.java
│   │   └── PointTransaction.java
│   ├── error/
│   │   ├── WalletErrorCode.java
│   │   └── InsufficientBalanceException.java
│   ├── application/
│   │   ├── port/
│   │   │   ├── in/
│   │   │   │   ├── EarnPointUseCase.java
│   │   │   │   └── DeductPointUseCase.java
│   │   │   └── out/
│   │   │       ├── PointWalletPersistencePort.java
│   │   │       └── IdempotencyPort.java
│   │   └── service/
│   │       ├── EarnPointService.java
│   │       └── DeductPointService.java
│   └── adapter/
│       ├── in/web/
│       │   ├── PointController.java
│       │   ├── EarnPointRequest.java
│       │   └── PointBalanceResponse.java
│       └── out/persistence/
│           ├── PointWalletJpaEntity.java
│           ├── PointWalletJpaRepository.java
│           ├── PointWalletJpaAdapter.java
│           └── PointWalletMapper.java
├── inventory/
│   ├── domain/
│   │   ├── ItemDefinition.java
│   │   ├── OwnedItem.java
│   │   └── Inventory.java
│   ├── application/
│   │   ├── port/
│   │   │   ├── in/
│   │   │   │   └── LoadItemListUseCase.java
│   │   │   └── out/
│   │   │       └── InventoryPersistencePort.java
│   │   └── service/
│   │       └── LoadItemListService.java
│   └── adapter/
│       ├── in/web/
│       │   ├── ItemController.java
│       │   └── ItemListResponse.java
│       └── out/persistence/
│           ├── ItemDefinitionJpaEntity.java
│           ├── OwnedItemJpaEntity.java
│           ├── InventoryJpaAdapter.java
│           └── InventoryMapper.java
└── purchase/
    └── application/
        ├── port/in/
        │   └── PurchaseItemUseCase.java
        └── service/
            └── PurchaseItemService.java  # Wallet + Inventory 조율
```

`purchase/`는 Wallet과 Inventory를 조율하는 Application Service만 존재한다. 자체 도메인 모델이 없다. 구매는 프로세스이지 도메인이 아니기 때문이다.

---

## 4. global/ 패키지

**global/에는 진짜 cross-cutting만 남긴다.** 도메인에 속하지 않으면서, 특정 도메인으로 이동시킬 수도 없는 것만 여기에 둔다.

```text
global/
├── config/              # Spring Configuration
│   ├── WebSocketConfig              # STOMP/SockJS 설정 (브로커, 엔드포인트)
│   ├── StompAuthChannelInterceptor  # STOMP CONNECT JWT 인증 (ChannelInterceptor)
│   ├── StompErrorHandler            # STOMP 에러 핸들링
│   ├── CassandraConfig              # Cassandra 설정
│   ├── KafkaConsumerConfig          # Kafka 컨슈머 에러 핸들링/재시도 설정
│   ├── AsyncConfig                  # @Async 스레드풀 설정
│   └── OpenApiConfig                # Swagger/OpenAPI 설정
├── error/               # GlobalExceptionHandler, 커스텀 예외 베이스 클래스
├── alert/               # AlertPort, LogAlertAdapter — 운영 알람 (개발자/운영팀 향)
├── infra/
│   ├── outbox/          # OutboxJpaEntity, OutboxKafkaRelay, KafkaEventIdExtractor — Transactional Outbox 인프라
│   └── idempotency/     # ProcessedEventJpaEntity, IdempotencyGuard — Kafka 컨슈머 멱등성
└── security/            # AuthenticatedUser, UserType — 도메인 간 공유되는 인증 타입만
```

`global/security/`에 넣는 기준: **모든 도메인의 Controller가 `@AuthenticationPrincipal`로 참조해야 하는 타입만.** JWT 필터, Security 설정 같은 인프라 구현은 여전히 `identity/adapter/in/security/`에 있다.

### 4.1 global/에 넣으면 안 되는 것

- **BaseEntity** — JPA Auditing(`createdAt`, `updatedAt`)을 Domain Entity가 상속하면 도메인이 JPA에 종속된다. Persistence Entity에서만 사용하고, 각 도메인의 `adapter/out/persistence/` 안에 둔다.
- **도메인 이벤트 헬퍼** — 이벤트 발행/구독 유틸을 global에 두면 도메인 규칙까지 global에서 처리하게 된다. 각 도메인의 `adapter/out/messaging/`에 둔다.
- **"여기저기서 쓰니까"라는 이유만으로 넣는 클래스** — 주인 못 찾은 유틸, 임시 DTO, 공통 enum은 global이 아니라 해당 도메인에 둔다. 정말 공통이라면 그 이유를 설명할 수 있어야 한다.

### 4.2 이동된 패키지

- **security/ (인프라)** → `identity/adapter/in/security/`로 이동. JWT 필터, SecurityConfig, JwtProvider는 인증/인가 도메인의 인프라 구현이다.
- **security/ (공유 타입)** → `global/security/`에 위치. `AuthenticatedUser`, `UserType`은 모든 도메인 Controller에서 `@AuthenticationPrincipal`로 사용되므로 global에 둔다. identity에 두면 village, economy 등이 identity에 직접 의존하게 된다.
- **notification/** → 최상위 독립 모듈로 승격. 현재는 단순 이벤트 구독 → FCM 발송이지만, 알림 수신 설정, 재시도 정책, 중복 발송 방지 등 자체 정책이 생길 가능성이 높다. global에 묻어두면 나중에 분리하기 어렵다.

---

## 5. 변경 이유

이 구조에서 초기 설계 대비 변경된 부분과 그 이유를 기록한다.

**global/ 범위 축소 (config, error만 남김)**
초기에는 `security/`, `notification/`, `common/`이 global에 있었다. 그러나 global이 커지면 "주인 없는 코드의 쓰레기통"이 되어 도메인 경계를 녹인다. 실무에서 global/common이 비대해지면서 도메인 모델이 공통 클래스에 의존하게 되는 안티패턴이 빈번하다. 이를 방지하기 위해 global은 순수 cross-cutting(설정, 예외 핸들링)만 남기고, 나머지는 소유권이 명확한 곳으로 이동시켰다.

**security/ → identity/ 이동**
Security 설정과 JWT 필터는 "인증/인가"라는 비즈니스 맥락에 속한다. global에 두면 identity 도메인과 security 설정의 소유권이 분리되어, 변경 시 두 곳을 동시에 건드려야 한다.

**notification/ → 최상위 독립 모듈 승격**
알림은 현재 단순 인프라이지만, 유저 선호 설정, 재시도, 중복 발송 방지 등 자체 정책이 추가될 가능성이 높다. global 안에 묻어두면 정책이 추가될 때 분리 비용이 크다. 처음부터 독립시켜두면 성장 경로가 열려있다.

**common/ 제거**
BaseEntity는 Persistence Entity에서만 필요하므로 각 도메인의 persistence 패키지에 둔다. 공통 유틸은 정말 필요한 경우에만 global에 추가하되, 추가 전에 "이게 특정 도메인에 속할 수 없는가?"를 먼저 검토한다.
