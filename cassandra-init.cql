CREATE KEYSPACE IF NOT EXISTS gohyang
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    AND durable_writes = true;

CREATE TABLE IF NOT EXISTS gohyang.message (
    chat_room_id bigint,
    created_at  timestamp,
    id          uuid,
    participant_id bigint,
    body        text,
    message_type text,
    PRIMARY KEY ((chat_room_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);
