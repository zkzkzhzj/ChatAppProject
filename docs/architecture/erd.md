# ERD — 마음의 고향

---

## 1. 설계 원칙

- 각 테이블은 하나의 Bounded Context에 소속된다. 소유권이 명확해야 한다.
- **도메인 간 FK 금지.** 다른 Context의 테이블을 FK로 참조하지 않는다. `user_id` 같은 ID 값만 저장한다. 단, 조회 최적화용 read model이나 분석성 저장소는 예외로 둘 수 있으며, 운영 원천 테이블 간 소유권 FK는 금지한다.
- **도메인 내 FK는 허용.** 같은 Context 안의 테이블 간 FK는 사용한다.
- MESSAGE는 Cassandra에 저장한다. 메시지는 대량 append와 채팅방 단위 히스토리 조회가 핵심이므로 PostgreSQL ERD에서 분리하고 별도 섹션에서 다룬다.
- Domain Entity와 테이블은 1:1 대응이 아닐 수 있다. 이 문서는 테이블(Persistence) 구조를 정의한다.

---

## 2. Context별 테이블 소유권

| Context | 소유 테이블 |
|---------|------------|
| Identity | user, user_social_auth |
| Village | space, space_placement, character*, character_equipment* |
| Economy - Wallet | point_wallet, point_transaction |
| Economy - Inventory | item_definition, user_item_inventory |
| Communication | chat_room, participant, category, chat_room_category |
| Safety | report, sanction |
| Infra | outbox_event, processed_event, idempotency_request |

*\* character, character_equipment는 초기 단순화를 위해 Village에 포함하지만, 아바타 커스터마이제이션이 복잡해지면 Avatar Context로 분리를 검토한다.*

*Wallet Context에서는 user당 wallet 1개를 강한 규칙으로 가진다. point_transaction은 wallet 식별 대신 user_id 기준으로 귀속된다.*

---

## 3. Identity Context

```
USER {
    Long id PK
    Enum type                -- MEMBER / GUEST
    DateTime created_at
    DateTime deleted_at
}

USER_SOCIAL_AUTH {
    Long id PK
    Long user_id FK          -- Identity 내부 FK
    String provider          -- GOOGLE / KAKAO
    String provider_id
    DateTime created_at
    DateTime deleted_at
}

USER ||--|{ USER_SOCIAL_AUTH
```

---

## 4. Village Context

```
SPACE {
    Long id PK
    Long user_id             -- ID 참조 (FK 아님)
    Boolean is_default
    String theme
    DateTime created_at
    DateTime updated_at
}

SPACE_PLACEMENT {
    Long id PK
    Long space_id FK         -- Village 내부 FK
    Long item_definition_id  -- ID 참조 (FK 아님)
    Int position_x
    Int position_y
    DateTime placed_at
}

CHARACTER {
    Long id PK
    Long user_id UNIQUE      -- ID 참조 (FK 아님), USER와 1:1
    DateTime updated_at
}

CHARACTER_EQUIPMENT {
    Long id PK
    Long character_id FK     -- Village 내부 FK
    Long item_definition_id  -- ID 참조 (FK 아님)
    Enum slot                -- HEAD / BODY / ACCESSORY 등
    DateTime equipped_at
}

SPACE ||--o{ SPACE_PLACEMENT  : "1:N"
CHARACTER ||--o{ CHARACTER_EQUIPMENT : "1:0..N"
```

---

## 5. Economy — Wallet

```
POINT_WALLET {
    Long id PK
    Long user_id             -- ID 참조 (FK 아님)
    Long balance
    Long version             -- 낙관적 락
    DateTime updated_at
}

POINT_TRANSACTION {
    Long id PK
    Long user_id             -- ID 참조 (FK 아님)
    Long amount
    Enum type                -- EARN / SPEND
    String reason            -- AD_REWARD / ITEM_PURCHASE / MISSION
    String reference_id      -- 외부 참조 ID (callbackId, idempotencyKey 등)
    DateTime created_at
}
```

---

## 6. Economy — Inventory

```
ITEM_DEFINITION {
    Long id PK
    String name
    Enum category            -- CHARACTER_EQUIP / SPACE_DECOR
    Int price
    String image_url
    DateTime created_at
}

USER_ITEM_INVENTORY {
    Long id PK
    Long user_id             -- ID 참조 (FK 아님)
    Long item_definition_id FK  -- Inventory 내부 FK
    DateTime acquired_at
}

ITEM_DEFINITION ||--|{ USER_ITEM_INVENTORY
```

---

## 7. Communication — PostgreSQL

