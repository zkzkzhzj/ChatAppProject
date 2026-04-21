# 29. NPC 기억 검색을 시맨틱 검색으로 전환 — pgvector + 벡터 임베딩 도입기

> 작성 시점: 2026-04-14
> 맥락: NPC 대화 기억 검색이 "최근순(recency-based)"이었는데, 오래된 중요 대화를 놓치는 문제가 있어서 "의미 기반(semantic)" 검색으로 전환했다. PostgreSQL에 pgvector 확장을 붙이고, Ollama 임베딩 API로 벡터를 생성하는 구조다.
> 관련 학습노트: [22. Ollama + 로컬 LLM 연동](./22-ollama-local-llm-spring-integration.md), [28. LLM 모델 선택](./28-llm-model-selection-and-production-strategy.md)

---

## 배경

NPC(마을 주민 AI)가 유저와 대화할 때, 과거 대화 내용을 참고해서 답변해야 자연스럽다. "저번에 고양이 이야기 했잖아" 같은 맥락 유지가 핵심이다.

Phase 3에서는 가장 단순한 방식으로 시작했다: **최근 N개 대화를 시간순으로 가져오는 것(recency-based)**. 이건 "방금 전 대화 흐름"을 이어가는 데는 충분했지만, 한계가 명확했다:

- 유저가 "저번 주에 얘기한 반려동물 이름이 뭐였지?"라고 물어도, 최근 10개 메시지에 그 내용이 없으면 NPC가 모른다.
- 대화가 쌓일수록 중요한 과거 기억이 밀려난다.
- NPC가 "기억력이 나쁜 캐릭터"처럼 느껴진다.

그래서 **의미가 비슷한 과거 대화를 찾아오는 시맨틱 검색**으로 전환하기로 했다.

---

## 핵심 개념: 벡터 임베딩이란

### 텍스트를 숫자로 바꾼다

"고양이가 귀엽다"라는 문장이 있으면, 임베딩 모델이 이걸 `[0.12, -0.34, 0.56, ...]` 같은 **고정 길이 숫자 배열(벡터)**로 변환한다. 우리가 쓰는 `nomic-embed-text` 모델은 768차원 벡터를 만든다. 즉, 모든 문장이 768개의 숫자로 표현된다.

핵심 원리는 이것이다: **의미가 비슷한 문장은 벡터도 비슷하다.**

```text
"고양이가 귀엽다" → [0.12, -0.34, 0.56, ...]
"냥이가 사랑스럽다" → [0.11, -0.33, 0.55, ...]  ← 비슷한 벡터!
"오늘 날씨가 좋다" → [0.78, 0.21, -0.45, ...]   ← 전혀 다른 벡터
```

이 "비슷함"을 수학적으로 측정하는 방법 중 하나가 **코사인 유사도(cosine similarity)**다. 두 벡터가 가리키는 방향이 비슷하면 1에 가깝고, 무관하면 0에 가깝다.

### 왜 단순 키워드 검색이 아니라 벡터인가

"반려동물"로 검색하면 "고양이를 키우고 있어요"는 못 찾는다. 키워드가 다르니까. 하지만 벡터 공간에서는 "반려동물"과 "고양이를 키우고 있어요"의 벡터가 가까이 위치한다. 이게 시맨틱 검색의 핵심 가치다.

---

## pgvector란

**pgvector**는 PostgreSQL에 벡터 연산 능력을 추가하는 확장(extension)이다.

### 제공하는 것

- `vector(n)` 타입: n차원 벡터를 저장하는 컬럼 타입. `vector(768)`이면 768차원.
- 거리 연산자:
  - `<=>` : 코사인 거리 (cosine distance). 우리가 쓰는 것.
  - `<->` : L2 거리 (유클리드 거리)
  - `<#>` : 내적 거리 (inner product)
- 벡터 인덱스: IVFFlat, HNSW

### 왜 별도 벡터 DB(Pinecone, Milvus 등)가 아니라 pgvector인가

| | pgvector | 전용 벡터 DB (Pinecone, Milvus 등) |
|--|---------|---------|
| 인프라 복잡도 | PostgreSQL에 확장 하나 추가. 기존 인프라 그대로 | 새로운 서비스 추가. 운영 포인트 증가 |
| 트랜잭션 | PostgreSQL 트랜잭션 안에서 벡터 연산 가능. 대화 저장 + 임베딩 저장이 하나의 트랜잭션 | 별도 서비스라 분산 트랜잭션 또는 eventual consistency |
| 스케일 | 수십만~수백만 벡터까지는 충분. 그 이상은 성능 튜닝 필요 | 수십억 벡터도 처리. 대규모 특화 |
| 쿼리 유연성 | SQL 조건과 벡터 검색을 한 쿼리에 결합 가능 (`WHERE user_id = ? ORDER BY embedding <=> ?`) | 메타데이터 필터링 지원하지만 SQL만큼 유연하지 않음 |
| 적합한 상황 | 이미 PostgreSQL을 쓰는 프로젝트. 벡터가 핵심 데이터의 부속 | 벡터 검색이 서비스의 핵심 기능. 초대규모 데이터 |

