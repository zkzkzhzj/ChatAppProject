# ERD - 마음의 고향

---

## 1. 설계 원칙

- 각 테이블은 하나의 Bounded Context에 속한다.
- 도메인 간 FK는 만들지 않는다. 다른 Context의 식별자는 `user_id` 같은 ID 값으로만 저장한다.
- 같은 Context 내부 FK는 허용한다.
- Domain Entity와 Persistence Table은 1:1 대응이 아닐 수 있다. 이 문서는 물리 저장 구조를 설명한다.
- 마을/도서관의 기본 아바타, RemotePlayer, 위치 공유 상태는 WebSocket 런타임 상태이며 DB에 저장하지 않는다.
- 사서 RAG는 Confession/Library의 사적 데이터 경계다. 아직 구현되지 않은 구체 테이블을 현재 ERD에 선언하지 않는다.

---

## 2. Context별 테이블 소유권

| Context | 소유 테이블 |
|---------|-------------|
| Identity | users, user_local_auth, user_social_auth |
| Village | daily_visit, suggestion |
| Communication | chat_room, participant, category, chat_room_category, message, user_message |
| Confession / Library | confession_record, confession_letter, confession_thank_reply, confession_reaction, confession_report |
| Safety | report, sanction |
| Infra | outbox_event, processed_event, idempotency_request |

Village는 저장형 사용자별 장면이나 아바타 설정을 소유하지 않는다. 저장되는 Village 데이터는 방문 집계, 건의, 대시보드 조회에 필요한 최소 데이터다.

---

## 3. Identity Context

```text
USERS {
    Long id PK
    Enum type                -- MEMBER / GUEST
    DateTime created_at
    DateTime deleted_at
}

USER_LOCAL_AUTH {
    Long id PK
    Long user_id FK UNIQUE   -- Identity 내부 FK, USERS와 1:1
    String email UNIQUE
    String password_hash
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
    UNIQUE (provider, provider_id)
}

USERS ||--o| USER_LOCAL_AUTH
USERS ||--|{ USER_SOCIAL_AUTH
```

---

## 4. Village Context

```text
DAILY_VISIT {
    Long id PK
    Date visit_date
    String visitor_key       -- MEMBER: user-{userId}, GUEST: guest-{UUID}
    String visitor_type      -- MEMBER / GUEST
    DateTime created_at
    UNIQUE (visit_date, visitor_key)
}

SUGGESTION {
    Long id PK
    String author_key        -- MEMBER: user-{userId}, GUEST: guest-{UUID}
    String author_type       -- MEMBER / GUEST
    String title             -- varchar(120)
    String body              -- varchar(1000)
    String status            -- OPEN / DONE
    String admin_comment     -- nullable
    DateTime created_at
    DateTime updated_at
}
```

`daily_visit`는 하루 방문 중복 방지를 위해 `(visit_date, visitor_key)` unique와 insert-if-absent 전략을 사용한다. 마을 대시보드의 오늘 고백 수는 `confession_record.created_at`을 KST 날짜 범위로 조회하는 read model이며, 도메인 간 FK를 만들지 않는다.

---

## 5. Communication - PostgreSQL

```text
CHAT_ROOM {
    Long id PK
    String title
    Enum type                -- PUBLIC / DIRECT / GROUP
    Enum status              -- ACTIVE / CLOSED
    DateTime created_at
    DateTime closed_at
}

PARTICIPANT {
    Long id PK
    Long user_id             -- ID reference only, no FK to Identity
    Long chat_room_id FK     -- Communication context FK
    String display_name
    Enum participant_role    -- HOST / MEMBER
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

일반 채팅 메시지는 사서 RAG의 장기 기억으로 사용하지 않는다.

---

## 6. Communication - Cassandra

```text
MESSAGE {
    UUID id                  -- TimeUUID 권장
    Long chat_room_id        -- Partition Key
    Long participant_id
    String body
    Enum message_type        -- TEXT / IMAGE / SYSTEM
    Timestamp created_at     -- Clustering Key DESC
}

Primary Key: ((chat_room_id), created_at, id)
Clustering Key: created_at DESC, id DESC
```

```text
USER_MESSAGE {
    Long chat_room_id        -- Partition Key
    Long user_id             -- Partition Key
    UUID id                  -- TimeUUID
    Long participant_id
    String body
    Enum message_type        -- TEXT / IMAGE / SYSTEM
    Timestamp created_at     -- Clustering Key DESC
}

