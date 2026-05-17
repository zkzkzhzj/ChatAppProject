# MCP (Model Context Protocol) 도입 보안 baseline — 5규칙

> 트랙 `ai-native-2026-05-upgrade` (#93) Step 7 산출물.
> 1차 출처: sweep v2 §A — Anthropic 원본 PostgreSQL MCP 서버의 SQL injection 취약점 (Datadog 발견, 미패치, 주간 21,000 다운로드 유지).
> 적용 시점: **모든 MCP 도입 / 활성화 / 호출 전** — 선결 의무.

---

## 0. 왜 이게 baseline 인가

sweep v2 §A.4 결박 결박:

> "Anthropic 원본 PostgreSQL MCP 서버가 SQL injection 으로 read-only 우회 가능 (Datadog 2026-04 발견). Anthropic 미패치 + 주간 21,000 다운로드 유지. 즉 MCP 생태계 = **빠르게 확산 + 보안 미성숙** 단계."

MCP 도입은 **외부 시스템 (DB / API / 메시징) 을 LLM 컨텍스트에 직접 노출**. SQL injection / RCE / 권한 escalation / 토큰 유출 / supply chain attack 5축 위험.

운영 PG / 운영 Redis / 운영 Kafka 직노출 = **본 baseline 통과 전까지 금지**.

## 1. 5규칙

### Rule 1 — 운영 시스템 직노출 금지

운영 (production) PostgreSQL / Redis / Cassandra / Kafka / S3 / 기타 외부 API 결박 MCP server 결박 결박 결박 결박 **금지**.

허용:
- 로컬 dev 환경 (`docker-compose` 결박 결박 PG / Redis) 만 OK
- 운영 데이터 사본을 staging 환경 결박 결박 결박 결박 결박 OK (의도된 격리 결박)

### Rule 2 — Read-only role 강제

dev / staging 환경 결박 MCP server 결박 결박 결박 결박 **read-only DB role** 결박 결박 결박. PostgreSQL 결박:

```sql
CREATE ROLE mcp_readonly WITH LOGIN PASSWORD '<strong>';
GRANT CONNECT ON DATABASE mygohyang TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
```

`INSERT / UPDATE / DELETE / TRUNCATE / DROP / ALTER` 결박 X.

SQL injection 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 (Datadog 결박 결박 결박 결박 결박 read-only 우회 결박 결박 결박).

### Rule 3 — stdio transport 우선 (네트워크 노출 차단)

MCP transport 결박 **stdio (local pipe)** 결박 결박 결박. HTTP / SSE / WebSocket transport 결박 결박:

- 인증 (Bearer token + IP allowlist + TLS) 모두 필수
- 운영 환경 결박 결박 결박 X (Rule 1 결박 결박)
- dev 환경 결박 결박 localhost 결박 결박 결박 결박 결박 결박 결박

stdio = 결박 결박 외부 네트워크 노출 X → 가장 안전.

### Rule 4 — 권한 최소화 (least privilege)

MCP server 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 (least privilege):

- DB: 특정 schema / 특정 table 만 SELECT 가능 (Rule 2 의 `ALL TABLES` 결박 결박 결박 결박 결박 결박 결박 결박 결박)
- File system: 특정 경로만 (예: `docs/` 결박 결박 결박, `.env` / `secrets/` 결박 X)
- API: 특정 endpoint / 특정 HTTP method 만

`@McpTool` (Spring AI) 결박 결박 결박 결박 결박 결박 결박 결박 method 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박. tool 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박.

### Rule 5 — Supply chain 검증

MCP server 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박:

- **공식 출처** — modelcontextprotocol.io 결박 등재 결박 결박 결박 결박 (third-party 결박 결박 결박 결박)
- **마지막 업데이트 시점** — 6개월 이상 미갱신 결박 결박 X (Anthropic 원본 PG MCP 결박 결박)
- **GitHub stars / 사용자 수** — 매우 적으면 검토 강화
- **알려진 취약점** — GitHub Security Advisory / CVE 검색
- **소스 코드 1차 검토** — Critical 결박 X 결박 결박 결박

## 2. 도입 절차 (MCP server 결박 결박 결박 결박 결박 결박)

1. **Rule 1~5 자체 점검** — 본 baseline 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박
2. **트랙 spec 결박 결박 결박** — 어떤 MCP server / 어떤 transport / 어떤 권한 / 어떤 도메인 호출
3. **사용자 결박 결박 결박** — MCP 도입 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 (외부 시스템 노출 결박 결박)
4. **dev 환경 결박 결박 결박** — 운영 결박 결박 1주 이상 dev 결박 결박 결박 결박 결박
5. **운영 결박 결박 결박** — Rule 1 결박 결박 결박 결박. 운영 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박 결박

## 3. 본 프로젝트 결박 결박 MCP 도입 결박 (2026-05-17 시점)

**없음**. 단 sweep v2 §A.5 결박 결박 결박 결박 결박 결박:

| MCP server | 도입 시점 | 평가 |
|---|---|---|
| 로컬 dev PostgreSQL MCP (stdio + read-only role) | 조건부 — NPC 트랙 (`npc-evaluator-lmops`) 시작 시점 | spec ai-native-2026-05-upgrade 의 Out 결박 결박 결박 |
| Spring Boot 4.x 결박 `@McpTool` 결박 결박 결박 결박 결박 (도메인 use case 결박 Claude 결박 노출) | 조건부 — 큰 트랙 + 보안 5규칙 선결 | spec ai-native-2026-05-upgrade 의 Out 결박 결박 결박 |
| 운영 PostgreSQL MCP 직노출 | **보류 (영구)** | Rule 1 위반 |
| SaaS MCP (Notion / Linear / Slack 등 third-party) | 보류 — Supply chain 검증 필요 (Rule 5) | 결박 결박 결박 결박 결박 결박 |

## 4. References

- sweep v2 §A — MCP 생태계 + 취약점 + 보안 5규칙 출처
- [modelcontextprotocol.io](https://modelcontextprotocol.io)
- [Anthropic MCP 공식](https://www.anthropic.com/news/model-context-protocol)
- [Datadog — Anthropic PostgreSQL MCP SQL Injection (2026-04)](https://securitylabs.datadoghq.com/) — 정확한 글 URL 결박 sweep v2 §A.4 참조
- [Spring AI MCP Server](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html)
- 트랙: [docs/handover/track-ai-native-2026-05-upgrade.md](../handover/track-ai-native-2026-05-upgrade.md)
- learning 83 (트랙 종료 시 작성)
