ALTER TABLE confession_letter
    ADD COLUMN author_read_at TIMESTAMP NULL;

CREATE INDEX idx_confession_letter_unread_author
    ON confession_letter(confession_id, created_at DESC)
    WHERE author_read_at IS NULL AND status = 'SENT';
