-- Remove persisted personal space, character customization, and economy tables.
-- Runtime avatars and WebSocket presence remain non-persisted village behavior.
-- This migration is intentionally irreversible. Confirm a database backup and
-- production table data review before applying it outside disposable environments.

DROP TABLE IF EXISTS character_equipment;
DROP TABLE IF EXISTS space_placement;
DROP TABLE IF EXISTS character;
DROP TABLE IF EXISTS space;
DROP TABLE IF EXISTS user_item_inventory;
DROP TABLE IF EXISTS item_definition;
DROP TABLE IF EXISTS point_transaction;
DROP TABLE IF EXISTS point_wallet;
