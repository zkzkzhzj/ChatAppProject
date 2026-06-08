-- =============================================================================
-- V3__cleanup_legacy_chat_rooms.sql
-- Reset legacy chat room seed data and fix the public chat room id.
--
-- Existing data from early local migrations is cleared, then the village public
-- chat room is recreated with id=1.
-- =============================================================================

DELETE FROM participant;
DELETE FROM chat_room;

ALTER SEQUENCE chat_room_id_seq RESTART WITH 1;
ALTER SEQUENCE participant_id_seq RESTART WITH 1;

INSERT INTO chat_room (title, type, status)
VALUES ('마을 광장', 'PUBLIC', 'ACTIVE');
