-- Legacy NPC participants can no longer be materialized after NPC chat removal.
-- Keep their historical messages readable by mapping the stale role to MEMBER.
UPDATE participant
SET participant_role = 'MEMBER'
WHERE participant_role = 'NPC';
