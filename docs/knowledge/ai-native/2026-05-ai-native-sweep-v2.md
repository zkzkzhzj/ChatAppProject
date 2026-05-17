---
last-verified: 2026-05-17
tags: [ai-native, claude-code, mcp, ai-eval, agents-md, lmops, competitive]
scope: 마음의 고향 (Spring Boot 4.x + Next.js, AI Native dev env). sweep v1 누락 영역 보강.
trigger: "sweep v1 (2026-05-16) 작성 후 '최신정보 더 없나' — 1차 출처 깊이 + 6개 누락 축 보강"
parent: docs/knowledge/ai-native/2026-05-ai-native-sweep.md
---

# 2026-05 AI Native 스위프 v2 — 누락 6축 깊이 보강

> sweep v1 = 4섹션 (MD vs HTML / Agent OS / Skills 진화 / Claude Code 신기능).
> 본 v2 = sweep v1 이 비워둔 **6개 축**을 깊이 + 1차 출처로 보강.
> 각 섹션 끝에 우리 프로젝트 적용 매트릭스 + 문서 끝에 **v1+v2 통합 매트릭스**.

핵심 트리거: **Code w/ Claude 2026 (5-6 SF) + 5월 Anthropic 발표 4종 (Memory / Dreaming / Outcomes / Multiagent Orchestration / Webhooks)** 이 v1 작성 직전·직후 발생. v1 이 이를 깊이 다루지 못함. 추가로 MCP / AI Eval / AGENTS.md / LMOps / 경쟁환경은 v1 의 스코프 밖이었음.

---

## A. MCP (Model Context Protocol) 생태계 2026 진화

### A.1 표준 현황 — 2025-06-18 spec, 2026-Q1 SEP, 2026-06 다음 릴리즈 예정

- 공식 spec: `modelcontextprotocol.io/specification/2025-11-25/...`
- 두 가지 공식 transport: **STDIO** (로컬, 인증 불요) + **Streamable HTTP** (원격, OAuth 2.1 의무)
- 다음 spec release: 2026 Q1 SEP (Spec Enhancement Proposals) 마감, 2026-06 정식 릴리즈 tentative

핵심 출처:
- [Model Context Protocol — Authorization spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [MCP Blog — Future of MCP Transports (2025-12-19)](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/)
- [Stack Overflow — Is that allowed? Auth in MCP (2026-01-21)](https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol/)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)

### A.2 서버 생태계 규모

| 출처 | 2026-05 시점 서버 수 |
|------|-----------|
| modelcontextprotocol/servers (공식 reference) | 6 (Everything / Fetch / Filesystem / Git / Memory / Sequential Thinking) + 500+ community 표기 |
| Official Registry (registry.modelcontextprotocol.io) | 점진 확대 중 |
| mcp.so (커뮤니티) | 3,000+ |
| PulseMCP | 15,090+ (daily update) |
| Glama Open-Source Registry | 23,754 |

→ **공식 표준화·검증된 서버는 여전히 적고**, 대다수는 커뮤니티 자체 발행.