```
CHAT_ROOM {
    Long id PK
    String title
    Enum type                -- DIRECT / GROUP / NPC
    Enum status              -- ACTIVE / CLOSED
    DateTime created_at
    DateTime closed_at
}

PARTICIPANT {
    Long id PK
    Long user_id             -- ID 참조 (FK 아님)
    Long chat_room_id FK     -- Communication 내부 FK
    String display_name
    Enum participant_role    -- HOST / MEMBER / NPC
    Enum entry_type          -- PROXIMITY / INVITE / SYSTEM
    DateTime joined_at
    DateTime left_at
}

CATEGORY {
    Long id PK
    String name
    DateTime created_at
}

CHAT_ROOM_CATEGORY {
    Long chat_room_id FK
    Long category_id FK
    PRIMARY KEY (chat_room_id, category_id)
}

CHAT_ROOM ||--|{ PARTICIPANT
CHAT_ROOM ||--|{ CHAT_ROOM_CATEGORY
CATEGORY ||--o{ CHAT_ROOM_CATEGORY
```

---

## 8. Communication — Cassandra (MESSAGE)

Cassandra에 저장. write-heavy 특성과 고정된 조회 패턴에 적합.

```
MESSAGE {
    UUID id                  -- TimeUUID 권장
    Long chat_room_id        -- Partition Key
    Long participant_id
    String body
    Enum message_type        -- TEXT / IMAGE / SYSTEM
    Timestamp created_at     -- Clustering Key (DESC)
}

Primary Key: ((chat_room_id), created_at, id)
Clustering Key: created_at DESC, id DESC
```

동일 timestamp 충돌을 방지하기 위해 clustering key에 `id`(TimeUUID)를 포함한다.

메시지에는 `participant_id`만 저장한다. 발신자 닉네임은 메시지 조회 시 `participant_id`로 현재 닉네임을 조회하여 표시한다. 닉네임을 변경하면 과거 메시지도 새 닉네임으로 보인다. 신고/감사 추적은 `participant_id`로 수행한다.

**조회:** `WHERE chat_room_id = ? ORDER BY created_at DESC LIMIT ?`

---

## 9. Safety Context

```
REPORT {
    Long id PK
    Long reporter_user_id    -- ID 참조
    Long target_user_id      -- ID 참조
    UUID message_id          -- MESSAGE UUID 참조 (nullable, Cassandra)
    Enum reason              -- ABUSE / SEXUAL / SPAM / PERSONAL_INFO / OTHER
    String detail
    DateTime created_at
}

SANCTION {
    Long id PK
    Long user_id             -- ID 참조
    Enum type                -- WARNING / CHAT_RESTRICT / SUSPEND / PERMANENT_BAN
    String reason
    DateTime started_at
    DateTime ended_at        -- nullable
    DateTime created_at
}
```

---

## 10. 인프라 테이블

```
OUTBOX_EVENT {
    Long id PK
    String aggregate_id
    String event_type
    UUID event_id UNIQUE
    JSONB payload
    Enum status              -- PENDING / PUBLISHED / FAILED
    Int retry_count DEFAULT 0
    DateTime occurred_at
    DateTime published_at
}

PROCESSED_EVENT {
    Long id PK
    UUID event_id UNIQUE
    DateTime processed_at
}

IDEMPOTENCY_REQUEST {
    Long id PK
    Long user_id
    String idempotency_key
    JSONB result
    DateTime created_at
    UNIQUE (user_id, idempotency_key)
}
```

---

## 11. 기존 ERD 대비 변경 요약

| 항목 | 기존 | 변경 후 | 이유 |
|------|------|---------|------|
| SPACE_ITEM | inventory_id FK | SPACE_PLACEMENT + item_definition_id (ID 참조) | 이름 변경 + 도메인 간 FK 제거 |
| CHARACTER_ITEM | inventory_id FK | CHARACTER_EQUIPMENT + item_definition_id (ID 참조) | 이름 변경 + 도메인 간 FK 제거 |
| ITEM | 이름 | ITEM_DEFINITION | 카탈로그 역할 명확히 |
| POINT_WALLET | version 없음 | version 추가 | 낙관적 락 |
| POINT_TRANSACTION | reference_id Long | reference_id String | 외부 시스템 문자열 ID 수용 |
| PARTICIPANT | display_character_id, display_space_id 존재 | 제거 | Village에서 조회. 데이터 복제 방지 |
| MESSAGE | PostgreSQL | Cassandra | write-heavy, 고정 조회 패턴 |
| MESSAGE | deleted_at 존재 | 제거 | 메시지 수정/삭제 없음 |
| ACCESS_LOG | 존재 | 제거 | 서버 로그로 충분 |
| REPORT, SANCTION | 없음 | 신규 | Safety Context |
| OUTBOX 등 | 없음 | 신규 | 멱등성, Outbox 인프라 |
| CHARACTER.user_id | 제약 없음 | UNIQUE 추가 | USER와 1:1 관계 확정 |

