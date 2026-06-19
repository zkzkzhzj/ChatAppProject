-- -----------------------------------------------------------------------------
-- Undo for V10__village_board_and_visit.sql
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_suggestion_status_created_at;
DROP TABLE IF EXISTS suggestion;
DROP INDEX IF EXISTS idx_daily_visit_date_type;
DROP TABLE IF EXISTS daily_visit;
