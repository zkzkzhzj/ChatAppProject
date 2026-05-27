# Track: library-confession-mvp

> 작업 영역: 도서관 고백 기록 MVP
> 시작일: 2026-05-28
> Issue: #116
> 브랜치: `feat/library-confession-mvp-step1` 예정
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

| Step | 내용 | 의존 | 상태 | 이슈 | PR |
|------|------|------|------|------|-----|
| 1 | 백엔드 구조 조사 + 도메인/API 상세 설계 | — | 🔧 진행 | #116 | TBD |
| 2 | 고백 기록 도메인/영속성/API | Step 1 | 대기 | #116 | TBD |
| 3 | 비공개 편지/감사 답장 | Step 2 | 대기 | #116 | TBD |
| 4 | 이모지 공감 + 위험 감지/신고 진입점 | Step 2 | 대기 | #116 | TBD |
| 5 | NPC 태그 기반 유사 고백 안내 | Step 2 | 대기 | #116 | TBD |
| 6 | 프론트 도서관 MVP 화면 | Step 2-5 | 대기 | #116 | TBD |
| 7 | 통합 검증 + Critic Gate | Step 2-6 | 대기 | #116 | TBD |

## 3. 현재 단계 상세

현재는 Step 1 구조 조사 진행 중이다.

Step 1에서 해야 할 일:

- backend 모듈 구조 확인: 1차 완료
- 기존 도메인 패키지, Controller, DTO, Persistence Adapter 패턴 확인: 1차 완료
- 테스트 패턴과 마이그레이션 도구 확인
- `confession` 도메인 패키지 설계안 확정
- Step 2의 실제 변경 파일 목록 도출

1차 발견사항:

- 백엔드는 `identity`, `village`, `communication` 도메인별 헥사고날 패키지 구조를 따른다.
- Domain 객체는 JPA/Spring 어노테이션 없는 POJO이며 `newXxx()` 또는 `restore()` 정적 팩토리를 쓴다.
- Persistence Entity는 `adapter/out/persistence`에 있고 `from(domain)`, `toDomain()` 변환을 가진다.
- REST Controller는 `adapter/in/web`에 있고 DTO는 Java `record`를 사용한다.
- `HexagonalArchitectureTest`가 도메인 순수성, 도메인 간 직접 참조 금지, 레이어 의존 방향을 검증한다.
- `confession` 도메인을 추가하면 ArchUnit 테스트에 confession 경계 규칙을 추가해야 한다.
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
- `main` 최신 pull 후 브랜치를 만든다.
- Step 1은 코드 변경보다 구조 조사와 상세 설계 확정이 우선이다.

## 6. 보류 메모

- 토론형 게시글은 별도 `DISCUSSION` 트랙으로 분리한다.
- embedding/vector search는 MVP 이후 확장이다.
- 로컬 LLM 기반 NPC 말투/요약 고도화는 MVP 이후 확장이다.
- 운영자 고급 콘솔은 위험 감지/신고 진입점이 검증된 뒤 별도 트랙으로 분리한다.
