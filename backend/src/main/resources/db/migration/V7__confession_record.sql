-- -----------------------------------------------------------------------------
-- Confession Context — Library confession records
-- -----------------------------------------------------------------------------

CREATE TABLE confession_record (
    id             BIGSERIAL PRIMARY KEY,
    author_user_id BIGINT       NOT NULL, -- ID 참조 (FK 아님)
    title          VARCHAR(120) NOT NULL,
    body           VARCHAR(3000) NOT NULL,
    bookshelf      VARCHAR(50)  NOT NULL,
    status         VARCHAR(50)  NOT NULL,
    risk_level     VARCHAR(50)  NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confession_record_author_user_id ON confession_record(author_user_id);
CREATE INDEX idx_confession_record_status_created_at ON confession_record(status, created_at DESC);
CREATE INDEX idx_confession_record_bookshelf_status_created_at
    ON confession_record(bookshelf, status, created_at DESC);

CREATE TABLE confession_letter (
    id             BIGSERIAL PRIMARY KEY,
    confession_id  BIGINT        NOT NULL REFERENCES confession_record(id),
    sender_user_id BIGINT        NOT NULL, -- ID 참조 (FK 아님)
    body           VARCHAR(1500) NOT NULL,
    status         VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confession_letter_confession_id_created_at
    ON confession_letter(confession_id, created_at DESC);
CREATE INDEX idx_confession_letter_sender_user_id_created_at
    ON confession_letter(sender_user_id, created_at DESC);

CREATE TABLE confession_thank_reply (
    id             BIGSERIAL PRIMARY KEY,
    letter_id      BIGINT       NOT NULL UNIQUE REFERENCES confession_letter(id),
    author_user_id BIGINT       NOT NULL, -- ID 참조 (FK 아님)
    body           VARCHAR(500) NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
