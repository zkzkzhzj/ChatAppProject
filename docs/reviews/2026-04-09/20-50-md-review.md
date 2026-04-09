# MD 정합성 리뷰 — 2026-04-09 20-50

## 대상
- 종류: 문서 정합성 + 코드↔명세 교차검증 (Codex 기반)

## Codex 리뷰 결과

### [CRITICAL] 아키텍처 위반

**`docs/conventions/coding.md:52-55`**
AGENTS의 Port 메서드 규칙(`AGENTS.md:75-77`)과 충돌. 이 문서는 바로 아래 `coding.md:60-75`에서 `ByUserId`류를 금지하면서도, 앞선 예시에서는 `loadItemsByUserId()`를 권장 예시로 제시하고 있어 Port 네이밍 기준이 문서 내부와 AGENTS 간에 불일치.

**`docs/conventions/coding.md:147-159`**
AGENTS/CLAUDE는 커스텀 예외를 `[domain]/error/`에 두도록 강제하는데(`AGENTS.md:44-46`, `CLAUDE.md:59`), 이 예시는 `IdentityErrorCode`와 `DuplicateEmailException`를 `identity/domain/`에 두는 형태로 안내. 예외 위치 규칙이 달라 문서만 보고 구현하면 Critical Rule을 위반하게 됨.

**`backend/src/main/java/.../village/adapter/in/messaging/UserRegisteredEventConsumer.java:51-59`**
`existsByEventId()` 확인 후 `save()`하는 check-then-act 멱등성 패턴 사용. AGENTS Critical Rule(`AGENTS.md:52-54`), CLAUDE 검증 규칙, architecture.md 멱등성 원칙(`architecture.md:331-355`)과 정면 충돌. `INSERT ... ON CONFLICT DO NOTHING` 기반으로 교체 필요.

---

### [WARNING] 컨벤션 위반

**`docs/architecture/package-structure.md:43-50` ↔ `village/adapter/in/messaging/UserRegisteredEventConsumer.java`**
패키지 문서는 Kafka Consumer/Producer를 `[domain]/adapter/out/messaging/`에 두도록 설명하지만, 실제 구현은 `adapter/in/messaging/` 아래에 있음. Consumer는 외부에서 오는 메시지를 받는(driving) 어댑터이므로 `in/`이 맞고, 문서가 틀린 것.

**`docs/specs/api/village.md:57` ↔ `SpaceTheme.java` ↔ `V1__initial_schema.sql:45`**
Village API 스펙은 `theme` 값으로 `FOREST / OCEAN / CITY`를 안내하지만, 실제 코드와 스키마는 `DEFAULT`만 지원. 현재 스펙대로 클라이언트를 구현하면 존재하지 않는 enum 값을 기대하게 됨.

**`docs/architecture/domain-boundary.md:205-218` ↔ `docs/architecture/decisions/002-guest-auth-pattern.md`**
Domain Boundary는 Identity 책임에 "게스트 → 회원 전환 시 데이터 마이그레이션"과 `GuestSession` 병합을 포함하지만, ADR-002는 MVP에서 미지원으로 확정. ADR이 현재 결정사항이므로 상위 설계 문서도 정리 필요.

**`docs/frontend/space.md`, `docs/frontend/assets.md`**
handover.md와 CLAUDE.md가 다음 단계 참고 문서로 안내하지만 두 파일이 비어 있음.

---

### [INFO] 참고 사항

**`docs/specs/event.md` — 미구현 이벤트 누락**
`event.md`는 Phase 1~3 기준이라 `user.registered`만 문서화. domain-boundary의 `MessageReported`, `UserSanctioned`, `PurchaseCompleted`, `GuestConverted` 등은 Phase 4+ 구현 시 추가 필요.

---

### LGTM

- `phases.md` ↔ `handover.md`: Phase 0~3 완료 상태 일관되게 반영
- REST API 스펙 6개 엔드포인트 ↔ Controller 코드 대응 일치
- `user.registered` 토픽 producer/relay/consumer 연결 일치
- ERD ↔ V1__initial_schema.sql 테이블·컬럼 수준 정합성 유지

## 추가 메모

없음
