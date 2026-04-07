-- =============================================================================
-- V1__initial_schema.sql
-- 마음의 고향 — 초기 스키마
-- ERD 기준: /docs/architecture/erd.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identity Context
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(20)  NOT NULL,                          -- MEMBER / GUEST
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE TABLE user_local_auth (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL UNIQUE REFERENCES users(id),
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP
);

CREATE TABLE user_social_auth (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    provider    VARCHAR(20)  NOT NULL,                          -- GOOGLE / KAKAO
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE (provider, provider_id)
);

-- -----------------------------------------------------------------------------
-- Village Context
-- -----------------------------------------------------------------------------

CREATE TABLE space (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL,                          -- ID 참조 (FK 아님)
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    theme       VARCHAR(50)  NOT NULL DEFAULT 'DEFAULT',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_space_user_id ON space(user_id);

CREATE TABLE space_placement (
    id                 BIGSERIAL PRIMARY KEY,
    space_id           BIGINT    NOT NULL REFERENCES space(id),
    item_definition_id BIGINT    NOT NULL,                      -- ID 참조 (FK 아님)
    position_x         INT       NOT NULL,
    position_y         INT       NOT NULL,
    placed_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE character (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL UNIQUE,                      -- USER와 1:1, ID 참조 (FK 아님)
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE character_equipment (
    id                 BIGSERIAL PRIMARY KEY,
    character_id       BIGINT    NOT NULL REFERENCES character(id),
    item_definition_id BIGINT    NOT NULL,                      -- ID 참조 (FK 아님)
    slot               VARCHAR(30) NOT NULL,                    -- HEAD / BODY / ACCESSORY
    equipped_at        TIMESTAMP  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Economy Context — Wallet
-- -----------------------------------------------------------------------------

CREATE TABLE point_wallet (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL UNIQUE,                      -- 유저당 지갑 1개 강한 규칙
    balance     BIGINT    NOT NULL DEFAULT 0,
    version     BIGINT    NOT NULL DEFAULT 0,                   -- 낙관적 락
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE point_transaction (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL,                         -- ID 참조 (FK 아님)
    amount       BIGINT       NOT NULL,
    type         VARCHAR(10)  NOT NULL,                         -- EARN / SPEND
    reason       VARCHAR(50)  NOT NULL,                         -- AD_REWARD / ITEM_PURCHASE / MISSION
    reference_id VARCHAR(255),                                  -- 외부 참조 ID (멱등성 키 등)
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_point_transaction_user_id ON point_transaction(user_id);

-- -----------------------------------------------------------------------------
-- Economy Context — Inventory
-- -----------------------------------------------------------------------------

CREATE TABLE item_definition (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(30)  NOT NULL,                          -- CHARACTER_EQUIP / SPACE_DECOR
    price       INT          NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE user_item_inventory (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT    NOT NULL,                      -- ID 참조 (FK 아님)
    item_definition_id BIGINT    NOT NULL REFERENCES item_definition(id),
    acquired_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_item_inventory_user_id ON user_item_inventory(user_id);

-- -----------------------------------------------------------------------------
-- Communication Context
-- -----------------------------------------------------------------------------

CREATE TABLE category (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_room (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    type        VARCHAR(20)  NOT NULL,                          -- DIRECT / GROUP / NPC
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',         -- ACTIVE / CLOSED
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    closed_at   TIMESTAMP
);

CREATE TABLE chat_room_category (
    chat_room_id BIGINT NOT NULL REFERENCES chat_room(id),
    category_id  BIGINT NOT NULL REFERENCES category(id),
    PRIMARY KEY (chat_room_id, category_id)
);

CREATE TABLE participant (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       ,                             -- ID 참조 (FK 아님), NPC면 NULL 가능
    chat_room_id     BIGINT       NOT NULL REFERENCES chat_room(id),
    display_name     VARCHAR(100) NOT NULL,
    participant_role VARCHAR(20)  NOT NULL,                     -- HOST / MEMBER / NPC
    entry_type       VARCHAR(20)  NOT NULL,                     -- PROXIMITY / INVITE / SYSTEM
    joined_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    left_at          TIMESTAMP
);

CREATE INDEX idx_participant_chat_room_id ON participant(chat_room_id);
CREATE INDEX idx_participant_user_id ON participant(user_id);

-- -----------------------------------------------------------------------------
-- Safety Context
-- -----------------------------------------------------------------------------

CREATE TABLE report (
    id               BIGSERIAL PRIMARY KEY,
    reporter_user_id BIGINT       NOT NULL,
    target_user_id   BIGINT       NOT NULL,
    message_id       UUID,                                      -- Cassandra MESSAGE UUID (nullable)
    reason           VARCHAR(30)  NOT NULL,                     -- ABUSE / SEXUAL / SPAM / PERSONAL_INFO / OTHER
    detail           TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE sanction (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    type        VARCHAR(30)  NOT NULL,                          -- WARNING / CHAT_RESTRICT / SUSPEND / PERMANENT_BAN
    reason      TEXT         NOT NULL,
    started_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sanction_user_id ON sanction(user_id);

-- -----------------------------------------------------------------------------
-- Infra Tables
-- -----------------------------------------------------------------------------

CREATE TABLE outbox_event (
    id           BIGSERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    event_id     UUID         NOT NULL UNIQUE,
    payload      JSONB        NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',       -- PENDING / PUBLISHED / FAILED
    retry_count  INT          NOT NULL DEFAULT 0,
    occurred_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_outbox_event_status ON outbox_event(status);

CREATE TABLE processed_event (
    id           BIGSERIAL PRIMARY KEY,
    event_id     UUID      NOT NULL UNIQUE,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE idempotency_request (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    idempotency_key  VARCHAR(255) NOT NULL,
    result           JSONB,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);
