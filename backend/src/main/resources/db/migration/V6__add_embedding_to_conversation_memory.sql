-- 대화 요약에 임베딩 벡터 컬럼을 추가한다.
-- Ollama nomic-embed-text 모델 기준 768차원.
-- 시맨틱 유사도 검색(cosine distance)으로 관련 기억을 찾는다.
-- 데이터 소량 단계에서는 sequential scan으로 충분하므로 벡터 인덱스는 미적용.

ALTER TABLE npc_conversation_memory
    ADD COLUMN embedding vector(768);