출처:
- [modelcontextprotocol/servers GitHub](https://github.com/modelcontextprotocol/servers)
- [PulseMCP — MCP Server Directory](https://www.pulsemcp.com/servers)
- [Glama MCP Registry](https://glama.ai/mcp/servers)
- [TokenMix — MCP Servers List 2026: 70+ Production Servers](https://tokenmix.ai/blog/mcp-servers-list-2026-complete-directory)

### A.3 우리 백엔드 (PostgreSQL · Cassandra · Redis · Kafka) 와 MCP 서버 매핑

| 우리 인프라 | 사용 가능한 MCP 서버 | 성숙도 | 인증 모델 | 위험도 |
|-----------|------------------|--------|----------|--------|
| PostgreSQL | (1) `@modelcontextprotocol/server-postgres` (Anthropic, **2025-05-29 archived, 미패치**) <br> (2) Zed 패치 fork `@zeddotdev/postgres-context-server v0.1.4` <br> (3) Azure Database for PostgreSQL MCP (preview) <br> (4) hthuong09/postgres-mcp (configurable auth) <br> (5) neverinfamous/postgres-mcp (OAuth 2.1 + 감사 로그) | **CRITICAL** — 원본 SQL injection 취약 (CVE 미발급, Datadog 보고) | 53% 서버가 정적 API key / PAT (출처: NimbleBrain) | 매우 높음 |
| Redis | `mcp-server-redis` (커뮤니티) | 중간 | Bearer / Redis ACL | 중간 |
| Kafka | `mcp-server-kafka` (개별 발행 다수) | 낮음 — 표준화 안 됨 | 미정 / Bearer | 높음 |
| Cassandra | 1차 검색 결과 없음 [검증 필요] | — | — | — |

**우리에게 핵심인 보안 사실**:
- 원본 Anthropic postgres MCP 서버 v0.6.2 는 npm 에서 **여전히 21,000+ 주간 다운로드** + **미패치**. `client.query` 가 `;` 로 구분된 다중 SQL 받음 → `COMMIT; DROP TABLE users;` 로 read-only 우회.
- 53% MCP 서버가 정적 API key / Personal Access Token. **OAuth 사용은 8.5% 뿐.**
- 2026-05-13 The Register: Apache Doris / Alibaba RDS / Apache Pinot MCP 서버에서 추가 SQL injection 발견 — 한 곳은 패치 거부.

출처 (1차):
- [Datadog Security Labs — SQL injection in Postgres MCP server](https://securitylabs.datadoghq.com/articles/mcp-vulnerability-case-study-SQL-injection-in-the-postgresql-mcp-server/)
- [NimbleBrain — State of MCP Security March 2026](https://nimblebrain.ai/blog/state-of-mcp-security-2026/)
- [The Register — Bug hunter tracks down three massive MCP flaws (2026-05-13)](https://www.theregister.com/security/2026/05/13/bug-hunter-tracks-down-three-serious-mcp-database-flaws-one-left-unpatched/5238916)
- [Node.js Security — Bypassing read-only mode in Xata's MCP](https://www.nodejs-security.com/blog/sql-injection-and-bypassing-read-only-mode-in-xata-mcp-server)
- [GitHub Advisory — executeautomation/mcp-database-server read-only bypass](https://github.com/executeautomation/mcp-database-server/security/advisories/GHSA-65hm-pwj5-73pw)
- [neverinfamous/postgres-mcp (OAuth 2.1 + audit logging)](https://github.com/neverinfamous/postgres-mcp)
- [Microsoft — Azure Database for PostgreSQL MCP Server (Preview)](https://techcommunity.microsoft.com/blog/adforpostgresql/introducing-model-context-protocol-mcp-server-for-azure-database-for-postgresql-/4404360)

### A.4 Spring Boot 가 MCP server 가 되는 길 — Spring AI Boot Starters

Spring AI 1.0 GA (2025-05-20) 이후 MCP 지원이 안정화. 1.1 GA (2025-11-12) + 2.0 M1 (2025-12-11) 으로 진화.

핵심 모듈:
- `spring-ai-starter-mcp-server` — Spring Boot 앱을 MCP 서버로 노출
- `spring-ai-starter-mcp-client` — 외부 MCP 서버 호출
- 어노테이션 4종: `@McpTool` / `@McpResource` / `@McpPrompt` / `@McpComplete`
- Transport: STDIO / SSE / **Streamable-HTTP** / stateless
- 2026 권고 스택: Spring Boot 3.4+ / Spring AI 1.0+ / Java 21

우리에게 직접적인 의미: **백엔드 서비스 (`backend/.../communication/adapter/out/...`) 가 그대로 MCP 서버가 될 수 있음.** 별도 게이트웨이 / 사이드카 없이 우리 도메인 로직을 Claude / Cursor / Codex 에 노출 가능.

출처 (1차):
- [Spring AI MCP Server Boot Starter (공식 docs)](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html)
- [Spring AI MCP Client Boot Starter](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)
- [Spring.io blog — Spring AI MCP Intro (2025-09-16)](https://spring.io/blog/2025/09/16/spring-ai-mcp-intro-blog/)
- [Spring AI 1.0 GA (2025-05-20)](https://spring.io/blog/2025/05/20/spring-ai-1-0-GA-released/)
- [Spring AI 1.1 GA (2025-11-12)](https://spring.io/blog/2025/11/12/spring-ai-1-1-GA-released/)
- [Spring AI 2.0.0-M1 (2025-12-11)](https://spring.io/blog/2025/12/11/spring-ai-2-0-0-M1-available-now/)
- [Piotr's TechBlog — Spring AI with External MCP Servers (2026-02-06)](https://piotrminkowski.com/2026/02/06/spring-ai-with-external-mcp-servers/)
- [Vijayakumar Easwaran — Building Scalable Enterprise MCP Server with Spring Boot AI (2026-04)](https://medium.com/@easwaranvijayakumar/building-a-scalable-enterprise-mcp-server-with-spring-boot-ai-de7dd68bd2cd)
- [Baeldung — Exploring MCP With Spring AI](https://www.baeldung.com/spring-ai-model-context-protocol-mcp)

### A.5 보안·인증 모델 — PostgreSQL MCP 직접 호출 시

우리 시나리오 (예: 운영 중 Claude Code 에서 "마음의 고향 DB 의 NPC 통계 보여줘" → MCP 가 직접 PG 쿼리) 에서 적용해야 할 보안 패턴 (Datadog + NimbleBrain 권장 종합):

1. **읽기 전용 DB user 분리** — MCP 가 사용하는 connection 은 별도 PG role + row-level security
2. **OAuth 2.1 + Bearer token rotation** — 정적 API key 금지
3. **SQL 다중 문 차단** — driver 레벨에서 `;` 다중 명령 분리 차단 (Anthropic 원본 취약점의 직접 원인)
4. **TLS 강제 + scram-sha-256** — `pg_hba.conf` 에서 MCP 연결만 SSL 의무
5. **감사 로그** — 모든 MCP 쿼리 logging (특히 ddl/dml 분리)
6. **Stdio (로컬) 우선** — 운영 PG 에 원격 MCP 직노출 금지. 개발자 워크스테이션 로컬 stdio 만.

### A.6 우리 프로젝트 적용 매트릭스 — 섹션 A

| 시나리오 | 가치 | 위험 | 도입 권고 |
|---------|------|------|---------|
| 운영 PG 에 MCP 서버 직노출 (원격) | 중간 (개발자 디버깅) | **매우 높음** (SQL injection, 권한 누출) | **보류** |
| 로컬 dev PG 에 MCP (stdio, 읽기 전용 role) | 높음 (Claude Code 가 schema 인식하며 코드 작성) | 낮음 | **조건부** (전용 role + 감사) |
| Redis MCP (로컬 dev) | 중간 (캐시 키 patterns 디버깅) | 낮음 | **조건부** |
| Kafka MCP | 낮음 (도메인 이벤트 흐름 점검은 따로 도구가 있음) | 중간 (서버 미성숙) | **보류** |
| Spring Boot 앱 자체를 MCP 서버로 변환 (`@McpTool`) | 매우 높음 — 우리 도메인 use case 를 Claude 에 직접 노출 | 중간 — 신규 attack surface | **조건부 (트랙 분리 후 시범)** |
| Notion / Linear / GitHub 등 SaaS MCP | 낮음 — 우리는 GitHub 외 SaaS 안 씀 | 낮음 | **보류** |

**1차 판단**: **조건부 도입 — 로컬 dev 환경 한정 + Spring Boot MCP server 변환은 spec 트랙으로 분리.** 운영 PG 직노출은 보류.

---

## B. AI Agent Evaluation 도구 — NPC 트랙 사전 ADR 보강 (learning 68)

### B.1 6개 도구 비교 (2026-05 시점)

| 도구 | 라이선스 | 셀프호스트 | Spring AI 통합 | 강점 | 약점 | 가격 |
|------|---------|----------|-------------|------|------|------|
| **Langfuse** | MIT (open) | ✅ Docker / K8s / VM | ✅ OTel native + 자바 SDK | OTel 표준 기반 / 풀 셀프호스트 / prompt 관리 | OTel agent 필요 시 LLM metadata 일부 누락 (Java 통합 이슈 #5746) | Free SH / Cloud Hobby Free |
| **LangSmith** | Closed (LangChain Inc.) | ❌ | ✅ (LangChain Spring AI) | LangChain 생태 / NVIDIA 파트너 / 2026-03 Sandboxes | LangChain 종속 / per-trace pricing | $39/seat/mo + traces |
| **Arize Phoenix** | **ELv2** (open-ish, 상용 제한) | ✅ (PostgreSQL + K8s 필요) | ✅ OTel | 풀 OSS UI / OTel 표준 / eval template | 운영 부담 큼 (PG + K8s) / ELv2 라이선스 제약 | Free OSS / Pro $50/user |
| **Braintrust** | Closed | ❌ | ⚠️ 별도 SDK | "quality management system" / CI/CD eval + deployment blocking / regression auto-detect | SaaS only / vendor lock | Free + usage-based Pro |
| **Helicone** | **Apache 2.0** | ✅ proxy 형태 | ✅ (proxy 라 코드 변경 없음) | drop-in proxy / 코드 미변경 / 비용 추적 단순 | eval 기능 약함 / OpenAI 친화 (Anthropic 도 OK) | Free + request-based |
| **OpenAI Evals** | OSS (CLI) | ✅ (CLI) | ❌ | 모델 평가 표준 / 모든 OpenAI-compatible 모델 | offline 평가 위주 / 트레이싱 약함 | Free CLI |

핵심 출처 (1차):
- [Langfuse 공식 (MIT, self-host)](https://langfuse.com/)
- [Langfuse — Self-hosting](https://langfuse.com/self-hosting)
- [Langfuse — Spring AI integration (OTel)](https://langfuse.com/integrations/frameworks/spring-ai)
- [langfuse/langfuse-java (auto-generated client)](https://github.com/langfuse/langfuse-java)
- [yuvenhol/langfuse_java (Spring Boot starter)](https://github.com/yuvenhol/langfuse_java)
- [Langfuse Discussion #5746 — Spring AI OTel 통합 known issue](https://github.com/orgs/langfuse/discussions/5746)
- [Arize Phoenix — Self-Hosting](https://arize.com/docs/phoenix/self-hosting)
- [Braintrust — Langfuse alternatives 2026 (자체 비교)](https://www.braintrust.dev/articles/langfuse-alternatives-2026)
- [Laminar — Braintrust Alternatives 2026](https://laminar.sh/article/braintrust-alternatives-2026)
- [AppScale — Langfuse vs LangSmith vs Braintrust vs Helicone 2026](https://appscale.blog/en/blog/langfuse-vs-langsmith-vs-braintrust-vs-helicone-2026)
- [Spheron — LLM Observability self-hosted 2026 guide](https://www.spheron.network/blog/llm-observability-gpu-cloud-langfuse-arize-phoenix-helicone/)

### B.2 우리 NPC 도메인 (`backend/.../communication/adapter/out/npc/`) 와 통합 가능성

우리 NPC 시나리오:
- 마을 NPC = 단순 상담 봇 아님 + 일상 대화 + 유저 적을 때 빈 마을 방지
- 본 시점 (2026-05) 단계: 백엔드 어댑터 위치만 잡힘, 모델 호출 본격 안 함
- learning 68 (NPC 트랙 사전 ADR) 의 "LLM 평가 도구 비교" 빈자리

평가 패턴:

| 우리 평가 욕구 | 적합 도구 | 이유 |
|-------------|---------|------|
| "이 NPC 응답이 '마음의 고향' 톤이냐" (1년 후 regression) | **Braintrust** (CI/CD eval + blocking) | 가장 정교한 regression detection |
| "운영에서 NPC 한 응답이 비용 얼마 / latency 얼마" | **Langfuse** + Spring AI OTel | 셀프호스트 + MIT + OTel 표준 |
| "응답 라벨링 + human-in-loop 어노테이션" | **Langfuse** (annotation UI 표준 OK) / **Arize Phoenix** (UI 더 풍부) | 둘 다 OK, Langfuse 가 셋업 가벼움 |
| "Ollama 자체호스트 모델도 추적" | **Langfuse** / **Helicone** (둘 다 OK) | OpenAI-compatible API 라 둘 다 proxy/OTel 통함 |
| "prompt 버전 관리" | **Langfuse** prompt management | MIT + native |

### B.3 Spring Boot + OpenAI / Ollama → 자체호스트 Langfuse 통합 패턴 (1차 검증)

문서화된 통합 흐름 (Langfuse 공식 + exesolution):

```text
Spring Boot Actuator + Micrometer Tracing
  → Micrometer-OTel bridge
  → OTLP Exporter
  → OTEL_EXPORTER_OTLP_ENDPOINT = self-host Langfuse /api/public/otel
```

알려진 이슈 (#5746):
- 기본 instrumentation 만으로는 LLM 메타데이터 (토큰 / 프롬프트) 누락 가능
- 해결: opentelemetry-javaagent 추가 + Spring AI ChatModel observation 명시 설정

**우리 셋업과의 충돌**: 없음. Spring Boot 4.x + Spring AI 가 정합. 단 OTel javaagent 와 Spring AOT (GraalVM) 는 별도 검증 필요 [검증 필요].

출처 (1차):
- [exesolution — Spring AI OTel → Langfuse self-hosted](https://exesolution.com/solutions/spring-ai-opentelemetry-langfuse-observability)
- [Langfuse OTel native integration](https://langfuse.com/integrations/native/opentelemetry)
- [partme-ai/spring-ai-langfuse-spring-boot-starter releases](https://github.com/partme-ai/spring-ai-langfuse-spring-boot-starter/releases)

### B.4 sweep v1 §C·§D 결합 — 차세대 NPC 트랙의 도구 스택

sweep v1 §D.4 는 CodeRabbit + Anthropic Code Review (코드 리뷰 봇) 만 다룸. **NPC 모델 평가는 v1 의 빈자리.** 본 §B 가 직접 채움:

| 트랙 단계 | 도구 | 위치 | sweep v1 의 어느 항목과 연결 |
|---------|------|------|------------------------|
| 개발 중 trace + cost 추적 | Langfuse self-host (Docker) | 로컬 dev | (v1 신규) |
| CI eval (prompt regression) | Langfuse + LLM-as-Judge custom scorer | GitHub Actions | v1 §D.4 의 review 패턴 확장 |
| Prompt 버전 관리 | Langfuse prompt | Langfuse | (v1 신규) |
| Human-in-loop 라벨링 | Langfuse annotation UI | Langfuse | (v1 신규) |
| Production observability | Langfuse + OpenLIT + Grafana (§E 와 결합) | 운영 | v1 §A.3 의 Anthropic prebuilt integration 보강 |

### B.5 우리 프로젝트 적용 매트릭스 — 섹션 B

| 도구 | 우리 적합도 | 권고 |
|------|-----------|------|
| **Langfuse (self-host)** | 가장 정합 — MIT / Java SDK / Spring AI OTel / 셀프호스트 / NPC 셋업 시점 (모델 호출 시작 시점) | **도입 권고** (NPC 트랙 시작과 동시에) |
| Arize Phoenix | OK 이지만 PG + K8s 운영 부담 + ELv2 라이선스 | **조건부** (Langfuse 가 부족하면 fallback) |
| Braintrust | CI/CD eval + blocking 이 우리 의도와 정합. 단 SaaS only 가 마음의 고향 자체 호스팅 원칙과 충돌 가능 | **보류** (서비스 규모 커진 후 재평가) |
| LangSmith | LangChain 종속. 우리는 Spring AI direct → LangChain X | **보류** |
| Helicone | proxy 패턴 매력적이지만 eval 기능 약함 | **보류** |
| OpenAI Evals | offline 평가에만 유용 | 조건부 (특정 시점 한정) |

**1차 판단**: **Langfuse (self-host) 1순위 채택 권고.** NPC 트랙 시작 직전 learning 68 ADR 갱신 + Docker compose 에 Langfuse 추가.

---

## C. AGENTS.md v1.1 표준 + cross-tool 메모리 호환

### C.1 표준 거버넌스 — Linux Foundation 산하 Agentic AI Foundation

- AGENTS.md 가 OpenAI 발 → **Linux Foundation 산하 Agentic AI Foundation (AAIF)** 로 이관
- 같은 우산: **MCP / goose / AGENTS.md** 통합 거버넌스 (2026 발표)
- 60,000+ 오픈소스 프로젝트 사용 중

출처 (1차):
- [Linux Foundation — Agentic AI Foundation 발족](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [OpenAI — co-founds Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/)
- [AGENTS.md 공식](https://agents.md/)
- [IntuitionLabs — Agentic AI Foundation 표준 가이드](https://intuitionlabs.ai/articles/agentic-ai-foundation-open-standards)
- [Linux Foundation LFX Insights — AGENTS.md project](https://insights.linuxfoundation.org/project/agents-md)

### C.2 v1.1 제안 — Progressive Disclosure + 명시적 의미론

GitHub Issue #135 (agentsmd/agents.md) 의 v1.1 제안 핵심:

1. **Optional YAML frontmatter** — backward compatibility 보존 (없어도 valid)
   - 권장 필드: `description`, `tags`, `version`
   - 미인식 필드는 무시 (forward compat)
2. **Positional context 우선** — 디렉토리 경로 자체가 적용 scope ([Karpathy Skills 의 progressive disclosure 와 같은 철학])
3. **Nested AGENTS.md** — `./frontend/AGENTS.md` 는 frontend 하위만 영향
4. **Lightweight index** — frontmatter 만 읽어 어떤 AGENTS.md 가 있는지 빠르게 카탈로그

출처 (1차):
- [Issue #135 — AGENTS.md v1.1 proposal](https://github.com/agentsmd/agents.md/issues/135)
- [Augment Code — How to Build AGENTS.md (2026)](https://www.augmentcode.com/guides/how-to-build-agents-md)
- [Morph — AGENTS.md & SKILL.md Complete Guide 2026](https://www.morphllm.com/agents-md-guide)

### C.3 도구별 cross-tool 호환 — 2026-05 시점 정확히 어디까지

| 도구 | AGENTS.md 네이티브 자동 로딩 | 우회 방법 |
|------|---------------------------|---------|
| **Codex CLI** | ✅ (OpenAI 원조) | — |
| **GitHub Copilot** | ✅ | — |
| **Cursor** | ✅ | — |
| **Windsurf** | ✅ | — |
| **Amp** | ✅ | — |
| **Devin** | ✅ | — |
| **Antigravity v1.20.3+ (2026-03-05)** | ✅ (AGENTS.md + GEMINI.md 동시 로딩 / 같은 룰 시 GEMINI.md 우선) | — |
| **Claude Code** | ❌ **(2026-05 시점도 네이티브 미지원)** | CLAUDE.md 에서 AGENTS.md 를 참조 (`@AGENTS.md` 또는 명시 인용) |
| **Aider** | ✅ (.aiderrules / AGENTS.md 보완) | — |
| **Cline** | ⚠️ Memory Bank 우선 | nested 가능 |

→ **결정적 갭**: Claude Code 만 네이티브 미지원. 우리 셋업에 직접 영향.

출처 (1차):
- [Antigravity v1.20.3 AGENTS.md + GEMINI.md 통합](https://antigravitylab.net/en/articles/tips/agents-md-guide)
- [agentpedia — AGENTS.md cross-tool for Antigravity](https://agentpedia.codes/blog/antigravity-agents-md-guide)
- [Benjamin Crozat — How to use AGENTS.md with Codex, Cursor, and Claude Code](https://benjamincrozat.com/agents-md)
- [Bibek Poudel — Cross-tool setup for Claude Code, Codex, Cursor, Antigravity (2026-03)](https://bibek-poudel.medium.com/how-to-vibe-code-without-burning-your-context-window-a-cross-tool-setup-guide-for-claude-code-dadb7c524ab0)
- [VoltAgent/awesome-agent-skills — Cross-tool curated 1000+](https://github.com/VoltAgent/awesome-agent-skills)

### C.4 우리 CLAUDE.md + memory/MEMORY.md → AGENTS.md 양립 패턴

우리 현황 (2026-05-16 기준):
- `CLAUDE.md` = Agent 시스템 프롬프트 + Critical Rules + 워크플로우 (Claude Code 전용)
- `memory/MEMORY.md` = 사용자 자동 메모리 (Claude Code 의 두 번째 시스템)

세 가지 도입 옵션:

**옵션 1: 풀 마이그 (CLAUDE.md → AGENTS.md + CLAUDE.md 가 reference)**
- 비용: 높음 (대규모 파일 이동 + 참조 변경)
- 효과: Codex / Cursor 같이 쓰면 0설정
- 위험: Claude Code 가 AGENTS.md 네이티브 미지원 → CLAUDE.md 에서 반드시 명시 참조 필요
- 권고: **현재 불필요** (우리는 Claude Code 단일 도구)

**옵션 2: Symlink (`AGENTS.md` → `CLAUDE.md`)**
- 비용: 매우 낮음 (1 명령)
- 효과: cross-tool 호환 즉시 확보
- 위험: Windows / Git symlink 호환성 [검증 필요]
- 권고: **조건부** (다른 도구 도입 시점에)

**옵션 3: 양립 (`CLAUDE.md` 유지 + 별도 `AGENTS.md` 새로 작성, 내용 일부 공유)**
- 비용: 중간 (두 파일 동기화)
- 효과: 도구별 맞춤 가능
- 위험: drift (sweep v1 §D.3 의 cross-tool compression 위험)
- 권고: 우리에게 ROI 낮음 — Claude Code 만 쓰는 동안 무의미

### C.5 progressive disclosure 적용 — 우리 docs 트리 매핑

v1.1 의 nested AGENTS.md 패턴을 우리 docs 트리에 매핑하면:

```
/AGENTS.md (또는 CLAUDE.md 유지)        # 전체 기본 룰
/backend/AGENTS.md                       # 헥사고날 + Domain 규칙
/frontend/AGENTS.md                      # Next.js + 3D village 규칙
/docs/AGENTS.md                          # 문서 작성 규칙 (한국어, MD 포맷)
/.github/AGENTS.md                       # CI / PR / 봇 규칙
```

frontmatter 예 (v1.1 spec 따라):

```yaml
---
description: "Backend hexagonal rules — domain entity purity, port placement"
tags: [backend, hexagonal, java, spring-boot]
version: 1
---
```

**현재 안 한 이유**: 우리는 단일 CLAUDE.md SSOT 가 잘 작동 중 + Comprehension Gate 가 라우팅 역할. 분할 필요성 미발생.

### C.6 우리 프로젝트 적용 매트릭스 — 섹션 C

| 항목 | 권고 | 우선순위 |
|------|------|---------|
| CLAUDE.md → AGENTS.md 풀 마이그 | **보류** | — |
| AGENTS.md symlink 우회 (Windows 호환 검증 후) | **조건부** (cross-tool 도입 시점) | 낮음 |
| nested AGENTS.md (`backend/`, `frontend/`, `docs/`) | **보류** (단일 SSOT 가 더 정합) | — |
| frontmatter 표준 추가 (CLAUDE.md 본체에) | **조건부** (영향 분석 후) | 낮음 |
| sweep v1 §A.5 의 XML 태그 보강과 결합 | 가치 있음 | 중간 |

**1차 판단**: **보류 (대부분)** — 단일 Claude Code 환경에서 AGENTS.md 표준 ROI 낮음. cross-tool 도입 트랙 시작 시 재평가.

---

## D. Karpathy 5월 후속 발언 + Anthropic 5월 발표

### D.1 Karpathy — Sequoia Ascent 2026 (2026-04 말 / 5월 초 화제)

발화 위치: Sequoia Ascent 2026 fireside (Stephanie Zhan 대담) — Karpathy 본인 X 공유 2026-04-30

핵심 메시지 (sweep v1 의 software 3.0 / autoresearch 후속):
- **2025-12 가 inflection point** — 11월엔 80% 자기 손코딩 → 12월 비율 역전 ("agentic coding 이 helpful but messy → consistently correct" 로 도약한 시점)
- **Vibe coding raises the floor / Agentic engineering raises the ceiling** — 두 모드 분리
- "Agentic engineering = the professional discipline of coordinating fallible agents while preserving correctness, security, taste, and maintainability"
- 핵심 활동 6가지: design specs / supervise plans / inspect diffs / write tests / create evaluation loops / manage permissions
- **Verifiable tasks 가 빠르게 개선** — math / coding / tests / benchmarks / games 가 RL 학습 가능 (verifier 있으면 모델이 연습 가능)

추가: 2026-04 자기 X에서 **"개인 지식베이스 시스템"** 트윗 → Simon Willison 이 Prosper 에 응용 (검증 필요한 5월 활동)

출처 (1차):
- [karpathy.bearblog.dev — Sequoia Ascent 2026 summary](https://karpathy.bearblog.dev/sequoia-ascent-2026/)
- [Karpathy on X — Fireside Sequoia Ascent 2026](https://x.com/karpathy/status/2049903821095354523)
- [YouTube — Karpathy at Sequoia: From Vibe Coding to Agentic Engineering](https://www.youtube.com/watch?v=96jN2OCOfLs)
- [Simon Willison — Agentic Engineering Patterns guide](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/changes/)
- [Analytics Drift — Karpathy declares Vibe Coding obsolete](https://analyticsdrift.com/andrej-karpathy-agentic-engineering-software-3/)
- [Addy Osmani — Agentic Engineering](https://addyosmani.com/blog/agentic-engineering/)
- [IBM — What is Agentic Engineering](https://www.ibm.com/think/topics/agentic-engineering)

### D.2 Anthropic — Code w/ Claude 2026 (2026-05-06, San Francisco)

Anthropic 의 5월 가장 큰 발표 묶음. 일정: SF 5-6 → 런던 5-19 → 도쿄 6-10.

**4종 신기능 (Claude Managed Agents)**:

| 기능 | 단계 | 핵심 | 우리 의미 |
|------|------|------|---------|
| **Memory** | public beta | 파일시스템에 마운트되는 메모리 / 에이전트 간 공유 / 사용자 검토 가능 | sweep v1 §D.3 보강 — Anthropic 공식 시스템 |
| **Dreaming** | research preview | 과거 세션 review → 패턴 발견 / 중복 병합 / 만료 제거 / 반복 실수 표시 / 자동 or 검토 후 적용 | sweep v1 §C 의 SKILL.md 진화와 결합 |
| **Outcomes** | public beta | 성공 rubric 정의 → 별도 grader 가 자기 컨텍스트에서 채점 → 미달 시 재시도 | **sweep v1 §5.1 의 검증형 success criteria 와 정확히 같은 철학** — 우리는 사람이 spec 에 박지만 Anthropic 은 모델이 grader 도입 |
| **Multiagent Orchestration** | public beta | lead agent 가 작업 분해 → 전문 subagent 들이 병렬, shared filesystem | sweep v1 multi-agent-workflows.md 의 standard 화 |
| **Webhooks** | live (전체) | 세션 / vault lifecycle 이벤트 webhook | CI / 외부 통합 |

내부 벤치: outcomes 가 hardest 문제에서 task success +10 points / docx 생성 +8.4% / pptx +10.1%.

추가 발표:
- **Code Review** — Anthropic 내부 모든 팀이 사용 중인 자체 review 시스템 정식 공개
- **Remote Agents** — laptop 을 핸드폰으로 제어
- **SpaceX/xAI Colossus 데이터센터 deal** — compute 확보 (Simon 5-7 보고)

출처 (1차):
- [Anthropic — Code w/ Claude 공식](https://claude.com/code-with-claude)
- [Simon Willison Live blog — Code w/ Claude 2026-05-06](https://simonwillison.net/2026/May/6/code-w-claude-2026/)
- [Chris Ebert — Notes from Code w/ Claude 2026](https://chrisebert.net/notes-from-code-with-claude-2026/)
- [9to5Mac — Anthropic updates Claude Managed Agents with three new features (2026-05-07)](https://9to5mac.com/2026/05/07/anthropic-updates-claude-managed-agents-with-three-new-features/)
- [The New Stack — Anthropic will let its managed agents dream](https://thenewstack.io/anthropic-managed-agents-dreaming-outcomes/)
- [VentureBeat — Anthropic introduces dreaming](https://venturebeat.com/technology/anthropic-introduces-dreaming-a-system-that-lets-ai-agents-learn-from-their-own-mistakes)
- [SiliconANGLE — Anthropic letting Claude agents 'dream'](https://siliconangle.com/2026/05/06/anthropic-letting-claude-agents-dream-dont-sleep-job/)
- [VentureBeat — Anthropic wants to own your agent's memory, evals, orchestration (비판적 시각)](https://venturebeat.com/orchestration/anthropic-wants-to-own-your-agents-memory-evals-and-orchestration-and-that-should-make-enterprises-nervous)
- [Every — Inside Anthropic's 2026 Developer Conference](https://every.to/chain-of-thought/inside-anthropic-s-2026-developer-conference)
- [MindStudio — 5 New Agent Features Anthropic Just Shipped](https://www.mindstudio.ai/blog/code-with-claude-2026-new-agent-features)

### D.3 우리 적용 매트릭스 — 섹션 D

| 항목 | sweep v1 어느 항목 보강 | 우리 적용 가능성 | 권고 |
|------|---------------------|--------------|------|
| Karpathy "verifiable tasks" 메시지 | sweep v1 §5.1 검증형 success criteria | **이미 적용 중** — 우리 spec-driven 4층의 acceptance criteria | 변경 없음 |
| Karpathy 6 활동 (specs/plans/diffs/tests/eval/perms) | sweep v1 전반 + handover 시스템 | **이미 적용 중** | 변경 없음 |
| **Anthropic Outcomes** (자동 grader) | sweep v1 §D.1 (Opus 4.7 task budgets) | NPC 트랙에서 우리 acceptance criteria 를 outcomes rubric 으로 표현 가능 | **조건부 — NPC 트랙 시범** |
| **Anthropic Dreaming** | sweep v1 §C SKILL.md 진화 | learning 노트 누적 → dream 으로 자동 정제? 우리는 사람이 함 (현재가 더 안전) | **보류** (실험적) |
| **Multiagent Orchestration** | sweep v1 §D handover-collision-management.md | 우리 22 subagent 패턴 정합 | 변경 없음 |
| **Webhooks** | sweep v1 §D.2 plugin hooks | 우리 Stop hook 등을 webhook 으로 확장 가능 | **조건부** |
| **Memory (managed)** | sweep v1 §D.3 Memory Bank | 우리 memory/MEMORY.md 이미 직접 구현 | 변경 없음 |
| **Code Review (Anthropic 자체)** | sweep v1 §D.4 CodeRabbit 통합 | 우리 review-agent + Codex CLI + CodeRabbit 으로 동등 | 변경 없음 |
| **Remote Agents** | (v1 미반영) | 모바일 control 필요성 없음 | **보류** |

**1차 판단**: **Outcomes / Dreaming 패턴 학습은 가치 있으나 즉시 도입 X.** 우리는 이미 spec acceptance criteria + 사람 review 로 동등한 기능 실현. NPC 트랙 시작 시 outcomes 만 시범 검토.

---

## E. k6 / Grafana / LMOps — 2026 최신 패턴

### E.1 Grafana AI Observability — 5개 표준 dashboard 셋트 (2026)

Grafana Cloud 의 AI Observability (public preview) 가 5개 dashboard 묶음 제공:
1. **GenAI observability** — 요청률 / latency percentile / cost
2. **GenAI evaluations** — 평가 결과
3. **Vector DB observability**
4. **MCP observability** — MCP 서버 instrumentation
5. **GPU monitoring**

기본 메트릭:
- **Time to first token (TTFT)** + 전체 latency
- 총·평균 cost per request
- 토큰 / 요청별 분포

instrumentation:
- **OpenLIT** (open-source SDK) — Anthropic / OpenAI / Google / AWS Bedrock / Mistral 자동 instrumentation
- **OpenLIT Operator** — zero-code (K8s 환경에서 image rebuild 없이 inject)
- Anthropic 공식 prebuilt integration → Claude 사용량 / 비용 dashboard

출처 (1차):
- [Grafana Labs — Monitor MCP servers with OpenLIT and Grafana Cloud](https://grafana.com/blog/ai-observability-MCP-servers/)
- [Grafana Labs — Observe AI agents with OpenLIT and Grafana](https://grafana.com/blog/ai-observability-ai-agents/)
- [Grafana Labs — Monitor LLMs in production with Grafana Cloud, OpenLIT, OTel](https://grafana.com/blog/ai-observability-llms-in-production/)
- [Grafana Cloud — AI Observability docs](https://grafana.com/docs/grafana-cloud/machine-learning/ai-observability/)
- [Grafana Cloud — MCP Observability Setup](https://grafana.com/docs/grafana-cloud/monitor-applications/ai-observability/mcp-observability/setup/)
- [Grafana Labs — Zero-code observability for LLMs on K8s](https://grafana.com/blog/ai-observability-zero-code/)
- [VictoriaMetrics — AI Agents Observability with OTel](https://victoriametrics.com/blog/ai-agents-observability/)

### E.2 k6 의 LLM 부하 테스트 — **함정 주의** (2026-03 TianPan 분석)

핵심 결론: **conventional k6 가 LLM API 측정에서 잘못된 metric 을 잡는다.**

| 기존 k6 measurement | LLM 에서 실제로 필요한 measurement |
|---------------------|----------------------------------|
| total response time | **TTFT** + inter-token latency + goodput |
| http_req_duration | 스트리밍 무지 — 사용자 체감 안 잡힘 |
| 단순 요청률 | KV cache saturation curve 무시 (40 → 45 concurrent 사이가 결정적) |

비용 함정:
- 4-hour 고동시성 부하 테스트 = 수천 달러
- cost-per-request 분포를 billing dashboard 아닌 **load test output 에 포함**해야 함

권장 패턴:
- Concurrency sweep 을 saturation point 주변에서 fine-granularity (10, 20, 30, 40, 45, 50)
- 단계 차이가 400ms → 4000ms TTFT 만들 수 있음

출처 (1차):
- [TianPan — Load Testing LLM Applications: Why k6 and Locust Lie to You (2026-03-19)](https://tianpan.co/blog/2026-03-19-load-testing-llm-applications)
- [PremAI — Load Testing LLMs Tools Metrics 2026](https://blog.premai.io/load-testing-llms-tools-metrics-realistic-traffic-simulation-2026/)
- [Infobip — Implementing MCP load tests with Grafana k6](https://www.infobip.com/developers/blog/implementing-mcp-load-tests-with-grafana-k6)
- [Mohammad — k6 vs JMeter vs LPS Observability 2026-04](https://medium.com/@mahdi.com.haidar/monitoring-and-observability-in-load-testing-lps-vs-k6-vs-jmeter-b85e4548b05e)

### E.3 우리 sweep v1 §B (npc-evaluator-lmops 트랙 사전 ADR) 직접 보강

sweep v1 의 §B 가 다룬 것 = Agent OS / spec-driven 표준화. **LMOps 실측 도구 스택은 빈자리였음.**

본 §E 가 채우는 빈자리:

| 우리 욕구 | 도구 스택 | sweep v1 / v2 의 위치 |
|---------|---------|-------------------|
| NPC 응답 운영 trace | Langfuse self-host (v2 §B) + OpenLIT (v2 §E) | 신규 (v2) |
| 비용 dashboard | Grafana + Anthropic prebuilt integration | 신규 (v2 §E.1) |
| TTFT 부하 테스트 | k6 + custom TTFT script (Grafana k6) | 신규 (v2 §E.2) |
| Spring Boot trace 통합 | Spring AI + Micrometer + OTel → Langfuse | v2 §B.3 |
| MCP 서버 trace | OpenLIT MCP instrumentation | v2 §E.1 |

### E.4 우리 프로젝트 적용 매트릭스 — 섹션 E

| 항목 | 권고 | 우선순위 |
|------|------|---------|
| **Langfuse self-host (v2 §B 와 결합)** | NPC 트랙 시작 시 도입 | 높음 |
| Grafana AI Observability prebuilt Anthropic integration | NPC 트랙 + 운영 시 도입 | 높음 |
| OpenLIT 자동 instrumentation (Spring Boot 측) | Langfuse 와 같이 검토 | 중간 |
| k6 + TTFT custom script (NPC 부하 테스트) | NPC 본격 트래픽 시 | 중간 |
| Grafana MCP observability (우리가 Spring Boot MCP server 만들면) | A.4 와 결합. MCP 서버화 트랙 시 | 조건부 |
| OpenLIT K8s Operator zero-code | 우리는 docker-compose 우선이므로 보류 | 보류 |

**1차 판단**: **NPC 트랙 + MCP 서버화 트랙 시작 직전 묶음 ADR 작성 권고.** 도구 개별 도입 X → 스택 (Langfuse + OpenLIT + Grafana) 통합 도입.

---

## F. 경쟁 AI 코딩 환경 2026 — Cursor 3 / Antigravity / Copilot Agents / Aider

### F.1 핵심 7개 + 패턴 일반화

| 도구 | 2026 핵심 변화 | 강점 vs Claude Code | 우리 적용 의미 |
|------|--------------|------------------|--------------|
| **Cursor 3** (2026-04-02) | Agent-first redesign / Cursor 3.2 (2026-04-24) `/multitask` async subagents | Agents Window / 워크트리 + cloud + local + remote SSH 통합 / Design Mode (UI 직접 annotate) | 우리 worktree 분리 = Cursor agents window 와 같은 mental model |
| **Antigravity v1.20.3** (2026-03-05) | Multi-agent + Manager Surface / Browser Sub-Agent / AGENTS.md + GEMINI.md 통합 / Self-improving knowledge base | Gemini 3 + Claude Sonnet/Opus 4.6 + GPT-OSS 멀티모델 / 브라우저 자동 조작 + multimodal vision | (우리 미사용) AGENTS.md 표준의 가장 적극적 채택. cross-tool 도입 시 reference 가능 |
| **GitHub Copilot** (2026-04 Visual Studio / 5월 JetBrains CLI agent) | Inline agent mode (JetBrains) / Custom agents user-level / Debugger agent (runtime fix 검증) / 전체 IDE 통합 (VS Code / JetBrains / Neovim / Xcode / Zed 등) | 다중 IDE / inline 완성도 / unified sessions view | 우리는 IDE 다중성 욕구 없음 — Claude Code primary 유지 |
| **OpenAI Codex** | CLI agent + standalone cloud agent + 자체 desktop app / ChatGPT Plus $20 bundle | OpenAI 단일 생태 / AGENTS.md 원조 표준 | 우리는 PR 봇으로만 사용 중 |
| **Kiro** | IDE 통합 + Spec-driven workflow (constitution 패턴) | spec → prod 자동 / Code OSS 기반 | sweep v1 §D.5 와 동일 결론 — 우리 자체 spec-driven 으로 충분 |
| **Windsurf** | Cascade fully agentic / $15/mo | agentic IDE 의 best value-for-money | 우리 도입 가치 낮음 |
| **Aider** | Git-first / model-agnostic / 모든 OpenAI-compatible API 지원 / **Aider 가 Claude Code 보다 4.2x 적은 토큰** (47 파일 벤치) | 비용 효율 / 모델 자유 / git 통합 명확 (`/diff`, `/undo`, `/commit`, `/git`) | 우리는 Anthropic 모델 lock-in OK + Claude Code 의 subagent / hook 시스템이 더 정교 |

핵심 출처 (1차):
- [Cursor — Changelog](https://cursor.com/changelog) + [Cursor 3.0 detail](https://cursor.com/changelog/3-0) + [Cursor 3 blog (2026-04-02)](https://cursor.com/blog/cursor-3)
- [InfoQ — Cursor 3 Agent-First Interface (2026-04)](https://www.infoq.com/news/2026/04/cursor-3-agent-first-interface/)
- [Futurum — Cursor 3.2 reframes IDE as Agent Execution Runtime](https://futurumgroup.com/insights/cursor-3-2-reframes-the-ide-as-an-agent-execution-runtime/)
- [Google Developers Blog — Build with Antigravity](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/)
- [GitHub Changelog — Copilot in VS April update (2026-04-30)](https://github.blog/changelog/2026-04-30-github-copilot-in-visual-studio-april-update/)
- [GitHub Changelog — Copilot CLI agent JetBrains (2026-05-13)](https://github.blog/changelog/2026-05-13-introducing-copilot-cli-agent-and-unified-sessions-view-in-github-copilot-for-jetbrains-ides/)
- [GitHub Changelog — Inline agent mode JetBrains (2026-04-24)](https://github.blog/changelog/2026-04-24-inline-agent-mode-in-preview-and-more-in-github-copilot-for-jetbrains-ides/)
- [Aider vs Claude Code 2026 (Developers Digest)](https://www.developersdigest.tech/blog/aider-vs-claude-code-2026-update)
- [Morph — Aider Uses 4.2x Fewer Tokens Than Claude Code](https://www.morphllm.com/comparisons/morph-vs-aider-diff)
- [Artificial Analysis — Coding agents comparison](https://artificialanalysis.ai/agents/coding)
- [Lushbinary — AI Coding Agents 2026 comparison](https://lushbinary.com/blog/ai-coding-agents-comparison-cursor-windsurf-claude-copilot-kiro-2026/)
- [agentpedia — Best Antigravity Alternatives 2026](https://agentpedia.codes/blog/best-antigravity-alternatives-2026)
- [Cosmic JS — Claude Code vs GitHub Copilot vs Cursor 2026](https://www.cosmicjs.com/blog/claude-code-vs-github-copilot-vs-cursor-which-ai-coding-agent-should-you-use-2026)

### F.2 일반화되고 있는 4가지 패턴 (sweep v1 §D + 본 §F 결합)

본 5개 도구의 2026 변화에서 **공통적으로 수렴하는 패턴**:

1. **Agent-first UI** — file-editing 중심 IDE → agent-managing surface (Cursor 3 / Antigravity Manager / Cursor 3.2 multitask / Copilot unified sessions view)
2. **Worktree 가 표준** — Cursor 3 가 워크트리/cloud/local/remote SSH 통합 — sweep v1 multi-agent-workflows.md §"worktree = isolation lingua franca" 예측 적중
3. **Multi-agent 가 default** — lead + subagent (Anthropic Multiagent Orchestration / Cursor 3.2 multitask / Antigravity Manager / Copilot custom agents)
4. **AGENTS.md 가 cross-tool 표준화** — Antigravity / Codex / Cursor / Copilot / Windsurf / Amp / Devin / Aider 모두 채택. Claude Code 만 미지원

### F.3 우리 셋업 (single-developer + Claude Code primary) 의 위치 평가

sweep v1 multi-agent-workflows.md 의 **Stage 2 후반 ~ Stage 3 초입** 평가를 재확인:

| 축 | 우리 위치 | 업계 표준 위치 | 갭 |
|----|---------|--------------|----|
| worktree isolation | ✅ 적극 사용 (ws-redis 등 트랙별) | Cursor 3 가 native 통합 | 표준과 정합 |
| multi-agent | ✅ 22 subagent | Anthropic Multiagent Orchestration 공식 | 표준과 정합 |
| Agent-first UI | ⚠️ 터미널 Claude Code 만 — IDE agent 없음 | Cursor 3 / Antigravity Manager | **우리 의식적 선택** (단일 도구 집중) |
| AGENTS.md cross-tool | ❌ CLAUDE.md only | 8개 도구 표준 | 우리 영향 X (단일 도구) |
| Spec-driven | ✅ 자체 4층 (Issue/Spec/Track/Step) | Kiro / Agent OS / Spec-Kit | 우리가 더 정교 (v1 §B.5 결론) |
| Outcomes / Eval | ❌ acceptance criteria 수동 | Anthropic Outcomes / Braintrust | **잠재 갭** → NPC 트랙에서 보강 |

### F.4 우리 프로젝트 적용 매트릭스 — 섹션 F

| 도구 | 우리 도입 권고 | 사유 |
|------|------------|------|
| Cursor 3 / 3.2 | **보류** | Claude Code 와 mental model 거의 같음 + 우리 자체 worktree + handover 시스템이 동등 |
| Antigravity | **보류** | Gemini 3 strong 하지만 우리는 Anthropic 일관성 + AGENTS.md 우리 영향 없음 |
| GitHub Copilot Agents | **보류** | 우리는 IDE 다중성 욕구 없음 |
| OpenAI Codex (CLI / PR 봇) | **현 유지** | 이미 PR 리뷰 봇으로 사용 (memory/feedback_subagent_codex.md) |
| Aider | **보류** | 토큰 효율 좋지만 우리 subagent + hook 시스템이 더 정교. 비용 임계점 시 재평가 |
| Anthropic Outcomes (Code w/ Claude) | **조건부** | NPC 트랙에서 acceptance criteria 를 outcomes rubric 으로 시범 |

**1차 판단**: **현 셋업 (Claude Code primary + Codex/CodeRabbit PR 봇) 유지.** F.2 의 4가지 패턴 중 1~3 은 이미 우리 셋업에 내재화. 4 (AGENTS.md) 만 cross-tool 도입 트랙 시점에 재평가.

---

## v1 + v2 통합 매트릭스 — 도입 권고 / 조건부 / 보류

> sweep v1 통합 매트릭스 (2026-05-16) 에 본 v2 결론 6축을 합친 갱신본.

### 도입 권고 (즉시 / 가까운 시점 / ROI 명확)

| 항목 | 출처 | 액션 | 예상 비용 | 우선순위 |
|------|------|------|----------|---------|
| Proactive compaction 60% 정책 명시 | v1 D.1 | CLAUDE.md 에 규칙 추가 | 낮음 | **유지 (v1)** |
| CodeRabbit Claude Code 플러그인 | v1 D.4 | 1줄 설치 | 낮음 | **유지 (v1)** |
| CLAUDE.md Critical Rules XML 태그 보강 | v1 A.5 | 스타일 조정 | 낮음 | **유지 (v1)** |
| **Langfuse self-host (NPC 트랙 시작과 동시)** | **v2 B.5** | Docker compose + Spring AI OTel | **중간** | **신규 (v2)** |
| **Grafana AI Observability Anthropic prebuilt integration** | **v2 E.1** | Grafana Cloud 연동 | **중간** | **신규 (v2)** |
| **MCP 서버 사용 시 보안 5규칙** (read-only role / OAuth 2.1 / 다중 SQL 차단 / TLS / 감사 로그) | **v2 A.5** | conventions/에 1 페이지 추가 | **낮음** | **신규 (v2)** — 어떤 MCP 도입이든 선결 |

### 조건부 도입 (검증 / 부분 차용 / 트랙 분리 후)

| 항목 | 출처 | 조건 | 비용 | 우선순위 |
|------|------|------|------|---------|
| `track-start` / `track-end` supporting files 분리 | v1 C.4 | 두 슬래시 가장 ROI | 중간 | 유지 (v1) |
| `spec-new` / `step-start` supporting files | v1 C.4 | 위 채택 후 확대 | 중간 | 유지 (v1) |
| Agent OS `/discover-standards` 패턴 차용 | v1 B.5 | 새 도메인 트랙 시 패턴만 차용 | 중간 | 유지 (v1) |
| Task budgets / effort levels 정책화 | v1 D.6 | 비용 큰 트랙 시범 | 낮음 | 유지 (v1) |
| Memory cross-tool compression (AGENTS.md) | v1 D.3 + v2 C.6 | Cursor/Codex 같이 쓰는 일 늘면 | 낮음 | 유지 (v1) — v2 가 갭 정확히 식별 |
| **로컬 dev PG 에 MCP (stdio + 읽기 전용 role + 감사)** | **v2 A.6** | A.5 보안 5규칙 선결 + 트랙 분리 | **중간** | **신규 (v2)** |
| **Spring Boot 앱 자체를 MCP 서버로 변환** (`@McpTool`) | **v2 A.6** | spec 트랙 분리 후 시범 / 도메인 1개 한정 | **중간** | **신규 (v2)** |
| **Anthropic Outcomes rubric 시범** | **v2 D.3** | NPC 트랙에서 acceptance criteria 를 outcomes 로 표현 | **낮음** | **신규 (v2)** |
| **k6 TTFT custom 부하 테스트** | **v2 E.4** | NPC 본격 트래픽 시점 | **중간** | **신규 (v2)** |
| **OpenLIT 자동 instrumentation** | **v2 E.4** | Langfuse 같이 검토 | 중간 | **신규 (v2)** |
| **Webhooks (Claude Code lifecycle)** | **v2 D.3** | Stop hook → webhook 확장 검토 | 낮음 | **신규 (v2)** |

### 보류 (현 시점 ROI 낮음 / 우리가 이미 동등 이상)

| 항목 | 출처 | 사유 |
|------|------|------|
| docs/ 를 HTML 로 마이그 | v1 A.5 | agent input + 사람 편집 → MD 정답 |
| Agent OS 전체 채택 | v1 B.5 | spec-driven 4층이 더 정교 |
| Agent OS `/inject-standards` | v1 B.5 | conventions 6개뿐 → 수동 라우팅 충분 |
| `/shape-spec` 채택 | v1 B.5 | `/spec-new` 와 중복 |
| 단순 슬래시 3개 (`학습노트`/`wiki-lint`/`브랜치정리`) Skill 마이그 | v1 C.6 | 현 포맷 충분 |
| Spec-Kit / BMAD / Kiro 채택 | v1 D.5 | 자체 시스템 동등 이상 |
| Thariq HTML plan 산출물 | v1 A.5 | 우리 use case 아님 |
| **CLAUDE.md → AGENTS.md 풀 마이그** | **v2 C.6** | 단일 Claude Code → ROI 낮음 |
| **nested AGENTS.md (frontend/backend/docs)** | **v2 C.6** | 단일 SSOT 가 더 정합 |
| **운영 PG 에 MCP 서버 직노출** | **v2 A.6** | SQL injection 표면 — 위험 매우 높음 |
| **Notion / Linear / SaaS MCP** | **v2 A.6** | 우리 도구 안 씀 |
| **Cursor 3 / Antigravity / Copilot Agents / Aider 도입** | **v2 F.4** | Claude Code primary 셋업 의식적 선택 |
| **Anthropic Dreaming** | **v2 D.3** | 사람 review 가 현재 더 안전 |
| **LangSmith / Braintrust (SaaS)** | **v2 B.5** | 셀프호스트 원칙 + LangChain 종속 |
| **Anthropic Remote Agents** | **v2 D.3** | 모바일 control 욕구 없음 |

### 검증 필요 (확신 못 함 / 후속 추적)

| 항목 | 출처 | 확인할 것 |
|------|------|---------|
| "Anthropic 공식이 HTML 로 가고 있다" 주장 | v1 A.3 | Thariq 개인 의견 vs 공식 docs 갭 — 6월 spec 릴리즈 시 재확인 |
| Opus 4.7 의 35% 토큰 증가 — 우리 비용 체감 | v1 D.1 | 측정 |
| CodeRabbit 자율 루프 vs 우리 fix-loop 충돌 | v1 D.1 | 1주 시범 |
| **Cassandra MCP 서버 존재 여부** | **v2 A.3** | 추가 검색 / 직접 발행 가능성 검토 |
| **Langfuse OTel + Spring AOT (GraalVM) 호환** | **v2 B.3** | NPC 트랙 시 검증 |
| **Windows symlink AGENTS.md → CLAUDE.md 호환** | **v2 C.4** | Git config / fs 호환 |
| **Karpathy 2026-05 활동 (개인 KB 시스템 X 트윗 등)** | **v2 D.1** | Simon Willison 5월 후속 글 추적 |

---

## 메타 — 본 v2 의 위치

- **v1 (4 섹션)**: 광범위 트렌드 + Claude Code 자체 기능 변화
- **v2 (6 섹션)**: v1 의 빈자리 — MCP / AI Eval / AGENTS.md / Karpathy·Anthropic 5월 / LMOps / 경쟁 환경
- **다음 정기 스위프**: 6월 중순 (MCP spec 릴리즈 + Claude Opus 4.7 후속 + Code w/ Claude Tokyo)
- 통합 매트릭스의 **v2 신규 항목 8건** 은 NPC 트랙 시작 시점에 묶음 ADR 로 다뤄야 함 (특히 Langfuse + Grafana + MCP 보안 5규칙 + Outcomes 시범 — 4축 결합)
- 모든 도구·표준 변경은 직접 CLAUDE.md 흔드는 게 아니라 **트랙 분리 → spec → step** 의 4층 절차로

### v2 가 sweep v1 에 직접 보강한 7가지 (요약)

1. v1 §D.1 (Opus 4.7) → v2 §D.2 (Outcomes / Dreaming / Multiagent Orchestration 4종 묶음)
2. v1 §D.3 (Memory Bank 패턴) → v2 §D.2 (Anthropic Memory public beta 공식 등장)
3. v1 §D.4 (CodeRabbit) → v2 §D.2 (Anthropic Code Review 자체 시스템 공개)
4. v1 §B.5 (Agent OS) → v2 §C (AGENTS.md v1.1 표준 거버넌스)
5. v1 multi-agent-workflows.md (예측) → v2 §F.2 (4 패턴 일반화 검증)
6. v1 npc-evaluator-lmops 트랙 사전 ADR 빈자리 → v2 §B (AI Eval) + §E (LMOps)
7. v1 통합 매트릭스 → v2 통합 매트릭스 (8 신규 항목 추가)
