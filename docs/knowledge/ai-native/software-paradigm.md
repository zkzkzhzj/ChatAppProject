# 소프트웨어 패러다임 전환

> 마지막 업데이트: 2026-04-12
> 출처: Karpathy YC AI Startup School 키노트 (2025.06), X 포스트 (2026.01)

---

## Software 3.0

**출처**: <https://www.latent.space/p/s3> | <https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again>

### 세대 구분

- **Software 1.0**: 명시적 코드 (if/else, 알고리즘)
- **Software 2.0**: 신경망 가중치 (데이터로 학습된 행동)
- **Software 3.0**: 자연어 프롬프트로 LLM을 프로그래밍

### 핵심 메시지

영어가 새로운 프로그래밍 언어가 되었다. 이는 단순한 생산성 향상이 아니라 **소프트웨어 패러다임 자체의 전환**이다. 누구나 소프트웨어를 만들 수 있는 민주화가 발생했으나, 동시에 전문 엔지니어의 가치는 더 높아졌다.

### 이 프로젝트에서의 의미

- 기획 문서(자연어)가 곧 에이전트에게 주는 명세
- CLAUDE.md, AGENTS.md, SKILL.md 등이 Software 3.0의 "소스 코드"

---

## LLM OS

**출처**: <https://huggingface.co/blog/shivance/illustrated-llm-os>

### 개념

LLM은 단순한 API가 아니라 **새로운 운영체제**다.

| OS 구성요소 | LLM OS 대응 |
|------------|------------|
| CPU | LLM 추론 능력 |
| RAM | 컨텍스트 윈도우 |
| 파일 시스템 | RAG / 지식 베이스 |
| 프로세스 | 에이전트 |
| 시스템 콜 | MCP 툴 |

### 현재 시대 위치

1960년대 메인프레임 시대와 유사: 연산이 비싸고 클라우드에 집중. LLM 제공자(Anthropic, OpenAI)는 유틸리티 기업에 비유됨.

### 이 프로젝트에서의 의미

- **컨텍스트 윈도우 관리**가 핵심 엔지니어링 역량
- `docs/knowledge/` = 파일 시스템 (RAG)
- 에이전트들 = 프로세스
- MCP 연결(PostgreSQL, Redis) = 시스템 콜

---

## Vibe Coding → Agentic Engineering

### Vibe Coding (2025.02 — 이미 구식)

**출처**: <https://x.com/karpathy/status/1886192184808149383>

Karpathy가 처음 제시한 개념: LLM에 완전히 의존, diff도 안 읽고 Accept All. 빠른 프로토타이핑에는 유효하나 **프로덕션 코드에는 부적합**. Karpathy 본인도 이후 "passé(구식)"라고 선언.

### Agentic Engineering (2026.01~)

**출처**: <https://buttondown.com/verified/archive/the-end-of-vibe-coding-andrej-karpathys-shift-to/>

Karpathy: **2025년 12월부터 코드를 직접 쓰지 않는다.** 에이전트가 80% 처리, 본인은 자연어로 오케스트레이션.

**새 개발자 역할:**

- 코드 생산자 → **에이전트 오케스트레이터 + 시스템 아키텍트**
- 기술적 깊이가 있을수록 에이전트를 더 잘 활용 (전문성의 승수 효과)

### Karpathy의 경고 (2025.10)

**출처**: <https://fortune.com/2025/10/21/andrej-karpathy-openai-ai-bubble-pop-dwarkesh-patel-interview/>

- 에이전트는 여전히 취약하고 예측 불가능
- 추론 능력 부족 + 환경 인식 부족 + 도구 사용 미숙
- **"Partial Autonomy + Human Oversight" 구조가 현실적**

### 이 프로젝트에서의 의미

- 사용자 = 오케스트레이터 (방향 설정 + 최종 승인)
- Claude Code 에이전트들 = 구현 + 테스트 + 리뷰 실행
- 감독 없는 자율 배포는 금지

---

## 2026-02: MicroGPT & Ambient Programming (Karpathy)

**출처**: <https://simonwillison.net/2026/Feb/26/andrej-karpathy/> | <https://eu.36kr.com/en/p/3606454820996104>

