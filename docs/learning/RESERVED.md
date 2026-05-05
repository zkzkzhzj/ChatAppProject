# 학습 노트 번호 예약

> 병행 작업 시 learning 번호 충돌을 막기 위한 예약 표.
>
> **새 노트 작성 전 반드시 이 표를 확인한다.**
>
> - 자기 트랙에 할당된 번호 중 가장 작은 미사용 번호를 사용
> - INDEX.md 추가는 번호 확정 후
> - 작성 완료되면 본 표 "상태"를 `사용 완료`로 변경
>
> 빈 번호(09, 10, 11, 14, 19) 재사용 금지 룰은 그대로 유효 (`learning/INDEX.md` 참조).

---

## 예약 현황 (마지막 사용 번호: 71)

| 번호 | 트랙 | 예상 주제 | 상태 |
|------|------|----------|------|
| 46   | `ws-redis` | 마을·서버 확장 모델 결정 기록 (Hard Cap vs 채널 샤딩 vs 마을 다중화 · 채널 분리 vs 서버 분리 · ZEP 패턴 보류) | ✅ 사용 완료 (2026-04-26) |
| 47   | `ws-redis` | Step 2 백엔드 구현기 (raw WS + Redis Pub/Sub 첫 구현, Lettuce Pub/Sub 함정, ConcurrentHashMap 세션 레지스트리 디테일) | 작성 예정 (Step 7 단계) |
| 48   | `ws-redis` | Step 5 운영 배포 + Sweep 4 결과 — 진짜 Before/After | 예약 |
| 49   | `ui-mvp-feedback` | F-3 React 입력 컴포넌트 IME 조합 처리 | 사용 완료 |
| 50   | `ui-mvp-feedback` | F-1 모바일 터치 이동 (tap-to-move vs 가상 조이스틱) | 사용 완료 |
| 51   | `s3-media` | (트랙 시작 시 첫 노트 — S3 도입 결정 + 비용 정책) | 미사용 |
| 52   | `s3-media` | (예비) | 미사용 |
| 53   | `ws-redis` | 헥사고날 outbound port 호출자 룰 (publish는 port로, subscribe lifecycle은 어댑터 내부로) | ✅ 사용 완료 (2026-04-26) |
| 54   | `ghost-session` | presence cleanup 분석 — 세션 종료/지연 연결 시 유령 캐릭터 원인 진단 | ✅ 사용 완료 (2026-04-27) |
| 55   | `token-auto-renewal` | sliding session vs refresh vs WS push 트레이드오프 (본 트랙 종합 노트) | 예약 (트랙 재개 시) |
| 56   | `multi-session-policy` (후속 의제) | 동일 userId 다중 세션 (대체/거부/병행) | 예약 (트랙 착수 시) |
| 57   | (반환) | (구 ghost-session 예비) | 반환 — 재예약 가능 |
| 58   | (반환) | (구 ghost-session 예비) | 반환 — 재예약 가능 |
| 59   | `ws-redis` | WS 서버 분리 vs 모놀리스 + Redis Pub/Sub — 배포 토폴로지 결정 (채널톡/LINE 비교, 분리 트리거 신호) | ✅ 사용 완료 (2026-04-27) |
| 60   | (단일 핫픽스) | STOMP 라이브러리 자동 reconnect vs 앱 onError 분기 — 두 레이어 reconnect 메커니즘 독립성 | ✅ 사용 완료 (2026-04-28) |
| 61   | `token-auto-renewal` | Idle session 정의 트레이드오프 ((가) HTTP 요청 / (나) WS 끊김 / (다) 사용자 액션) — 마음의 고향 (나) 채택 근거 | 예약 (트랙 재개 시) |
| 62   | `token-auto-renewal` | Refresh token rotation + reuse detection 메커니즘 (Auth0 표준, race condition, family invalidation) | 예약 (트랙 재개 시) |
| 63   | `token-auto-renewal` | 게스트 영속 식별자 분리 패턴 (LocalStorage `guestId` + JWT `gid` claim 서명 검증) | 예약 (트랙 재개 시) |
| 64   | `token-auto-renewal` | WS 토큰 갱신 패턴 (끊고 재연결 vs in-band STOMP push) — Spring STOMP 자연 동작 채택 근거 | 예약 (트랙 재개 시) |
| 65   | `infra-tls-hardening` | HttpOnly · Secure · SameSite cookie 깊은 다이브 (각 속성이 막는 공격, 한계, 마음의 고향 cross-origin 적용) | ✅ 사용 완료 (2026-04-28) |
| 66   | `harness-spec-driven` | spec-driven 4층 분리 + 자동 fix-loop + Comprehension Gate(13 카테고리/Tier A·B·C) 도입 결정 — Spec Kit/BMAD/AB Method 비교 + 마음의 고향 맞춤화 | ✅ 사용 완료 (2026-04-30) |
| 67   | `harness-spec-driven` | wiki 활용 강화 결정 — 카파시 LLM Wiki 패턴 + 폐지 권고를 철회한 사고 과정 (4종 갱신 자동화) | ✅ 사용 완료 (2026-04-30) |
| 68   | `harness-spec-driven` | NPC 중심 서비스의 차별점 ADR — Evaluator + LMOps + RAG 3축 (PyTorch/LangChain/외부 vector DB 배제 이유 + 후속 트랙 사전 ADR) | ✅ 사용 완료 (2026-04-30) |
| 69   | `village-design-mvp` | 에셋 모델 — 큐레이션 vs AI 생성 vs 하이브리드 (D1 후보, 결정 전 자료) | ✅ 사용 완료 (2026-05-02) |
| 70   | `village-design-mvp` | 마을 차별점 + 에셋 톤 결정 — 산업 패턴 7개·톤 5개 비교 → 벡터/미니멀 채택 후 Stardew 결로 정정 (D2) | ✅ 사용 완료 (2026-05-02) |
| 71   | `village-design-mvp` | 본심에서 디자인 길어내기 — 자기 인터뷰 4단계 워크샵 + 컨셉 피벗 검토 + 톤·자산·AI 활용 결정 (Alone Together 학술 다이브 + 톤 3번 변경 흐름 + 마플 커피챗 인사이트 모범 사례) | ✅ 사용 완료 (2026-05-02) |
| 72   | `village-design-mvp` | (예비 — Step 1 디자인 시스템 토큰 추출 또는 Phaser 자산 파이프라인) | 미사용 |
| 73   | `village-design-mvp` | (예비 — Step 2~) | 미사용 |

> 74번 이후는 트랙 추가 시 본 표에 5번 단위로 예약.

---

## 사용 규칙

1. **예약 → 작성 → INDEX 등록** 순서 준수
2. **다른 트랙의 예약 번호를 임의로 사용하지 않음**
3. 트랙이 예약한 번호를 끝내 안 쓰면 본 표에서 `반환` 처리 (다른 트랙 예약 가능)
4. 본 표를 변경하는 PR은 **단독 PR로 작은 단위 커밋** 권장 (다른 코드 변경과 섞지 말 것)
5. 작성 완료된 노트의 번호는 본 표에서 제거하지 않음 — 이력 보존용

---

## 빈 번호 (병합으로 사라진)

| 번호 | 이동처 |
|------|--------|
| 09 | 원래 빈 번호 |
| 10 (구 JPA Entity Patterns) | → 08 |
| 11 (구 Security Config Patterns) | → 08 |
| 14 (구 Cassandra Spring Boot 4.x) | → 12 |
| 19 (구 Checkstyle 억제) | → 18 |

**재사용 금지.** git 히스토리에 원본 보존.
