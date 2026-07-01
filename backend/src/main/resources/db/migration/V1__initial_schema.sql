-- =============================================================================
-- V1__initial_schema.sql
-- 마음의 고향 — reset baseline schema
-- 기존 로컬/개발 DB 데이터와 Flyway history는 보존하지 않는다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identity Context
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(20) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
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
    provider    VARCHAR(20)  NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP,
    UNIQUE (provider, provider_id)
);

-- -----------------------------------------------------------------------------
-- Communication Context
-- -----------------------------------------------------------------------------

CREATE TABLE category (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_room (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    closed_at  TIMESTAMP
);

CREATE TABLE chat_room_category (
    chat_room_id BIGINT NOT NULL REFERENCES chat_room(id),
    category_id  BIGINT NOT NULL REFERENCES category(id),
    PRIMARY KEY (chat_room_id, category_id)
);

CREATE TABLE participant (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT,
    chat_room_id     BIGINT       NOT NULL REFERENCES chat_room(id),
    display_name     VARCHAR(100) NOT NULL,
    participant_role VARCHAR(20)  NOT NULL,
    entry_type       VARCHAR(20)  NOT NULL,
    joined_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    left_at          TIMESTAMP,
    CONSTRAINT uk_participant_user_chatroom UNIQUE (user_id, chat_room_id)
);

CREATE INDEX idx_participant_chat_room_id ON participant(chat_room_id);
CREATE INDEX idx_participant_user_id ON participant(user_id);

INSERT INTO chat_room (id, title, type, status)
VALUES (1, '마을 광장', 'PUBLIC', 'ACTIVE');

SELECT setval('chat_room_id_seq', 1, true);

-- -----------------------------------------------------------------------------
-- Safety Context
-- -----------------------------------------------------------------------------

CREATE TABLE report (
    id               BIGSERIAL PRIMARY KEY,
    reporter_user_id BIGINT      NOT NULL,
    target_user_id   BIGINT      NOT NULL,
    message_id       UUID,
    reason           VARCHAR(30) NOT NULL,
    detail           TEXT,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE sanction (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    type       VARCHAR(30) NOT NULL,
    reason     TEXT        NOT NULL,
    started_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    ended_at   TIMESTAMP,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sanction_user_id ON sanction(user_id);

-- -----------------------------------------------------------------------------
-- Confession Context
-- -----------------------------------------------------------------------------

CREATE TABLE confession_record (
    id             BIGSERIAL PRIMARY KEY,
    author_user_id BIGINT        NOT NULL,
    title          VARCHAR(120)  NOT NULL,
    body           VARCHAR(3000) NOT NULL,
    bookshelf      VARCHAR(50)   NOT NULL,
    status         VARCHAR(50)   NOT NULL,
    risk_level     VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confession_record_author_user_id ON confession_record(author_user_id);
CREATE INDEX idx_confession_record_status_created_at
    ON confession_record(status, created_at DESC);
CREATE INDEX idx_confession_record_bookshelf_status_created_at
    ON confession_record(bookshelf, status, created_at DESC);

CREATE TABLE confession_letter (
    id             BIGSERIAL PRIMARY KEY,
    confession_id  BIGINT        NOT NULL REFERENCES confession_record(id),
    sender_user_id BIGINT        NOT NULL,
    body           VARCHAR(1500) NOT NULL,
    status         VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    author_read_at TIMESTAMP
);

CREATE INDEX idx_confession_letter_confession_id_created_at
    ON confession_letter(confession_id, created_at DESC);
CREATE INDEX idx_confession_letter_sender_user_id_created_at
    ON confession_letter(sender_user_id, created_at DESC);
CREATE INDEX idx_confession_letter_unread_author
    ON confession_letter(confession_id, created_at DESC)
    WHERE author_read_at IS NULL AND status = 'SENT';

CREATE TABLE confession_thank_reply (
    id             BIGSERIAL PRIMARY KEY,
    letter_id      BIGINT       NOT NULL UNIQUE REFERENCES confession_letter(id),
    author_user_id BIGINT       NOT NULL,
    body           VARCHAR(500) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE confession_reaction (
    id             BIGSERIAL PRIMARY KEY,
    confession_id  BIGINT      NOT NULL REFERENCES confession_record(id),
    user_id        BIGINT      NOT NULL,
    reaction_type  VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_confession_reaction_user_type
        UNIQUE (confession_id, user_id, reaction_type)
);

CREATE INDEX idx_confession_reaction_confession_id
    ON confession_reaction(confession_id);

CREATE TABLE confession_report (
    id               BIGSERIAL PRIMARY KEY,
    confession_id    BIGINT      NOT NULL REFERENCES confession_record(id),
    reporter_user_id BIGINT      NOT NULL,
    reason           VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_confession_report_reporter
        UNIQUE (confession_id, reporter_user_id)
);

CREATE INDEX idx_confession_report_confession_id
    ON confession_report(confession_id);

-- -----------------------------------------------------------------------------
-- Village Context
-- -----------------------------------------------------------------------------

CREATE TABLE daily_visit (
    id           BIGSERIAL PRIMARY KEY,
    visit_date   DATE        NOT NULL,
    visitor_key  VARCHAR(80) NOT NULL,
    visitor_type VARCHAR(20) NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_daily_visit_date_key UNIQUE (visit_date, visitor_key)
);

CREATE INDEX idx_daily_visit_date_type
    ON daily_visit(visit_date, visitor_type);

CREATE TABLE suggestion (
    id            BIGSERIAL PRIMARY KEY,
    author_key    VARCHAR(80)   NOT NULL,
    author_type   VARCHAR(20)   NOT NULL,
    title         VARCHAR(120)  NOT NULL,
    body          VARCHAR(1000) NOT NULL,
    status        VARCHAR(30)   NOT NULL,
    admin_comment VARCHAR(1000),
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_status_created_at
    ON suggestion(status, created_at DESC);

-- -----------------------------------------------------------------------------
-- Infra Tables
-- -----------------------------------------------------------------------------

CREATE TABLE outbox_event (
    id           BIGSERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    event_id     UUID         NOT NULL UNIQUE,
    payload      JSONB        NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
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
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    result          JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);
