-- NPC 대화 맥락 유지를 위한 요약 벡터 테이블.
-- Cassandra에 원본 메시지를 저장하고, 여기에 요약 텍스트를 저장한다.
-- 현재는 텍스트 요약만 저장하고, 임베딩(vector) 컬럼은 Phase 2에서 활성화한다.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE npc_conversation_memory (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL,
    summary         TEXT            NOT NULL,
    message_count   INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT now()
);

-- 유저별 최근 요약 조회 (ORDER BY created_at DESC)
CREATE INDEX idx_npc_conv_memory_user_id ON npc_conversation_memory (user_id, created_at DESC);