Primary Key: ((chat_room_id, user_id), created_at, id)
Clustering Key: created_at DESC, id DESC
```

---

## 7. Confession / Library Context

```text
CONFESSION_RECORD {
    Long id PK
    Long author_user_id      -- ID reference only, no FK to Identity
    String title             -- varchar(120)
    String body              -- varchar(3000)
    String bookshelf         -- varchar(50)
    String status            -- varchar(50)
    String risk_level        -- varchar(50)
    DateTime created_at
    DateTime updated_at
}

CONFESSION_LETTER {
    Long id PK
    Long confession_id FK    -- Confession context FK
    Long sender_user_id      -- ID reference only, no FK to Identity
    String body              -- varchar(1500)
    String status            -- varchar(50)
    DateTime created_at
    DateTime author_read_at  -- nullable
}

CONFESSION_THANK_REPLY {
    Long id PK
    Long letter_id FK UNIQUE -- Confession context FK
    Long author_user_id      -- ID reference only, no FK to Identity
    String body              -- varchar(500)
    DateTime created_at
}

CONFESSION_REACTION {
    Long id PK
    Long confession_id FK    -- Confession context FK
    Long user_id             -- ID reference only, no FK to Identity
    String reaction_type     -- varchar(50)
    DateTime created_at
    UNIQUE (confession_id, user_id, reaction_type)
}

CONFESSION_REPORT {
    Long id PK
    Long confession_id FK    -- Confession context FK
    Long reporter_user_id    -- ID reference only, no FK to Identity
    String reason            -- varchar(50)
    DateTime created_at
    UNIQUE (confession_id, reporter_user_id)
}

CONFESSION_RECORD ||--o{ CONFESSION_LETTER
CONFESSION_LETTER ||--o| CONFESSION_THANK_REPLY
CONFESSION_RECORD ||--o{ CONFESSION_REACTION
CONFESSION_RECORD ||--o{ CONFESSION_REPORT
```

사서 RAG는 이 Context의 사적 데이터 경계를 따른다. 벡터 저장소나 색인 테이블은 실제 구현이 들어올 때 별도 설계한다.

---

## 8. Safety Context

```text
REPORT {
    Long id PK
    Long reporter_user_id    -- ID reference only
    Long target_user_id      -- ID reference only
    UUID message_id          -- Cassandra MESSAGE UUID reference, nullable
    Enum reason              -- ABUSE / SEXUAL / SPAM / PERSONAL_INFO / OTHER
    String detail
    DateTime created_at
}

SANCTION {
    Long id PK
    Long user_id             -- ID reference only
    Enum type                -- WARNING / CHAT_RESTRICT / SUSPEND / PERMANENT_BAN
    String reason
    DateTime started_at
    DateTime ended_at        -- nullable
    DateTime created_at
}
```

---

## 9. Infra Tables

```text
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

## 10. 전체 관계 요약

> Mermaid 다이어그램: `docs/architecture/erd.mermaid`

### Context 내부 FK 관계

| 테이블 A | 관계 | 테이블 B | 비고 |
|----------|------|----------|------|
| USERS | 1 : 0..1 | USER_LOCAL_AUTH | 로컬 인증이 없을 수 있음 |
| USERS | 1 : 0..N | USER_SOCIAL_AUTH | 소셜 인증 수단 |
| CHAT_ROOM | 1 : 1..N | PARTICIPANT | 참여자 없는 채팅방은 없음 |
| CHAT_ROOM | 1 : 0..N | CHAT_ROOM_CATEGORY | 카테고리 태깅 |
| CATEGORY | 1 : 0..N | CHAT_ROOM_CATEGORY | 카테고리 사용 |
| CONFESSION_RECORD | 1 : 0..N | CONFESSION_LETTER | 고백에 도착한 편지 |
| CONFESSION_LETTER | 1 : 0..1 | CONFESSION_THANK_REPLY | 편지당 감사 답장 하나 |
| CONFESSION_RECORD | 1 : 0..N | CONFESSION_REACTION | 반응 |
| CONFESSION_RECORD | 1 : 0..N | CONFESSION_REPORT | 신고 |

### 도메인 간 ID 참조

| 테이블 | 컬럼 | 참조 대상 | 비고 |
|--------|------|-----------|------|
| PARTICIPANT | user_id | USERS.id | FK 없음 |
| CONFESSION_RECORD | author_user_id | USERS.id | FK 없음 |
| CONFESSION_LETTER | sender_user_id | USERS.id | FK 없음 |
| CONFESSION_THANK_REPLY | author_user_id | USERS.id | FK 없음 |
| CONFESSION_REACTION | user_id | USERS.id | FK 없음 |
| CONFESSION_REPORT | reporter_user_id | USERS.id | FK 없음 |
| REPORT | reporter_user_id, target_user_id | USERS.id | FK 없음 |
| SANCTION | user_id | USERS.id | FK 없음 |
