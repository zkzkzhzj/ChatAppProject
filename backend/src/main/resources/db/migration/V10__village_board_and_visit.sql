-- -----------------------------------------------------------------------------
-- Village daily visit dashboard and public suggestion board
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
    id             BIGSERIAL PRIMARY KEY,
    author_key     VARCHAR(80)  NOT NULL,
    author_type    VARCHAR(20)  NOT NULL,
    title          VARCHAR(120) NOT NULL,
    body           VARCHAR(1000) NOT NULL,
    status         VARCHAR(30)  NOT NULL,
    admin_comment  VARCHAR(1000) NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_status_created_at
    ON suggestion(status, created_at DESC);
