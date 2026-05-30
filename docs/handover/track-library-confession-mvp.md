# Track: library-confession-mvp

> 작업 영역: 도서관 고백 기록 MVP
> 시작일: 2026-05-28
> Issue: #116
> 브랜치: `feat/library-confession-mvp`
> Spec: [docs/specs/features/library-confession-mvp.md](../specs/features/library-confession-mvp.md)

## 0. 한 줄 요약

마을 도서관에 익명 고백 기록, 비공개 편지, 감사 답장, 이모지 공감, 태그 기반 NPC 안내를 MVP로 구현한다.

## 0.5 Acceptance Criteria

- [ ] 고백 기록 작성/목록/상세/삭제가 가능하다.
- [ ] 공개 API와 화면에 작성자 식별 정보가 노출되지 않는다.
- [ ] 비공개 편지는 고백 작성자와 편지 작성자 본인 외에는 조회할 수 없다.
- [ ] 감사 답장은 편지별 1회만 생성된다.
- [ ] 이모지 공감 중복은 DB 제약 또는 insert-if-absent로 보장된다.
- [ ] NPC 태그 기반 조회에 비공개 편지와 감사 답장이 포함되지 않는다.
- [ ] 위험 고백 감지와 신고/숨김을 위한 최소 정책 진입점이 있다.
- [ ] 새 기능 성공/실패 테스트가 존재한다.

## 1. 배경 / 왜

도서관은 마을 안에서 사용자가 혼자 들어와 익명으로 고백 기록을 남기고, 누군가의 비공개 편지를 받을 수 있는 공간이다. 피드형 커뮤니티가 아니라 책장에서 기록을 꺼내 읽는 경험을 목표로 한다.

참조:

- [도서관 고백 기록 공간](../knowledge/library-confession-room.md)
- [도서관 고백 기록 MVP 구현 계획](../planning/library-confession-mvp-plan.md)
- [도서관 고백 기록 MVP spec](../specs/features/library-confession-mvp.md)

## 2. 전체 로드맵

Issue #116은 하나의 PR로 닫는다. 아래 Step은 PR 분할 단위가 아니라 커밋 가능한 작업 단위다.

| Step | 내용 | 의존 | 상태 | 이슈 | Commit |
|------|------|------|------|------|--------|
| 1 | 하네스/트랙 정책 교정 | — | ✅ 완료 | #116 | 5516855 |
| 2 | 백엔드 구조 조사 + 도메인/API 상세 설계 | Step 1 | ✅ 완료 | #116 | 2c5e6f9 |
| 3 | 고백 기록 도메인 골격 | Step 2 | ✅ 완료 | #116 | 44c8d83 |
| 4 | 고백 기록 영속성/마이그레이션 | Step 3 | ✅ 완료 | #116 | fcf476a |
| 5 | 고백 기록 API | Step 4 | ✅ 완료 | #116 | f4f673a |
| 6 | 비공개 편지/감사 답장 | Step 5 | ✅ 완료 | #116 | d9591dd |
| 7 | 이모지 공감 + 위험 감지/신고 진입점 | Step 5 | 🔧 진행 | #116 | TBD |
| 8 | NPC 태그 기반 유사 고백 안내 | Step 5 | 대기 | #116 | TBD |
| 9 | 프론트 도서관 MVP 화면 | Step 5-8 | 대기 | #116 | TBD |
| 10 | 통합 검증 + Critic Gate | Step 3-9 | 대기 | #116 | TBD |

## 3. 현재 단계 상세

현재는 Step 7 이모지 공감 + 위험 감지/신고 진입점 진행 직전이다.

정책 교정:

- PR 단위: 1 티켓 = 1 PR
- 커밋 단위: 1 작업 = 1 커밋
- Step은 PR이 아니라 커밋 가능한 작업 단위
- Issue #116은 하나의 PR로 구현한다.

Step 2 구조 조사 결과:

- 백엔드는 `identity`, `village`, `communication` 도메인별 헥사고날 패키지 구조를 따른다.
- Domain 객체는 JPA/Spring 어노테이션 없는 POJO이며 `newXxx()` 또는 `restore()` 정적 팩토리를 쓴다.
- Persistence Entity는 `adapter/out/persistence`에 있고 `from(domain)`, `toDomain()` 변환을 가진다.
- REST Controller는 `adapter/in/web`에 있고 DTO는 Java `record`를 사용한다.
- `HexagonalArchitectureTest`가 도메인 순수성, 도메인 간 직접 참조 금지, 레이어 의존 방향을 검증한다.
- `confession` 도메인을 추가하면 ArchUnit 테스트에 confession 경계 규칙을 추가해야 한다.
- Flyway 마이그레이션은 `backend/src/main/resources/db/migration`의 다음 버전으로 추가한다.
- 프론트에는 이미 `frontend/src/three/scenes/LibraryScene.ts`가 있어 도서관 공간 연출과 기능 화면 연결 지점이 존재한다.

## 4. 충돌 위험 파일

- `AGENTS.md`
- `docs/harness/**`
- `docs/knowledge/INDEX.md`
- `docs/knowledge/library-confession-room.md`
- `docs/planning/library-confession-mvp-plan.md`
- `docs/specs/features/library-confession-mvp.md`
- `docs/handover/INDEX.md`
- `docs/handover/track-library-confession-mvp.md`
- backend 도메인/어댑터 패키지: Step 1 조사 후 확정
- `backend/src/test/java/com/maeum/gohyang/architecture/HexagonalArchitectureTest.java`
- frontend 도서관 화면: Step 6에서 확정

## 5. 다음 세션 착수 전 확인 사항

- GitHub Issue #116 기준으로 spec/track을 맞춘다.
- 현재 활성 트랙과 충돌하는 backend/frontend 영역이 있는지 다시 확인한다.
- `feat/library-confession-mvp` 브랜치에서 Issue #116 티켓 PR을 이어간다.
- 다음 작업 커밋은 Step 7 이모지 공감 + 위험 감지/신고 진입점이다.
- 작업 하나가 끝날 때마다 테스트 가능한 범위로 커밋한다.

## 6. 보류 메모

- 토론형 게시글은 별도 `DISCUSSION` 트랙으로 분리한다.
- embedding/vector search는 MVP 이후 확장이다.
- 로컬 LLM 기반 NPC 말투/요약 고도화는 MVP 이후 확장이다.
- 운영자 고급 콘솔은 위험 감지/신고 진입점이 검증된 뒤 별도 트랙으로 분리한다.