우리는 이미 PostgreSQL을 메인 DB로 쓰고 있고, NPC 대화 기억은 수천~수만 건 수준이다. 새 인프라를 도입할 이유가 없다. pgvector가 딱 맞다.

### 사용법 (SQL 레벨)

```sql
-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 벡터 컬럼 추가
ALTER TABLE npc_conversation_memory 
  ADD COLUMN embedding vector(768);

-- 코사인 거리로 유사한 기억 검색 (거리가 작을수록 유사)
SELECT content, 1 - (embedding <=> :queryVector) AS similarity
FROM npc_conversation_memory
WHERE npc_id = :npcId AND user_id = :userId
ORDER BY embedding <=> :queryVector
LIMIT 5;
```

`<=>` 연산자는 **코사인 거리**를 반환한다. 값이 0이면 완전히 같은 방향, 2면 정반대. 유사도로 쓰고 싶으면 `1 - distance`를 하면 된다.

---

## 선택지 비교: Recency-based vs Semantic Search

| | Recency-based (최근순) | Semantic Search (의미 기반) |
|--|---------|---------|
| 핵심 원리 | `ORDER BY created_at DESC LIMIT N` | 유저 메시지를 임베딩 → 코사인 거리로 가장 가까운 기억 검색 |
| 구현 복잡도 | 매우 단순. 쿼리 하나 | 임베딩 모델 필요, 벡터 저장/검색 로직 추가 |
| 추가 인프라 | 없음 | 임베딩 모델(Ollama), pgvector 확장 |
| 저장 비용 | 텍스트만 저장 | 텍스트 + 768차원 벡터 (약 3KB/건 추가) |
| 검색 지연 | 거의 없음 (인덱스 타는 단순 조회) | 임베딩 생성 시간(~50ms) + 벡터 검색 시간 |
| 장점 | 직관적. 최근 대화 흐름 유지에 적합. 디버깅 쉬움 | 오래된 중요 대화도 찾아옴. "기억력 좋은 NPC" 가능 |
| 단점 | 오래된 중요 대화를 놓침. N을 키우면 LLM 컨텍스트 낭비 | 임베딩 모델 의존. 모델 품질에 따라 검색 품질 갈림 |
| 적합한 상황 | 단순 채팅, 짧은 대화 세션, MVP | 장기 기억이 중요한 AI 캐릭터, RAG 시스템 |
| 실제 사용 사례 | 대부분의 일반 채팅 앱 | ChatGPT의 Memory 기능, Character.ai, 게임 NPC |

### 하이브리드도 가능하다

실전에서는 둘을 조합하는 경우가 많다:

- 최근 3~5개 메시지 → recency (현재 대화 흐름 유지)
- 시맨틱 검색 3~5개 → semantic (과거 관련 기억 참조)
- 두 결과를 합쳐서 LLM에 전달

이게 가장 자연스러운 NPC 대화를 만든다. 우리 프로젝트도 이 방향으로 갈 수 있다.

---

## Ollama 임베딩 API

대화 생성용 LLM(Qwen 등)과 별개로, **임베딩 전용 모델**을 Ollama에서 돌린다.

### 엔드포인트

```text
POST http://localhost:11434/api/embed
```

### 요청

```json
{
  "model": "nomic-embed-text",
  "input": ["고양이를 키우고 있어요. 이름은 나비입니다."]
}
```

`input`에 문자열 배열을 넘기면 **배치 임베딩**이 가능하다. 여러 문장을 한 번에 벡터화할 수 있다.

### 응답

```json
{
  "model": "nomic-embed-text",
  "embeddings": [
    [0.0123, -0.0456, 0.0789, ...]  // 768차원 float 배열
  ]
}
```

### 왜 nomic-embed-text인가

| | nomic-embed-text (v1.5) | all-MiniLM-L6 | text-embedding-3-small (OpenAI) |
|--|---------|---------|---------|
| 차원 수 | 768 (Matryoshka로 256까지 축소 가능) | 384 | 1536 |
| 모델 크기 | ~274MB | ~80MB | 클라우드 API |
| 성능 (MTEB) | 우수 — ada-002 및 3-small과 경쟁 수준 | 보통 | 우수 |
| 컨텍스트 길이 | 8192 토큰 | 512 토큰 | 8191 토큰 |
| 로컬 실행 | Ollama로 바로 실행 | Ollama 지원 | 불가 (API만) |
| 비용 | 무료 | 무료 | 유료 |
| 라이선스 | Apache 2.0 | Apache 2.0 | 상용 |

