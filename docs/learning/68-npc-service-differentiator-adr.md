# 68. NPC 중심 서비스의 차별점 — Evaluator + LMOps + RAG 3축 (사전 ADR)

> 작성 시점: 2026-04-30
> 트랙: `harness-spec-driven` (Issue #46)
> 출발점: 사용자 질문 — "PyTorch / LangChain / RAG / vector DB / LMOps 도 한번 고려해줘. 나만의 차별점이 필요해"
> 산출물: 후속 트랙 `npc-evaluator-lmops` · `ai-observability` 의 사전 ADR

---

## 0. 이 노트는 어떻게 읽어야 하나

이 노트는 **"마음의 고향" 서비스의 차별점이 무엇이고, 그걸 만들려면 어느 기술이 필요하고 어느 기술이 함정인가** 를 사전에 정리한 ADR (Architectural Decision Record) 이다.

후속 트랙 (`npc-evaluator-lmops`, `ai-observability`) 이 spec 작성 시 본 노트의 §3·§4·§5 를 그대로 spec.decisions 의 출발점으로 사용한다.

본인 답안 슬롯이 마지막. "왜 LangChain 안 쓰는가?" 를 자기 말로 풀 수 있게 되는 것이 끝.

메모리 `feedback_service_perspective.md` 와 정합 — **기술 결정은 서비스 관점으로만.** 채용·블로그·면접 프레이밍 일체 X.

---

## 1. 차별점은 무엇이어야 하나 — 서비스 정체성 재확인

[`CLAUDE.md`](../../CLAUDE.md) §2 Project Identity:

> "대화가 그리운 사람을 위한 안식처. 인터랙티브 2D 공간 + AI 가 마을 NPC."

핵심 가치 (서비스 차별점의 출발점):

1. **안식처** — 가벼운 일상 수다부터 마음속 이야기까지. 감정의 무게 무관 누구나 편히 찾는 곳
2. **공간 꾸미기** — 귀여운 아이템으로 "내 안식처" 만드는 경험
3. **AI = 마을 NPC** — 단순 상담 봇 X. 마을에 살며 유저를 반겨주고 대화 상대가 되어주는 존재

→ **차별점은 NPC 다.** 다른 곳에서 흉내 못 내는 따뜻하고 안전한 NPC 가 있어야 "안식처" 가치가 산다.

→ NPC 가 차별점이라면, NPC 를 "따뜻하고 안전하게" 만드는 인프라가 차별점의 인프라.

---

## 2. 5개 후보 분석 (서비스 관점)

| 기술 | 무엇 | 서비스 가치 | 결정 |
|------|------|----------|------|
| **PyTorch** | 모델 직접 학습 (fine-tuning) | NPC 톤 자체 학습 | ❌ **No (현재)** |
| **LangChain** | LLM orchestration framework (Java 클라이언트는 LangChain4j) | prompt 체이닝·tool use 추상화 | ❌ **No (Spring AI 검토 가능)** |
| **RAG** | Retrieval-Augmented Generation | 유저 대화 히스토리 / NPC 페르소나 검색 강화 | ✅ **이미 있음 (강화 가능)** |
| **vector DB (전용)** | Pinecone / Qdrant / Weaviate | 더 큰 규모 + 더 빠른 검색 | ❌ **No (현재 — pgvector 충분)** |
| **LMOps** | LLM Operations (모니터링 / A/B / 비용 / prompt 버전 / evaluator) | NPC 비용·품질·회귀 관리 | ✅ **Yes (차별점 핵심)** |

### 2.1 PyTorch — 왜 No

- GPU 인프라 필요. 솔로 운영 환경에서 GPU 인스턴스 비용 = 서비스 영업이익 폭증
- 현재 OpenAI gpt-4o-mini + pgvector 임베딩으로 NPC 톤 충분 ([learning #28 LLM 모델 선택](./28-llm-model-selection-and-production-strategy.md))
- 톤 강화는 **prompt engineering 우선** — 모델 학습은 나중
- **재검토 트리거**: MAU 10k+ 또는 OpenAI 응답 톤이 "안식처" 가치와 어긋나는 일관된 신호

### 2.2 LangChain — 왜 No (대신 Spring AI 검토)

- 현재 OpenAI 직접 호출 (~200 줄 코드). orchestration 복잡도가 추상화 가치 < 추상화 비용
- LangChain4j (Java) 는 LangChain (Python) 보다 미성숙 — 우리는 Spring Boot 4.x 환경
- **대안**: [Spring AI](https://spring.io/projects/spring-ai) — Spring 생태계 자연 통합. 단 현재 도입 압력 약함 (직접 호출 동작 중)
- **재검토 트리거**: prompt 체이닝 (응답 → 후속 질문 → 다른 NPC 응답) 이 3단계 이상 + 도구 호출 (function calling) 가 5종 이상 필요해질 때

### 2.3 RAG — 이미 있음, 강화 방향

- [learning #29 vector embedding pgvector](./29-vector-embedding-pgvector-semantic-search.md), [#30 JPA pgvector 매핑](./30-jpa-pgvector-type-mapping.md), [#31 Kafka 멱등성](./31-kafka-idempotency-key-design.md) 에 이미 구현
- 현재: 유저 메시지 임베딩 → pgvector 유사도 검색 → 맥락 주입 → LLM 응답
- **강화 방향 (후속 트랙)**:
  - NPC 캐릭터별 페르소나 RAG ("할머니 캐릭터" / "친구 캐릭터" 등 분기)
  - 유저별 대화 히스토리 RAG 가중치 (최근성 / 빈도 / 감정 가중)
  - 마을 분위기 풍성화 — 단일 NPC → 다양 NPC

### 2.4 vector DB (전용) — 왜 No (현재)

- 현재 pgvector 로 MVP 규모 충분 ([learning #29 §5](./29-vector-embedding-pgvector-semantic-search.md))
- 전용 vector DB (Pinecone / Qdrant / Weaviate) 도입 시:
  - 별도 인프라 비용
  - PostgreSQL 과의 데이터 일관성 책임 분리
  - JOIN 불가 (NPC 메타데이터와 임베딩이 다른 DB)
- **재검토 트리거**: MAU 10k+ / pgvector 검색 P95 > 100ms / 임베딩 차원 1536 → 3072+ 변경

### 2.5 LMOps — 차별점의 핵심

NPC 중심 서비스의 운영 인프라.

| 영역 | 왜 필요 | 상태 |
|------|--------|------|
| **NPC 응답 evaluator** | 따뜻함·안전성·맥락 적합성 자동 평가. 자해/혐오 발화 차단. "안식처" 가치 직결 | ❌ 미구현 (learning #33 ai-agent-evaluation 만 다룸) |
| **prompt 버전 관리** | git 기반. prompt 변경 ↔ 응답 품질 변화 회귀 추적 | ❌ 미구현 |
| **LLM 비용 추적** | OpenAI usage API → Prometheus → Grafana. 폭주 알람 | ❌ 미구현 |
| **A/B 테스트** | 어떤 prompt 가 만족도 ↑? 유저 행동 (대화 길이·재방문) 기반 | ❌ 미구현 |
| **회귀 detector** | prompt 바꿨는데 응답 품질 떨어졌나? 자동 비교 | ❌ 미구현 |

→ **이 5개가 후속 트랙 `npc-evaluator-lmops` 의 spec.tasks.**

---

## 3. 차별점 3축 (결정)

```text
┌──────────────────────────────────────────────────┐
│  마음의 고향 차별점 — NPC 중심 서비스의 운영 기반   │
├──────────────────────────────────────────────────┤
│  ① AI 응답 Evaluator                              │
│     LLM-as-judge + 룰 기반 안전 필터              │
│     자해/혐오 발화 차단. 톤 일관성 검증           │
│                                                  │
│  ② LMOps 기본기                                   │
│     prompt 버전 관리 (git)                        │
│     비용 추적 (OpenAI usage → Prometheus)         │
│     A/B 테스트 (만족도 기반 prompt 선택)          │
│     회귀 detector (prompt 변경 시 응답 품질 비교) │
│                                                  │
│  ③ NPC 페르소나 RAG 강화                          │
│     캐릭터별 페르소나 (할머니/친구/...)            │
│     유저별 대화 히스토리 가중치 RAG               │
└──────────────────────────────────────────────────┘
```

→ 후속 트랙 분리:

- **`npc-evaluator-lmops`** = ① + ②
- **`ai-observability`** = ② 의 일부 (비용 추적 + 분산 trace)

후속 트랙 spec.decisions 작성 시 본 ADR 인용.

---

## 4. 4축 정합 (왜·대안·빈틈·재검토 트리거)

[`comprehension-gate.md`](../conventions/comprehension-gate.md) Tier C 형식과 정합:

### D-NPC. NPC 중심 서비스의 차별점 = Evaluator + LMOps + RAG (3축)

- **왜**: 서비스 정체성이 NPC 다 (`CLAUDE.md` §2). NPC 가 따뜻하고 안전하지 않으면 "안식처" 가치가 무너진다. 이 셋이 운영 기반
- **대안**:
  - PyTorch fine-tuning — 솔로 GPU 비용 폭증. 톤은 prompt engineering 우선
  - LangChain orchestration — 직접 호출 동작 중. 추상화 압력 약함. Spring AI 가 더 자연스러울 수도
  - 외부 vector DB — pgvector 충분. MVP 규모에선 오버킬
- **빈틈**:
  - LLM-as-judge 도 LLM. 평가 모델의 편향이 본 응답 평가에 누적되는가
  - prompt 버전 관리는 git 기반인데, prompt 가 코드 안 hardcoded 면 별도 추적 어려움 — prompt 외부화 필요
  - 비용 추적은 OpenAI usage API 의존. API 변경 시 깨짐
- **재검토 트리거**:
  - MAU 10k+ → vector DB 마이그레이션 검토
  - prompt 체이닝 5단계 이상 → Spring AI / LangChain 도입 검토
  - GPU 비용을 감당할 매출 / 투자 → fine-tuning 검토

→ 후속 트랙이 이 결정을 spec.decisions 에 그대로 복사 시작점으로 사용.

---

## 5. 안 가져온 것들 — 더 의미 있을 수 있다

| 안 가져온 것 | 왜 |
|------------|-----|
| **LangChain** (Python) | Java 환경. LangChain4j 미성숙. 직접 호출 동작 중 |
| **외부 vector DB** | pgvector 충분 (현재). 데이터 일관성 분리 비용 |
| **PyTorch fine-tuning** | GPU 비용 / 솔로 운영 / 톤은 prompt 우선 |
| **AutoGPT / BabyAGI 류 자율 에이전트** | NPC 자율성 ≠ 안식처 가치. 통제 가능한 페르소나가 우선 |
| **GraphRAG** | 데이터 규모가 graph 가치를 정당화 못 함 (MVP). MAU 10k+ 시 검토 |

메모리 `marpple_coffee_chat_insights.md` "AI 에 끌려다니지 말라" 와 정합. **트렌드 추종 X, 서비스 가치 추종 O.**

---

## 6. 후속 트랙 — 본 ADR 의 사용

본 ADR 이 사전에 작성된 이유: **후속 트랙의 spec.decisions 작성 비용을 줄이기.** 본 트랙 (`harness-spec-driven`) 머지 후 후속 트랙이 시작될 때:

```bash
/spec-new npc-evaluator-lmops
```

생성된 spec.md §4 decisions 섹션에 본 §4 의 D-NPC 를 출발점으로 복사. 4축 (왜·대안·빈틈·재검토) 미리 채워져 있어 Comprehension Gate 자동 통과.

```bash
/spec-new ai-observability
```

마찬가지로 본 §3 의 ② 부분 인용.

→ **이게 spec-driven 4층의 진짜 가치.** ADR 한 번 쓰면 후속 트랙 N 개의 spec 출발점이 됨.

---

## 7. 나중에 돌아보면 — 이 결정이 틀릴 수 있는 조건

- LLM-as-judge 가 평가 편향을 지속 누적 → evaluator 자체 신뢰도 ↓ → 인간 평가 / 행동 데이터 평가로 보강 필요
- 비용 추적이 OpenAI 외 (Anthropic / 오픈소스 LLM) 로 다변화될 때 → multi-provider 추상화
- NPC 가 단일 캐릭터에서 마을 N 명으로 늘어날 때 → 페르소나 분기 RAG 가 충분한가, 별도 prompt 라이브러리 필요한가
- "안식처" 가치가 사용자 피드백에서 다른 가치 (예: 게임성) 로 이동 → NPC 차별점 자체 재정의

---

## 8. 더 공부할 거리

- **LLM-as-judge 패턴** (G-Eval / Prometheus / etc.) — evaluator 자체의 정확도 측정법
- **Spring AI** 의 실제 도입 사례 — 현재 OpenAI 직접 호출 → Spring AI 마이그 비용·이득
- **Prompt 외부화 패턴** (PromptHub / Langfuse / Helicone) — 코드 hardcode → 별도 저장소
- **Karpathy "tokens out, tokens in"** 비용 분석 패턴 — NPC 응답 길이 ↔ 비용 ↔ 만족도 곡선
- **OWASP LLM Top 10** — NPC 응답이 prompt injection 으로 우회될 가능성

---

## 9. 본인 답안 슬롯

### Q1. NPC 가 마음의 고향의 차별점이라는 전제가 깨질 신호는? (예: 사용자 피드백에서 "공간 꾸미기" 가 NPC 보다 강한 유입 동인이 될 때)

```text
(여기에 본인 답)
```

### Q2. LangChain 을 안 쓰기로 한 결정의 빈틈은? — "직접 호출 동작 중" 이 영원히 유효한 가정인가? 5단계 prompt 체이닝이 필요해지는 시점이 언제 올까?

```text
(여기에 본인 답)
```

### Q3. PyTorch fine-tuning 대신 prompt engineering 우선 — 이 우선순위가 깨지려면 어떤 측정값이 필요한가? (예: 톤 일관성 score < N 으로 6개월 연속 등)

```text
(여기에 본인 답)
```

### Q4. LLM-as-judge evaluator 의 빈틈 — "평가 모델의 편향이 본 응답 평가에 누적된다" 를 막으려면? (예: 룰 기반 필터 병행, 인간 샘플 검증, multi-judge ensemble)

```text
(여기에 본인 답)
```

### Q5. 외부 vector DB 도입 트리거 (MAU 10k+ / P95 > 100ms / 임베딩 차원 ↑) 중 어느 게 가장 먼저 올 가능성이 큰가? 그 시점의 마이그레이션 비용 vs 미루는 비용?

```text
(여기에 본인 답)
```

> 답이 막히면 [`CLAUDE.md`](../../CLAUDE.md) §2 (서비스 정체성), [learning #29 pgvector RAG](./29-vector-embedding-pgvector-semantic-search.md), 본 노트 §4 D-NPC 4축을 다시 본다.
