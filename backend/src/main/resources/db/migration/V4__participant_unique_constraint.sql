-- =============================================================================
-- V4__participant_unique_constraint.sql
-- participant 테이블에 (user_id, chat_room_id) UNIQUE 제약조건 추가
--
-- 동시성 리뷰에서 발견: getOrCreateParticipant()의 check-then-act 패턴에서
-- 같은 유저가 동시에 첫 메시지를 보내면 participant 중복 생성 가능.
-- DB 레벨 UNIQUE 제약으로 최후의 방어선을 만든다.
--
-- NPC 참여자는 user_id = NULL이므로 UNIQUE 제약에서 제외된다 (PostgreSQL NULL != NULL).
-- =============================================================================

ALTER TABLE participant
    ADD CONSTRAINT uk_participant_user_chatroom UNIQUE (user_id, chat_room_id);