---

## 12. 전체 관계 카디널리티 요약

> Mermaid 다이어그램: `/docs/architecture/erd.mermaid`

### Context 내부 FK 관계

| 테이블 A | 관계 | 테이블 B | 비고 |
|---------|------|---------|------|
| USER | 1 : 0..N | USER_SOCIAL_AUTH | 소셜 로그인 미연동 유저 존재 가능 |
| CHARACTER | 1 : 0..N | CHARACTER_EQUIPMENT | 아이템 미착용 캐릭터 존재 가능 |
| SPACE | 1 : 0..N | SPACE_PLACEMENT | 빈 공간 존재 가능 |
| ITEM_DEFINITION | 1 : 0..N | USER_ITEM_INVENTORY | 아무도 구매 안 한 아이템 존재 가능 |
| CHAT_ROOM | 1 : 1..N | PARTICIPANT | 참여자 없는 채팅방은 존재하지 않음 |
| CHAT_ROOM | 1 : 0..N | CHAT_ROOM_CATEGORY | 카테고리 미분류 채팅방 존재 가능 |
| CATEGORY | 1 : 0..N | CHAT_ROOM_CATEGORY | |

### 도메인 간 ID 참조 (FK 아님, 논리적 관계)

| 테이블 | 컬럼 | 참조 대상 | 카디널리티 | 비고 |
|--------|------|----------|-----------|------|
| CHARACTER | user_id | USER.id | 1:1 | UNIQUE 제약 |
| SPACE | user_id | USER.id | N:1 | 유저당 다수 공간 가능, is_default로 기본 공간 식별 |
| POINT_WALLET | user_id | USER.id | 1:1 | 유저당 지갑 1개 강한 규칙 |
| POINT_TRANSACTION | user_id | USER.id | N:1 | |
| USER_ITEM_INVENTORY | user_id | USER.id | N:1 | |
| CHARACTER_EQUIPMENT | item_definition_id | ITEM_DEFINITION.id | N:1 | 아이템 중복 장착 슬롯별 1개 |
| SPACE_PLACEMENT | item_definition_id | ITEM_DEFINITION.id | N:1 | 동일 아이템 무제한 배치 가능 |
| PARTICIPANT | user_id | USER.id | N:1 | NPC일 경우 null 가능 |

### 아이템 장착/배치 설계 결정 기록

- `CHARACTER_EQUIPMENT`와 `SPACE_PLACEMENT`는 `USER_ITEM_INVENTORY`를 직접 참조하지 않는다.
- **이유**: Economy Context와 Village Context 간 도메인 경계 유지. "소유 검증"은 장착/배치 시점에 애플리케이션 레이어에서 수행.
- **전제**: 아이템은 소모재가 아닌 소유재. 한 번 구매하면 인벤토리에서 사라지지 않으며, 장착/배치는 아이템 복사본을 만드는 개념이 아니라 "어떤 아이템을 표시할지" 선택하는 행위.
- **수량 제한 없음**: `SPACE_PLACEMENT`에서 동일 `item_definition_id`를 여러 행에 걸쳐 배치 가능.

### POINT_WALLET 분리 설계 결정 기록

- `POINT_TRANSACTION`만으로 잔액을 관리하지 않고 `POINT_WALLET`을 별도로 유지한다.
- **이유 1 — 동시성**: `POINT_TRANSACTION`에서 `SUM(amount)`를 기반으로 잔액을 체크하면 check-then-act 사이에 레이스 컨디션이 발생한다. `POINT_WALLET.version`을 이용한 낙관적 락으로 `UPDATE ... WHERE version = ? AND balance >= ?` 단일 쿼리로 원자적 차감이 가능하다.
- **이유 2 — 조회 성능**: 트랜잭션이 누적될수록 `SUM` 집계 쿼리가 느려진다. `POINT_WALLET`은 현재 잔액의 스냅샷으로 O(1) 조회를 보장한다.
- **역할 분리**: `POINT_WALLET`은 현재 잔액 + 동시성 제어 지점, `POINT_TRANSACTION`은 감사 로그 + 원천 데이터. POINT_WALLET이 틀어지면 POINT_TRANSACTION으로 재계산하여 복구 가능하다.