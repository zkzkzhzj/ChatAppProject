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
    Long user_id             -- ID 참조 (FK 아님)
    DateTime updated_at
}

CHARACTER_EQUIPMENT {
    Long id PK
    Long character_id FK     -- Village 내부 FK
    Long item_definition_id  -- ID 참조 (FK 아님)
    Enum slot                -- HEAD / BODY / ACCESSORY 등
    DateTime equipped_at
}

SPACE ||--|{ SPACE_PLACEMENT
CHARACTER ||--|{ CHARACTER_EQUIPMENT
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