# MCP (Model Context Protocol) 도입 보안 baseline — 5규칙

> 트랙 `ai-native-2026-05-upgrade` (#93) Step 7 산출물.
> 1차 출처: sweep v2 §A — Anthropic 원본 PostgreSQL MCP 서버의 SQL injection 취약점 (Datadog 발견, 미패치, 주간 21,000 다운로드 유지).
> 적용 시점: **모든 MCP 도입 / 활성화 / 호출 전** — 선결 의무.

---

## 0. 왜 이게 baseline 인가

sweep v2 §A.4 진단:

> "Anthropic 원본 PostgreSQL MCP 서버가 SQL injection 으로 read-only 우회 가능 (Datadog 2026-04 발견). Anthropic 미패치 + 주간 21,000 다운로드 유지. 즉 MCP 생태계 = **빠르게 확산 + 보안 미성숙** 단계."

MCP 도입은 **외부 시스템 (DB / API / 메시징) 을 LLM 컨텍스트에 직접 노출**. SQL injection / RCE / 권한 escalation / 토큰 유출 / supply chain attack 5축 위험.

운영 PG / 운영 Redis / 운영 Kafka 직노출 = **본 baseline 통과 전까지 금지**.

## 1. 5규칙

### Rule 1 — 운영 시스템 직노출 금지

운영 (production) PostgreSQL / Redis / Cassandra / Kafka / S3 / 기타 외부 API 를 MCP server 로 직접 노출하는 것을 **금지**한다.

허용:

- 로컬 dev 환경 (`docker-compose` 안 PG / Redis) 만 OK
- 운영 데이터 사본을 staging 환경으로 격리한 경우 OK (의도된 격리)

### Rule 2 — Read-only role 강제

dev / staging 환경의 MCP server 는 반드시 **read-only DB role** 을 사용한다. PostgreSQL 예시:

```sql
CREATE ROLE mcp_readonly WITH LOGIN PASSWORD '<strong>';
GRANT CONNECT ON DATABASE mygohyang TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
```

`INSERT / UPDATE / DELETE / TRUNCATE / DROP / ALTER` 권한 모두 부여 X.

SQL injection 이 발생해도 데이터 변조는 차단 (Datadog 사례 에서는 read-only 우회까지 가능했지만, 일반적 SQLi 는 SELECT 외 차단).

### Rule 3 — stdio transport 우선 (네트워크 노출 차단)

MCP transport 는 **stdio (local pipe)** 를 기본으로 한다. HTTP / SSE / WebSocket transport 사용 시:

- 인증 (Bearer token + IP allowlist + TLS) 모두 필수
- 운영 환경에서 사용 X (Rule 1 과 동일)
- dev 환경에서도 localhost 바인딩 + 방화벽 제한

stdio = 외부 네트워크 노출 X → 가장 안전.

### Rule 4 — 권한 최소화 (least privilege)

MCP server 는 작업에 필요한 가장 작은 권한 집합만 부여한다 (least privilege):

- DB: 특정 schema / 특정 table 만 SELECT 가능 (Rule 2 의 `ALL TABLES` 보다 더 제한적인 grant 권장)
- File system: 특정 경로만 (예: `docs/` 만 허용, `.env` / `secrets/` 차단)
- API: 특정 endpoint / 특정 HTTP method 만

`@McpTool` (Spring AI) 사용 시 각 도메인 method 마다 권한을 별도 검토 — 모든 service 메소드를 자동 expose 하면 안 된다. tool 단위로 expose 여부를 명시한다.

### Rule 5 — Supply chain 검증

MCP server 도입 전 다음 항목 검증 필수:

- **공식 출처** — modelcontextprotocol.io 에 등재된 서버만 사용 (third-party 는 신중 검토)
- **마지막 업데이트 시점** — 6개월 이상 미갱신 server 는 사용 X (Anthropic 원본 PG MCP 처럼 미패치 위험)
- **GitHub stars / 사용자 수** — 매우 적으면 검토 강화
- **알려진 취약점** — GitHub Security Advisory / CVE 검색
- **소스 코드 1차 검토** — Critical 이슈 X 인지 확인

## 2. 도입 절차 (MCP server 활성화 전 의무 단계)

1. **Rule 1~5 자체 점검** — 본 baseline 의 모든 항목을 자체 체크리스트로 통과
2. **트랙 spec 에 명시** — 어떤 MCP server / 어떤 transport / 어떤 권한 / 어떤 도메인 호출
3. **사용자 명시 승인** — MCP 도입은 외부 시스템 노출 결정이라 사용자 승인 의무 (자율 위임 X)
4. **dev 환경 검증** — 운영 적용 전 1주 이상 dev 환경에서 실사용
5. **운영 적용 검토** — Rule 1 에 따라 운영 직노출은 영구 금지. 운영 데이터 노출이 필요하면 staging 사본 + read-only role 경유로 제한

## 3. 본 프로젝트의 현재 MCP 도입 현황 (2026-05-17 시점)

**없음**. 단 sweep v2 §A.5 의 도입 매트릭스:

| MCP server | 도입 시점 | 평가 |
|---|---|---|
| 로컬 dev PostgreSQL MCP (stdio + read-only role) | 조건부 — NPC 트랙 (`npc-evaluator-lmops`) 시작 시점 | spec ai-native-2026-05-upgrade 의 Out (별도 트랙) |
| Spring Boot 4.x 의 `@McpTool` (도메인 use case 를 Claude 에 직접 노출) | 조건부 — 큰 트랙 + 보안 5규칙 선결 | spec ai-native-2026-05-upgrade 의 Out (별도 트랙) |
| 운영 PostgreSQL MCP 직노출 | **보류 (영구)** | Rule 1 위반 |
| SaaS MCP (Notion / Linear / Slack 등 third-party) | 보류 — Supply chain 검증 필요 (Rule 5) | 도입 시 트랙 단위로 검토 |

## 4. References

- sweep v2 §A — MCP 생태계 + 취약점 + 보안 5규칙 출처
- [modelcontextprotocol.io](https://modelcontextprotocol.io)
- [Anthropic MCP 공식](https://www.anthropic.com/news/model-context-protocol)
- [Datadog — Anthropic PostgreSQL MCP SQL Injection (2026-04)](https://securitylabs.datadoghq.com/) — 정확한 글 URL 은 sweep v2 §A.4 참조
- [Spring AI MCP Server](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html)
- 트랙: [docs/handover/track-ai-native-2026-05-upgrade.md](../handover/track-ai-native-2026-05-upgrade.md)
- learning 83 (트랙 종료 시 작성)
