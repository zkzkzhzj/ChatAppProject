# 33. AI 에이전트 평가(Evaluation) 방법론 — "감"이 아닌 데이터로 AI 품질을 관리하는 법

> 작성 시점: 2026-04-15
> 맥락: "마음의 고향"에서 AI NPC(시맨틱 검색 + LLM 응답)를 운영 중이다. Phase 5까지 기능 구현은 끝났지만, 프로덕션 배포 시 "NPC 답변 품질을 어떻게 보장할 것인가"라는 문제가 남아있다. 인프런 "안정적인 AI 에이전트 서비스 운영을 위한 평가(Evaluation) 방법" 강의(제이쓴)를 기반으로 학습한 내용을 정리한다.
> 관련 학습노트: [22. Ollama + 로컬 LLM 연동](./22-ollama-local-llm-spring-integration.md), [28. LLM 모델 선택](./28-llm-model-selection-and-production-strategy.md), [29. 시맨틱 검색 도입](./29-vector-embedding-pgvector-semantic-search.md)

---

## 배경

AI NPC가 유저에게 대답하는 파이프라인은 대략 이렇다:

```text
유저 메시지 → 임베딩 → pgvector 시맨틱 검색 → 관련 기억 추출 → LLM 프롬프트 구성 → 응답 생성
```

이 파이프라인에서 문제는, **같은 질문에 대해 매번 다른 답이 나올 수 있다**는 점이다. 전통적인 소프트웨어는 입력이 같으면 출력이 같다. 하지만 LLM은 temperature, 컨텍스트 윈도우에 어떤 기억이 들어왔느냐, 모델 업데이트 등에 따라 결과가 달라진다.

그래서 "이번에 프롬프트 고쳤는데 더 나아진 건가?"를 판단하려면 **체계적인 평가 시스템(Evaluation)**이 필요하다. 감으로 "이 정도면 괜찮겠지"라고 배포하면, 사용자가 먼저 문제를 발견한다.

---

## 왜 기존 테스트 방식으로는 부족한가

### 비결정성(Non-determinism)

전통적인 단위 테스트는 `assertEqual(expected, actual)`로 동작한다. 하지만 LLM 응답은 같은 프롬프트에 "고양이가 귀엽죠!"라고 할 수도 있고, "네, 고양이는 정말 사랑스러운 동물이에요"라고 할 수도 있다. 둘 다 정답인데 문자열이 다르다.

### 비정형 출력

"이 답변이 좋은가?"는 Pass/Fail 이진 판단으로 끝나지 않는다. 정확성, 관련성, 톤, 안전성 등 여러 차원이 있다. NPC가 "맞는 말"을 하더라도 톤이 차갑다면 "마음의 고향" 서비스 맥락에서는 실패다.

### 동적 시스템

프롬프트를 바꾸면 답변이 바뀐다. 모델을 바꿔도 바뀐다. 심지어 유저의 대화 패턴이 바뀌어도(시맨틱 검색 결과가 달라지니까) 답변이 바뀐다. 이 모든 변수를 추적하려면 **자동화된 평가 파이프라인**이 필수다.

---

## Golden Dataset — 평가의 출발점

평가를 하려면 먼저 "정답지"가 필요하다. 이걸 **Golden Dataset**이라고 부른다. "이런 질문에는 이런 종류의 답변이 나와야 한다"를 정의한 데이터셋이다.

### 구축 방법 3가지

#### 1. RAGAS 라이브러리 — 자동 생성

