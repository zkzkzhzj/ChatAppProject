-- =============================================================================
-- V4__participant_unique_constraint.sql
-- Add a DB-level uniqueness guard for get-or-create participant behavior.
--
-- This prevents duplicate participants when the same user sends a first message
-- concurrently to the same chat room.
-- =============================================================================

ALTER TABLE participant
    ADD CONSTRAINT uk_participant_user_chatroom UNIQUE (user_id, chat_room_id);