nomic-embed-text를 고른 이유:

1. **로컬 실행이 가능하다.** Ollama에서 바로 돌린다. 개발 환경에서 비용 0.
2. **8192 토큰 컨텍스트.** NPC 대화 메시지가 길어도 잘림 없이 임베딩 가능.
3. **768차원은 성능과 저장 비용의 적절한 균형.** 384차원보다 정확하고, 1536차원보다 저장 비용이 절반.
4. **OpenAI ada-002를 넘는 성능.** 오픈소스 중에서는 최상위권.

주의할 점: 임베딩 모델과 LLM 생성 모델은 **다른 모델**이다. Qwen은 대화를 "생성"하고, nomic-embed-text는 텍스트를 "벡터로 변환"한다. 역할이 완전히 다르다.

---

## pgvector 인덱스 전략

### 인덱스가 꼭 필요한가?

pgvector는 인덱스 없이도 동작한다. 인덱스가 없으면 **sequential scan** — 테이블의 모든 벡터를 하나하나 비교한다.

이게 나쁜 것만은 아니다:

- **100% 정확도.** 인덱스는 근사 최근접 이웃(ANN)이라서 결과가 "대략 맞는" 수준이지만, sequential scan은 정확한 결과를 보장한다.
- **소량 데이터에서는 충분히 빠르다.** 수천 건 이하에서는 sequential scan이 ms 단위로 끝난다.
- **인덱스 빌드 비용이 없다.** HNSW 인덱스 빌드는 데이터가 많으면 수십 분 걸릴 수 있다.

### 언제 인덱스를 추가해야 하는가

| 데이터 규모 | 권장 전략 | 이유 |
|--|---------|---------|
| ~1,000건 | 인덱스 불필요 | sequential scan으로 수 ms |
| ~10,000건 | 모니터링 시작 | 쿼리 시간을 측정하고 지연이 느껴지면 인덱스 추가 |
| ~100,000건+ | 인덱스 필요 | sequential scan이 수백 ms~초 단위로 느려짐 |

### IVFFlat vs HNSW

| | IVFFlat | HNSW |
|--|---------|---------|
| 핵심 원리 | 벡터들을 클러스터로 나누고, 쿼리 시 가까운 클러스터만 탐색 | 그래프 구조로 벡터를 연결. 계층적 탐색으로 빠르게 최근접 이웃 검색 |
| 빌드 속도 | 빠름 (128초 @ 1M 벡터) | 느림 (4065초 @ 1M 벡터, ~32배 느림) |
| 쿼리 속도 | 보통 (~2.4ms) | 빠름 (~1.5ms) |
| 메모리 | 적음 (~257MB @ recall 0.998) | 많음 (~729MB, 2.8배) |
| 정확도(recall) | 좋음 (nprobe 조절) | 매우 좋음 (ef_search 조절) |
| 빈 테이블에서 생성 | 불가 — 데이터가 있어야 클러스터링 가능 | 가능 — 훈련 단계 없음 |
| 적합한 상황 | 메모리 제한, 빌드 속도 중요 | 쿼리 성능 최우선, 메모리 여유 |

