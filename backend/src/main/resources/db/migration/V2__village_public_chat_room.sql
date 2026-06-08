-- =============================================================================
-- V2__village_public_chat_room.sql
-- Seed one public village chat room.
--
-- chat_room.id = 1 is used as the configured village public chat room.
-- =============================================================================

INSERT INTO chat_room (title, type, status)
VALUES ('마을 광장', 'PUBLIC', 'ACTIVE');
