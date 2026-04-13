-- =============================================================================
-- V3__cleanup_legacy_chat_rooms.sql
-- 기존 NPC 1:1 채팅방 정리 + 공개 채팅방 ID 고정
--
-- V2에서 마을 공개 채팅방을 만들었으나 기존 데이터 때문에 ID가 밀렸다.
-- 전체 정리 후 공개 채팅방을 id=1로 재생성한다.
-- =============================================================================

-- 기존 참여자 전체 삭제
DELETE FROM participant;

-- 기존 채팅방 전체 삭제
DELETE FROM chat_room;

-- 시퀀스 리셋
ALTER SEQUENCE chat_room_id_seq RESTART WITH 1;
ALTER SEQUENCE participant_id_seq RESTART WITH 1;

-- 마을 공개 채팅방 (id=1)
INSERT INTO chat_room (title, type, status)
VALUES ('마을 광장', 'PUBLIC', 'ACTIVE');

-- NPC 참여자 (id=1)
INSERT INTO participant (user_id, chat_room_id, display_name, participant_role, entry_type)
VALUES (NULL, 1, '마을 주민', 'NPC', 'SYSTEM');