```sql
-- HNSW 인덱스 (나중에 필요할 때)
CREATE INDEX ON npc_conversation_memory 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- IVFFlat 인덱스 (대안)
CREATE INDEX ON npc_conversation_memory 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 이 프로젝트에서 고른 것

**선택: pgvector + Semantic Search, 인덱스 미적용**

이유:

1. **NPC의 "기억력"이 서비스 품질에 직결된다.** "마음의 고향"은 대화가 핵심이다. NPC가 과거 대화를 기억하는 건 서비스 가치 자체다.
2. **이미 PostgreSQL을 쓰고 있다.** pgvector 확장 하나면 된다. 새 인프라 도입 비용이 0이다.
3. **이미 Ollama를 돌리고 있다.** LLM용으로 Ollama를 쓰고 있으니, 임베딩 모델 하나 더 올리는 건 사소하다.
4. **데이터가 아직 소량이다.** NPC 대화 기억이 수천 건도 안 될 시점이라 인덱스 없이 sequential scan으로 충분하다.
5. **Port/Adapter 구조 덕분에 전환 비용이 낮았다.** 기존 recency 기반 어댑터 옆에 semantic 기반 어댑터를 추가하면 된다.

---

## 실전에서 주의할 점

- **임베딩 모델을 바꾸면 기존 벡터가 전부 무효화된다.** nomic-embed-text에서 다른 모델로 갈아타면 차원 수도 다르고, 같은 차원이라도 벡터 공간 자체가 다르다. 전체 재임베딩이 필요하다. 모델 선택은 신중하게.

- **임베딩 생성은 동기 호출이다.** 대화 저장 시 Ollama API를 호출해서 임베딩을 받아와야 한다. Ollama가 느리거나 죽어있으면 대화 저장이 실패할 수 있다. 비동기 처리(임베딩 없이 먼저 저장 → 나중에 임베딩 채우기)를 고려할 수 있다.

- **벡터 컬럼의 NULL 처리.** 임베딩 생성에 실패한 레코드는 벡터가 NULL이 된다. 검색 쿼리에서 `WHERE embedding IS NOT NULL`을 빠뜨리면 에러가 난다.

- **코사인 거리 vs 코사인 유사도 혼동.** pgvector의 `<=>` 연산자는 **거리(distance)**를 반환한다. 거리가 작을수록 유사하다. "유사도"로 쓰려면 `1 - distance`를 해야 한다. ORDER BY에서 ASC가 "가장 유사한 것"이다.

- **임베딩 차원 불일치.** 저장된 벡터가 768차원인데 쿼리 벡터가 다른 차원이면 PostgreSQL이 에러를 던진다. 모델이 바뀌지 않았는지 확인할 것.

---

## 나중에 돌아보면

- **데이터가 10만 건을 넘으면** sequential scan이 느려진다. 그때 HNSW 인덱스를 추가해야 한다. HNSW가 기본 권장이고, 메모리가 부족하면 IVFFlat.

- **임베딩 품질이 아쉬우면** 더 큰 모델(nomic-embed-text-v2-moe 등)로 교체하거나, 프로덕션에서는 OpenAI embedding API를 쓸 수 있다. Port 추상화가 되어 있으니 어댑터만 바꾸면 된다.

- **하이브리드 검색이 필요해질 수 있다.** 시맨틱 검색만으로는 "방금 전 대화"를 놓칠 수 있다. recency + semantic을 조합하는 게 최종 형태가 될 가능성이 높다.

- **Re-ranking이 필요해질 수 있다.** 벡터 검색으로 후보를 뽑고, LLM이나 cross-encoder로 re-ranking하면 품질이 더 올라간다. 다만 복잡도와 지연이 증가하므로 "NPC 대화에 그 정도가 필요한가?"를 기준으로 판단한다.

- **전용 벡터 DB로 마이그레이션하는 시점.** 벡터가 수백만 건을 넘고, PostgreSQL의 일반 쿼리 성능에도 영향을 줄 정도면, Pinecone이나 Milvus 같은 전용 벡터 DB를 고려할 수 있다. 하지만 그 시점이 오려면 한참 멀었다.

---

## 더 공부할 거리

### 공식 문서

- [pgvector GitHub](https://github.com/pgvector/pgvector) — README가 곧 공식 문서. 연산자, 인덱스, 타입 설명이 간결하게 정리되어 있다.
- [Ollama Embedding 문서](https://docs.ollama.com/capabilities/embeddings) — `/api/embed` 엔드포인트 사용법.
- [nomic-embed-text (Ollama)](https://ollama.com/library/nomic-embed-text) — 모델 스펙과 사용법.

### 비교/분석 아티클

- [pgvector HNSW vs IVFFlat 비교 (Medium)](https://medium.com/@bavalpreetsinghh/pgvector-hnsw-vs-ivfflat-a-comprehensive-study-21ce0aaab931) — 벤치마크 수치가 포함된 상세 비교.
- [AWS: pgvector 인덱싱 심화](https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/) — IVFFlat, HNSW 튜닝 가이드.
- [Crunchy Data: HNSW Indexes](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector) — 소규모~대규모 데이터셋에서의 인덱스 전략.

### 연관 개념

- **RAG (Retrieval-Augmented Generation)**: 우리가 하는 것이 사실상 RAG다. 외부 지식(과거 대화)을 검색해서 LLM에 컨텍스트로 넣는 패턴.
- **Matryoshka Representation Learning**: nomic-embed-text가 지원하는 기술. 768차원 벡터를 256차원으로 줄여도 성능 저하가 적다. 저장 비용을 줄이고 싶을 때 유용.
- **Cross-encoder vs Bi-encoder**: 임베딩(bi-encoder)은 빠르지만 정확도가 제한적. Cross-encoder는 느리지만 정확. 검색 후 re-ranking에 cross-encoder를 쓰는 게 고급 패턴.
- **Spring AI Embedding**: Spring AI가 Ollama 임베딩을 공식 지원한다. 직접 HTTP 호출 대신 Spring AI의 `EmbeddingModel` 추상화를 쓸 수도 있다.
