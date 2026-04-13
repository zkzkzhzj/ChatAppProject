-- =============================================================================
-- V2__village_public_chat_room.sql
-- 마을 공개 채팅방 시드 데이터
--
-- 마을당 공개 채팅방 1개가 존재한다. (현재 마을 = 1개)
-- 채널 개념 도입 전까지 이 방을 고정 사용한다.
-- chat_room.id = 1 을 약속한다.
-- =============================================================================

-- 마을 공개 채팅방
INSERT INTO chat_room (title, type, status)
VALUES ('마을 광장', 'PUBLIC', 'ACTIVE');

-- NPC 참여자 (마을 주민, 항상 존재)
INSERT INTO participant (user_id, chat_room_id, display_name, participant_role, entry_type)
VALUES (NULL, 1, '마을 주민', 'NPC', 'SYSTEM');
