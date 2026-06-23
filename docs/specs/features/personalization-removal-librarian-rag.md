---
type: Feature Spec
feature: personalization-removal-librarian-rag
track: personalization-removal-librarian-rag
issue: "#151"
status: implemented
created: 2026-06-23
last-updated: 2026-06-23
---

# 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬

> 이 spec 은 트랙 `personalization-removal-librarian-rag` (Issue #151) 의 요구사항 진실이다.
> 진행 상태는 [track-personalization-removal-librarian-rag.md](../../handover/track-personalization-removal-librarian-rag.md)를 따른다.

---

## 1. Outcomes

- DB에 저장되는 개인 공간, 개인 캐릭터, 꾸미기, 포인트/아이템 Economy가 현재 제품 모델에서 제거된다.
- 프로젝트의 저장 중심이 고백, 편지, 감사 답장, 반응, 신고, 개인별 사서 RAG로 정렬된다.
- 일반 채팅은 RAG 기억 저장소가 아니라 공개 커뮤니케이션 런타임으로 남는다.
- 3D 마을/도서관은 DB 개인화가 아닌 런타임 경험과 진입 표면으로 유지된다.

## 2. Scope

### 2.1 In

- 다음 DB 테이블 제거 migration 추가:
  - `space`, `space_placement`
  - `character`, `character_equipment`
  - `point_wallet`, `point_transaction`
  - `item_definition`, `user_item_inventory`
- 다음 API와 백엔드 흐름 제거:
  - `GET /api/v1/village/characters/me`
  - `GET /api/v1/village/spaces/me`
  - 회원가입 후 기본 캐릭터/공간 생성 consumer
  - 회원가입 `user.registered` Outbox 발행 흐름
- README, ERD, API 명세, 이벤트 명세, Wiki, handover 문서를 현재 모델과 맞춘다.
- 사서 RAG의 1차 corpus를 사용자 소유 Confession/Library 데이터로 정의한다.

### 2.2 Out

- 대체 수익모델 설계
- Village 패키지 전체 이름 변경
- 공개/일반 채팅 메시지를 사서 RAG 기억으로 사용하는 설계
- 사서 RAG의 벡터 저장소, 검색 랭킹, 모델 호출 상세 구현
- 저장형 개인화 기능을 "보류", "폐기 예정", "미래 기능"으로 문서에 남기는 방식

## 3. Constraints

| 차원 | 제약 |
|------|------|
| DB | 기존 migration 이력은 수정하지 않고 새 Flyway versioned migration으로만 정리한다. |
| 데이터 | 제거 대상 테이블 데이터는 의도적으로 삭제한다. 운영 적용 전 DB 백업과 대상 테이블 데이터 확인이 필요하다. |
| 아키텍처 | 도메인 간 FK를 만들지 않고, Confession/Library의 사용자 소유권 경계를 RAG 기준으로 둔다. |
| 제품 | 3D 마을/도서관 런타임 경험은 유지하되 DB 저장 개인화는 제공하지 않는다. |
| 문서 | 현재형 문서에서 개인 공간/캐릭터 꾸미기/Economy를 살아있는 기능처럼 설명하지 않는다. |

## 4. Decisions

### D1. [제품 경계] 저장형 개인화 제거

- **왜**: 현재 제품 가치는 꾸미기/수익화보다 고백, 편지, 사서 RAG의 재방문 경험에 있다.
- **대안**:
  - 폐기 표시만 남김 — 문서 정합성을 해치고 다음 구현자가 활성 기능으로 오해할 수 있어 거부.
  - 테이블은 유지하고 코드만 제거 — DB와 문서가 계속 어긋나므로 거부.
- **빈틈**: 향후 수익모델을 다시 설계할 때 새 저장 모델이 필요할 수 있다.
- **재검토 트리거**: 사용자가 명시적으로 꾸미기/아이템 구매형 경제 모델을 다시 요구하는 경우.

### D2. [RAG 경계] 일반 채팅은 RAG 기억으로 쓰지 않음

- **왜**: 공개 채팅은 사적 상담 기억보다 실시간 커뮤니케이션 성격이 강하고, 프라이버시 위험이 크다.
- **대안**:
  - 모든 채팅을 장기 기억화 — 데이터 경계가 흐려져 거부.
  - RAG를 전면 보류 — 이번 재정렬의 핵심 방향이 사라져 거부.
- **빈틈**: 사용자가 공개 대화 기반 회고를 원할 수 있다.
- **재검토 트리거**: 별도 동의/가시성/삭제 정책을 갖춘 기억 기능 요구가 생기는 경우.

### D3. [DB 스키마] 의도적 비가역 drop migration

- **왜**: 이번 결정은 저장 모델 제거이며, 테이블을 남기면 코드/문서/DB 정합성이 깨진다.
- **대안**:
  - rollback migration으로 복원 — Flyway versioned history와 제품 결정에 맞지 않고 실제 데이터 복구 보장을 주지 못해 거부.
  - archive 테이블 생성 — 현재 제품 범위 밖이며 복구 요구가 명확하지 않아 거부.
- **빈틈**: 운영 DB에 의미 있는 사용자 데이터가 있으면 손실된다.
- **재검토 트리거**: 운영 적용 전 대상 테이블에 보존해야 할 데이터가 확인되는 경우.

## 5. Tasks

| Step | 내용 | 의존 | 예상 변경 영역 | 이슈 | Commit |
|------|------|------|---------------|------|--------|
| 1 | 이슈/spec/track 생성 | — | docs/specs, docs/handover | #151 | 0b0f502, 7829a06 |
| 2 | 백엔드 character/space 저장 모델 제거 | step1 | backend village/identity | #151 | ac0f454, 7352a4b |
| 3 | DB drop migration 추가 | step2 | backend db/migration | #151 | 24def39 |
| 4 | 테스트 정리 | step2 | backend tests | #151 | e6669d4 |
| 5 | README/ERD/API/Wiki/handover 정합화 | step3 | docs, README | #151 | 801d85e, b297e89, 26653b5, 5005d9f, 9c8be29 |

## 6. Verification

- [x] 백엔드 테스트 또는 `check` 통과
- [x] 프론트 lint, format check, test, build 통과
- [x] 제거 API가 controller와 API 문서에서 모두 사라짐
- [x] 제거 테이블 drop migration 존재
- [x] README/ERD/domain boundary가 현재 제품 모델과 일치
- [x] 일반 채팅이 RAG 기억으로 설명되지 않음
- [x] 제거 대상 stale reference 검색 완료

## 7. References

- Issue: [#151](https://github.com/zkzkzhzj/ChatAppProject/issues/151)
- Track: [track-personalization-removal-librarian-rag.md](../../handover/track-personalization-removal-librarian-rag.md)
- Design note: [2026-06-23-personalization-removal-librarian-rag-design.md](../../superpowers/specs/2026-06-23-personalization-removal-librarian-rag-design.md)
- Plan: [2026-06-23-personalization-removal-librarian-rag.md](../../superpowers/plans/2026-06-23-personalization-removal-librarian-rag.md)
- ERD: [erd.md](../../architecture/erd.md)
- API: [village.md](../api/village.md)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-06-23 | 초안 작성 및 구현 완료 상태 반영 |
