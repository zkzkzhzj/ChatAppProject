# Anthropic 2026 연구 동향

> 마지막 업데이트: 2026-04-12

---

## Managed Agents API (2026-04-08 공개 베타)

**출처**: <https://thenewstack.io/with-claude-managed-agents-anthropic-wants-to-run-your-ai-agents-for-you/>

### 개념

에이전트 인프라(샌드박싱, 장기 세션, 상태 유지, 툴 실행, 트레이싱)를 Anthropic이 직접 서비스로 제공.

### 구조

- **단일 에이전트**: GA (정식 출시)
- **멀티 에이전트 코디네이션**: 리서치 프리뷰 (코디네이터 에이전트 → 워커 에이전트 위임)
- **베타 헤더**: `managed-agents-2026-04-01`
- **비용**: 표준 토큰 요금 + $0.08/세션시간

### 엔지니어링 관점

에이전트 인프라(재시작 복구, 세션 상태, 컨테이너 격리)를 직접 구축하지 않아도 됨. 장시간 실행 에이전트(수분~수시간)를 프로덕션에 투입 가능.

### 이 프로젝트 적용 가능성

Phase 5 AI NPC 구현 시 `GenerateNpcResponsePort` 구현체를 Managed Agents로 교체 검토.

---

## Trustworthy Agents (2026-04-02)

**출처**: <https://www.anthropic.com/research/trustworthy-agents>

### 신뢰 가능한 에이전트 5원칙

1. 인간 제어 유지
2. 가치 정렬
3. 상호작용 보안
4. 투명성
5. 프라이버시 보호

### Plan Mode

에이전트가 실행 전 계획을 사용자에게 제시 → 승인 후 실행. **핵심 미해결 과제**: "언제 멈추고 확인을 요청할지 판단".

### 이 프로젝트 적용

에이전트가 ERD 변경, 새 도메인 추가 등 큰 작업 전에 계획 먼저 제시하는 패턴 적용.

---

## 에러 비일관성 연구 (2026-01)

**출처**: <https://arxiv.org/abs/2601.23045> | <https://alignment.anthropic.com/2026/hot-mess-of-ai/>

### 핵심 발견

- 태스크가 어려워지고 추론이 길어질수록, 모델 실패는 **비일관성(incoherence) 지배**
- 모델 크기가 클수록 어려운 태스크에서 비일관성 증가
- 미래 AI 사고: "목표 잘못 설정된 일관된 오류"보다 "예측 불가능한 행동"에 가까울 것

### 엔지니어링 관점

긴 추론 체인보다 **중간 체크포인트 + 검증 스텝 분할**이 더 안전. 에러 감지 전략을 "의도 검사"보다 "출력 일관성 검사"로 설계.

### 이 프로젝트 적용

복잡한 에이전트 작업(멀티스텝 구현)은 단계별로 검증. Cucumber BDD가 이 역할을 담당.

---

## 모델 현황 (2026-04 기준)

| 모델 | 컨텍스트 | 특징 |
|------|---------|------|
| Claude Opus 4.6 | 1M 토큰 (베타) | 멀티스텝 추론 강화, 법률/금융/코딩 최상위 |
| Claude Sonnet 4.6 | 1M 토큰 (베타) | 에이전틱 검색 성능, 확장 사고 |
| Claude Haiku 4.5 | - | 빠른 응답, 비용 효율 |

### 주요 API 업데이트

- 웹 검색(`web_search`) + 웹 패치(`web_fetch`) GA
- **코드 실행은 웹 검색/패치와 함께 사용 시 무료**
- Message Batches API max_tokens 30만 토큰 상향

---

## 2026-02

### Anthropic RSP v3.0 — Risk Report 체계 도입 (2026-02-24)

**출처**: <https://anthropic.com/feb-2026-risk-report> | <https://www.governance.ai/analysis/anthropics-rsp-v3-0-how-it-works-whats-changed-and-some-reflections>

Anthropic이 Responsible Scaling Policy v3.0을 발표하며 **Risk Report** 체계를 새롭게 도입.

- Risk Report: 모델 출시 시점의 위협 모델, 리스크 경감 조치, 전반적 위험도 평가를 공개 문서로 발행
- Frontier Safety Roadmap: 비구속적 안전 목표 로드맵 추가
- Claude Opus 4.6 Sabotage Risk Report (2026-02-11): "Opus 4.6의 잘못 정렬된 행동으로 인한 파국적 결과 가능성은 매우 낮으나 무시할 수 없음"

**마음의 고향 적용 의미**: 에이전트 기능 도입 전 위험도 평가를 명문화하는 패턴을 내부 ADR 프로세스에 반영할 수 있음.

---

### Anthropic Economic Index — 디렉티브 자동화 급증 (2026-02)

**출처**: <https://www.anthropic.com/research/economic-index-march-2026-report> | <https://resources.anthropic.com/2026-agentic-coding-trends-report>

2026-02 사용 데이터 분석 결과:

- **디렉티브 자동화 비율**: 2024-12 대비 27% → 39%로 상승 (기업이 소비자보다 자동화 속도 빠름)
- **코딩 작업 이동**: Claude.ai → 1st party API (Claude Code)로 급격히 이동 중
- **태스크 다양화**: Top 10 태스크 비중이 24% → 19%로 감소 (스포츠, 제품 비교, 홈 유지보수 등 일상 용도 증가)
- **직업 침투율**: 49%의 직업에서 최소 25%의 태스크를 Claude로 처리

**마음의 고향 적용 의미**: AI NPC 설계 시 "지시(directive)" 기반 대화와 "대화(conversational)" 기반 대화를 명확히 분리해야 함.

---

## 2026-03

### Anthropic Economic Index — Learning Curves (2026-03)

**출처**: <https://www.anthropic.com/research/economic-index-march-2026-report>

2026 Agentic Coding Trends Report 주요 내용:

- 소프트웨어 개발이 "코드 작성"에서 "코드 작성 에이전트 오케스트레이션"으로 전환
- 2026 기준 에이전트가 수일에 걸쳐 애플리케이션 전체를 빌드하는 사례 등장
- Zapier: 전 조직 89% AI 채택, 내부에 800개 이상 AI 에이전트 배포

**마음의 고향 적용 의미**: Phase 5 AI NPC는 단순 응답 봇이 아닌 장시간 실행 에이전트 패턴으로 설계해야 할 시점이 다가오고 있음.