### MicroGPT 공개

- 243줄의 순수 Python + 기초 수학으로 GPT 학습/추론 구현 (PyTorch 없음)
- nanoGPT, llm.c의 계승작. "인간과 미래 에이전트 모두가 이해하고 확장할 수 있도록" 설계
- 목적: LLM 알고리즘 자체를 AI 에이전트가 수정 가능한 수준으로 단순화

### Ambient Programming

Karpathy: "지난 2개월간 프로그래밍이 얼마나 변했는지 말로 설명하기 어렵다. 점진적 발전이 아닌 패러다임 전환이다."

- 코드를 직접 쓰는 시간이 급격히 감소 (2026-02 기준)
- "Ambient Programming": 에이전트가 배경에서 상시 작동, 개발자는 의도와 검증에 집중

**마음의 고향 적용 의미**: 기획 문서(자연어)를 더 정밀하게 유지할수록 에이전트 출력 품질이 높아짐 — docs 품질이 곧 코드 품질.

---

## 2026-03: Karpathy Autoresearch — 자율 루프 AI

**출처**: <https://github.com/karpathy/autoresearch> | <https://www.nextbigfuture.com/2026/03/andrej-karpathy-on-code-agents-autoresearch-and-the-self-improvement-loopy-era-of-ai.html> | <https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/>

### 개념

AI 에이전트에게 소규모 ML 학습 환경을 주고 자율적으로 실험하도록 설계. "5분 학습 → 결과 확인 → 유지/폐기 → 반복" 루프.

### 결과

- 2일 동안 700번 실험 자동 수행
- 20개 최적화 발견 → 더 큰 LLM에 적용 시 훈련 속도 11% 향상
- 구현: 3개 파일 (1개 고정, 1개 에이전트 도메인, 1개 Markdown 지시서)

### 실세계 적용 (Shopify CEO Tobi Lütke)

동일 패턴을 Shopify의 Liquid 템플릿 엔진에 적용 → 하룻밤에 93개 자동 커밋 → 렌더링 53% 빠르게 + 메모리 61% 절감.

### Karpathy의 2026-03 선언

"우리는 지금 Agentic Engineering 시대에 있다. 인간은 더 이상 코드 대부분을 직접 쓰지 않는다. 방향 제시, 감독, 오케스트레이션이 개발자의 핵심 역할이다. 2025-12 에이전트가 coherence threshold를 넘었다."

**마음의 고향 적용 의미**: research-agent의 `/loop` 크론 + autoresearch 패턴을 결합하면 도메인 설계 개선을 자율 루프로 돌릴 수 있음. 단, Karpathy 본인도 감독 없는 자율 배포에는 경고를 유지하고 있음.

---

## 2026-03: AI Native Engineering 현황 조사

**출처**: <https://newsletter.pragmaticengineer.com/p/ai-tooling-2026> | <https://www.digiratina.com/blogs/ai-native-software-engineering-the-future-of-2026/>

### 업계 현황 (2026-03 기준)

- 95%의 엔지니어가 AI 툴을 주 1회 이상 사용
- 75%가 전체 업무의 절반 이상에 AI 사용
- 56%가 엔지니어링 업무의 70% 이상을 AI와 수행

### 병목점의 이동

"2026년 소프트웨어 개발의 병목은 더 이상 코드를 빠르게 쓰는 것이 아니다. **무엇을 만들 것인가를 결정하고, 그 결정이 옳은가를 검증하는 것**이 병목이다. AI가 잘못된 것을 탁월하게 빠르게 만들어줄 위험이 가장 크다."

### Engineer-in-the-Loop 원칙

- AI 생성 코드의 검증, 프로젝트 요구사항 적용, 보안 패턴 감지는 여전히 인간 역할
- AI 출력의 기원, 수정 내용, 변경 이유를 문서화하는 것이 필수로 부상

**마음의 고향 적용 의미**: CLAUDE.md의 Verification Checklist와 ADR 작성 의무가 AI Native Engineering의 "Engineer-in-the-Loop" 원칙과 정확히 일치함.