[RAGAS](https://docs.ragas.io/en/stable/)는 RAG 시스템 평가에 특화된 오픈소스 프레임워크다(Apache-2.0). 동작 원리가 흥미로운데:

1. 소스 문서(NPC 대화 로그, 설정 문서 등)를 넣으면
2. 내부적으로 **Knowledge Graph**를 구축하고
3. 그래프에서 노드/관계를 활용해 **질문-답변 쌍(Synthetic QA)**을 자동 생성한다

장점은 수백 개의 QA 쌍을 빠르게 만들 수 있다는 것이다. 단점은 도메인 특수성이 떨어질 수 있다는 것. "마음의 고향" NPC는 감성적 대화가 핵심인데, 자동 생성된 QA가 그 뉘앙스를 잡아내기는 어렵다.

RAGAS가 제공하는 핵심 메트릭:

- **Faithfulness**: 답변이 검색된 컨텍스트에 근거하는가? (환각 방지)
- **Answer Relevancy**: 답변이 질문에 관련 있는가?
- **Context Precision**: 검색된 문서 중 실제로 필요한 문서의 비율
- **Context Recall**: 필요한 문서를 빠뜨리지 않았는가?

#### 2. 커스텀 에이전트 — 도메인 맞춤 생성

LLM에게 "이 FAQ 문서를 보고 유저가 할 법한 질문과 기대 답변을 만들어줘"라고 시키는 방식이다. 프롬프트와 도구를 직접 설계해서 도메인 맥락을 주입할 수 있다.

예를 들어 우리 프로젝트라면:

- NPC 성격 설정 문서를 주고 "이 성격의 NPC에게 유저가 할 법한 질문 30개를 만들어줘"
- 기존 대화 로그를 주고 "이 대화 패턴에서 발생할 수 있는 엣지케이스를 찾아줘"

RAGAS보다 도메인 적합도가 높지만, 프롬프트 엔지니어링에 시간이 든다.

#### 3. Claude Code Skill — Seed 확장

소규모 seed data(10-20개)를 직접 손으로 만들고, 이걸 LLM으로 수백 개로 확장하는 방식이다. seed가 품질의 천장을 결정하므로, seed 자체를 잘 만드는 것이 핵심이다.

### 규모 가이드라인

| 단계 | 규모 | 목적 |
|------|------|------|
| MVP / 초기 검증 | 50-100개 | 명백한 실패 탐지. "NPC가 욕을 하진 않는가?" 수준 |
| 프로덕션 배포 | 200-500개 | 주요 유즈케이스 + 엣지케이스 커버 |
| 성숙 시스템 | 1,000개 이상 | 프로덕션에서 발견된 실패 사례를 지속 추가 |

### 구축 원칙

- **Scope 명확화**: 무엇을 평가할 것인가를 먼저 정의한다. "NPC 답변 전체"는 너무 넓다. "감성 대화에서 공감 표현 여부", "과거 기억 참조 정확도" 등 구체적으로 쪼갠다.
- **다양성 확보**: 행복한 시나리오만 넣지 않는다. 화난 유저, 의미 없는 입력, 민감한 주제 등을 포함한다.
- **Decontamination**: 학습 데이터와 평가 데이터가 겹치지 않도록 주의한다. 겹치면 "시험 문제를 미리 본" 것과 같다.
- **Living dataset**: 한 번 만들고 끝이 아니다. 프로덕션에서 새로운 실패 패턴이 발견되면 추가한다.
- **평가자 유형 혼합**: 자동(LLM-as-judge) + 사람(Human review)을 섞는다. 자동만으로는 미묘한 톤 차이를 잡기 어렵고, 사람만으로는 규모가 안 된다.

---

## 평가 방법 — E2E와 Component

평가는 두 가지 관점에서 본다.

### E2E 평가 (End-to-End)

최종 결과물만 본다. "유저가 이 질문을 했을 때, NPC가 이 답변을 했는데 괜찮은가?"

**Binary 평가**: 정답/오답 이진 판단. "사실 관계가 맞는가?" 같은 질문에 적합하다.

**Scored 평가**: 1-5점 척도로 점수를 매긴다. "공감 정도", "자연스러움" 같은 주관적 지표에 적합하다.

E2E 평가에서 주류 방식은 **LLM-as-judge**다. 다른 LLM에게 "이 답변을 평가해줘"라고 시키는 것이다. 사람보다 빠르고 일관성 있지만, LLM judge 자체의 편향이 있을 수 있다. 그래서 주요 결정(프롬프트 대규모 변경, 모델 교체 등)에서는 **Human review를 병행**한다.

### Component 평가 (단계별)

파이프라인의 각 단계를 독립적으로 평가한다. E2E에서 "답변이 이상하다"는 걸 발견했을 때, **어느 단계가 문제인지** 찾으려면 Component 평가가 필요하다.

```text
[검색기(Retriever)] → [도구 선택] → [도구 실행 순서] → [응답 생성]
     ^                    ^                ^                 ^
     |                    |                |                 |
  Context               Tool             Trajectory       Answer
  Precision/Recall    Accuracy           Accuracy         Quality
```

- **문서 검색 평가**: "유저가 고양이에 대해 물었을 때, 과거 고양이 대화가 검색 결과에 포함되었는가?" 우리 프로젝트에서는 pgvector 시맨틱 검색의 정확도를 여기서 측정한다.
- **도구 선택 평가**: 에이전트가 여러 도구를 쓸 수 있을 때, 맞는 도구를 골랐는가? (현재 우리 NPC는 도구가 적지만, 나중에 아이템 추천, 날씨 조회 등이 추가되면 필요해진다.)
- **Trajectory 평가**: 도구를 올바른 순서로 실행했는가? "먼저 기억을 검색하고, 그 다음 응답을 생성했는가" vs "기억 검색 없이 바로 답변했는가"

### 빅테크는 어떻게 하나

**Anthropic** — "Eval-driven development"를 표방한다. TDD에서 테스트를 먼저 쓰듯이, eval을 먼저 정의하고 그 eval을 통과하도록 에이전트를 개발한다. 자동화된 eval을 수천 개 task에 실행한다.

**Google** — Game theory 기반의 credit attribution을 사용한다. 파이프라인의 어느 컴포넌트가 최종 품질에 얼마나 기여했는지를 게임 이론으로 분석한다. 실시간 autorater로 에러가 cascade되기 전에 잡는다.

**Amazon** — 도구 선택 정확도, 다단계 추론 일관성, 메모리 검색 효율, task 완료율 등 실용적 메트릭에 집중한다.

---

## pass@k와 pass^k — 데모 성능과 실사용 성능의 격차

이 개념은 에이전트 평가에서 가장 직관적이면서 중요한 통찰을 준다.

### pass@k: "k번 중 한 번이라도 성공"

```text
pass@k = 1 - (1-p)^k
```

p는 한 번 시도했을 때 성공 확률이다. k번 시도 중 **최소 1번 성공**할 확률을 나타낸다.

이건 에이전트의 **최대 잠재 성능**이다. 데모에서 보여주는 값이 이것이다. "3번 돌려서 가장 좋은 결과를 보여줄게요."

### pass^k: "k번 모두 성공"

```text
pass^k = p^k
```

k번 연속으로 **모두 성공**할 확률이다. 이건 사용자가 **실제로 체감하는 신뢰도**다. 사용자는 한 번만 쓰는 게 아니라 반복해서 쓴다.

### 숫자로 보면 격차가 보인다

단일 시도 성공률 p = 0.75(75%)인 에이전트가 있다고 하자.

| 메트릭 | k=1 | k=3 | k=5 |
|--------|-----|-----|-----|
| pass@k (한 번이라도 성공) | 75% | **98%** | 99.9% |
| pass^k (모두 성공) | 75% | **42%** | 24% |

데모에서 3번 돌려서 "98% 성공률입니다!"라고 말할 수 있지만, 사용자가 3번 연속 사용했을 때 매번 만족할 확률은 42%에 불과하다.

**이 격차가 "배포 불안"의 원인이다.** 개발 중에는 잘 되는 것 같은데 사용자 불만이 쏟아지는 이유. pass@k와 pass^k의 차이를 이해하면, "왜 테스트에서는 잘 됐는데 프로덕션에서 문제인가?"에 대한 답이 된다.

### 우리 프로젝트에 적용한다면

NPC 답변의 단일 시도 품질(p)을 높이는 것이 최우선이다. pass@k를 올리는 것(여러 번 생성해서 좋은 것 고르기)은 비용이 들고, 실시간 대화에서는 지연이 발생한다. p 자체를 높이려면:

- 프롬프트 최적화 (NPC 성격, 톤 가이드를 더 구체적으로)
- 시맨틱 검색 품질 향상 (임베딩 모델 업그레이드, 청크 전략 개선)
- 컨텍스트 윈도우 관리 (관련 기억만 정확히 넣기)

---

## 평가 도구 생태계

| 도구 | 라이선스 | 핵심 특징 | 적합한 상황 |
|------|----------|-----------|-------------|
| **LangSmith** | 상용 | CI/CD 통합, trajectory 캡처, 온/오프라인 eval | LangChain 생태계 사용 시. 가장 완성도 높은 상용 플랫폼 |
| **DeepEval** | Apache-2.0 | 50+ 메트릭, pytest 통합 | Python 테스트 프레임워크와 통합하고 싶을 때 |
| **Arize Phoenix** | ELv2 | OpenTelemetry 기반, 셀프호스팅 | 관측성(observability)과 eval을 한 곳에서 관리하고 싶을 때 |
| **Braintrust** | 상용 | GitHub Action 통합 | CI/CD에서 자동 eval을 돌리고 싶을 때 |
| **Langfuse** | MIT | 오픈소스, 관측성 + eval | 셀프호스팅 + 완전 오픈소스가 필요할 때 |
| **RAGAS** | Apache-2.0 | RAG 특화, synthetic testset 생성 | RAG 파이프라인 평가에 집중할 때 |

우리 프로젝트는 Spring + Java 기반이지만, eval 파이프라인만 Python으로 별도 구성하는 것도 일반적인 패턴이다. LLM API 호출 자체는 언어에 구애받지 않으니, eval 스크립트를 Python으로 작성하고 CI에서 돌리는 방식이 현실적이다.

---

## 학습 커리큘럼 (강의 로드맵)

> 인프런 "안정적인 AI 에이전트 서비스 운영을 위한 평가(Evaluation) 방법" (제이쓴)
> 선수 지식: Python, LangChain, LangGraph
> 실습 환경: Python 3.13+, LangSmith 계정
> 총 분량: 약 3시간 16분

| 섹션 | 주제 | 분량 | 핵심 내용 |
|------|------|------|-----------|
| 1 | AI 에이전트 평가 필요성 | 9분 | 왜 전통 테스트로 부족한가 |
| 2 | 평가란 무엇인가 + 왜 해야 하나 | 19분 | 비결정성, 비정형 출력, 동적 시스템 |
| 3 | Golden Dataset 생성 | 1시간 4분 | RAGAS, 커스텀 에이전트, Claude Code Skill. 실습 포함 |
| 4 | 평가 지표 설계 | 1시간 15분 | E2E(binary/scored), Component(retriever/tool/trajectory) |
| 5 | pass@k, pass^k 심화 | 22분 | 잠재 성능 vs 일관성 성능. 수식과 사례 |
| 6 | 전체 복습 + 서비스 맞춤 전략 | 5분 | 요약 |

섹션 3(Golden Dataset)과 섹션 4(평가 지표)가 전체 분량의 70%를 차지한다. 이론보다 실습 비중이 높은 강의 구조다.

---

## 실전에서 주의할 점

- **eval 없이 프롬프트를 바꾸지 마라.** "이게 더 나아 보여서"로 프롬프트를 수정하면, 다른 케이스에서 regression이 발생해도 모른다. 변경 전후를 eval로 비교하는 습관이 핵심이다.
- **LLM-as-judge의 한계를 인식하라.** judge LLM도 편향이 있다. 특히 긴 답변을 높이 평가하는 경향(verbosity bias), 자기 모델의 출력을 높이 평가하는 경향(self-preference bias)이 알려져 있다. 중요한 판단은 사람이 검증한다.
- **Golden Dataset의 품질이 eval의 천장이다.** 정답지가 엉망이면 아무리 좋은 eval 메트릭을 써도 의미 없다. 처음에 시간을 들여서 seed data를 잘 만드는 것이 장기적으로 이득이다.
- **평가 메트릭을 한꺼번에 다 도입하지 마라.** 처음에는 Faithfulness(환각 방지)와 Answer Relevancy(질문-답변 관련성) 두 가지만으로도 충분하다. 메트릭이 너무 많으면 어떤 메트릭을 우선해야 할지 혼란이 온다.
- **Component 평가를 건너뛰면 디버깅이 어렵다.** E2E에서 "답변이 나쁘다"는 건 알겠는데, 검색이 문제인지 프롬프트가 문제인지 모르면 개선할 수 없다. 파이프라인의 각 단계를 독립적으로 측정할 수 있는 구조를 처음부터 만들어둔다.

---

## 나중에 돌아보면

- **유저 수가 늘면 실시간 모니터링이 필수가 된다.** 지금은 오프라인 eval(배포 전 테스트)로 충분하지만, DAU가 수천 이상이 되면 프로덕션 트래픽에 대한 실시간 eval(온라인 eval)이 필요해진다. Arize Phoenix나 Langfuse의 관측성 기능이 이때 빛을 발한다.
- **모델을 교체할 때 eval이 가장 큰 가치를 발휘한다.** Ollama 로컬 모델에서 클라우드 LLM으로 전환하거나, 모델 버전을 올릴 때, eval suite가 있으면 "이 모델이 더 나은가?"를 데이터로 판단할 수 있다.
- **유저 피드백을 Golden Dataset에 반영하는 루프가 성숙의 핵심이다.** "유저가 NPC 답변에 실망한 사례"를 수집해서 eval dataset에 추가하면, 시간이 지날수록 eval이 실제 사용자 경험에 가까워진다.

---

## 더 공부할 거리

### 핵심 레퍼런스

- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — Anthropic이 직접 쓴 eval 가이드. Eval-driven development의 원본.
- [RAGAS 공식 문서](https://docs.ragas.io/en/stable/) — RAG 평가 프레임워크. Golden Dataset 자동 생성부터 메트릭까지.
- [RAGAS 논문 (arXiv)](https://arxiv.org/abs/2309.15217) — Faithfulness, Relevancy 등 메트릭의 수학적 정의가 궁금하면.
- [pass@k 해설 (Phil Schmid)](https://www.philschmid.de/agents-pass-at-k-pass-power-k) — pass@k와 pass^k의 직관적 설명.

### 빅테크 사례

- [LangChain: State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering) — 업계 전체의 에이전트 개발 트렌드.
- [Google Cloud: AI Agent Trends 2026](https://cloud.google.com/resources/content/ai-agent-trends-2026) — Google의 에이전트 평가 접근법 포함.
- [Amazon: Evaluating AI Agents](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/) — Amazon의 실전 교훈.

### 평가 도구

- [LangSmith Evaluation](https://www.langchain.com/langsmith/evaluation) — 가장 완성도 높은 상용 eval 플랫폼.
- [DeepEval (GitHub)](https://github.com/confident-ai/deepeval) — pytest 통합 오픈소스 eval.
- [Arize Phoenix (GitHub)](https://github.com/Arize-ai/phoenix) — OpenTelemetry 기반 관측성 + eval.
- [Langfuse](https://langfuse.com/) — MIT 라이선스 오픈소스 관측성.
- [Braintrust](https://www.braintrust.dev/) — GitHub Action CI 통합.
- [Golden Dataset 구축 가이드 (Maxim AI)](https://www.getmaxim.ai/articles/building-a-golden-dataset-for-ai-evaluation-a-step-by-step-guide/) — 단계별 Golden Dataset 구축 방법.

### 이 주제를 더 깊이 파려면

- **LLM-as-judge의 편향 문제**: "Judging LLM-as-a-Judge" 류의 논문들이 judge LLM의 한계를 분석한다.
- **RAG 평가 메트릭의 수학적 기반**: RAGAS 논문을 읽고, Faithfulness 계산 과정을 직접 따라가보면 메트릭의 한계가 보인다.
- **A/B 테스트와 eval의 관계**: 오프라인 eval로 후보군을 줄이고, 온라인 A/B 테스트로 최종 판단하는 2단계 접근이 대규모 서비스의 표준이다.
