# 도서관 고백 기록 MVP 구현 계획

> 작성일: 2026-05-28
> 입력 문서: [도서관 고백 기록 공간](../knowledge/library-confession-room.md)
> 하네스 단계: brainstorming -> parallel-agent-dispatch -> writing-plan

---

## 1. 목표

도서관 MVP는 마을 안에서 익명 고백 기록을 책장처럼 열람하고, 고백 작성자에게만 닿는 비공개 편지를 남길 수 있는 공간을 만든다.

성공 조건:

- 사용자는 익명 고백 기록을 작성하고 책장에서 열람할 수 있다.
- 다른 사용자는 고백 작성자에게만 보이는 편지를 남길 수 있다.
- 고백 작성자는 내게 온 편지를 보고 편지별 감사 답장 1회를 보낼 수 있다.
- 공개 화면과 API 응답에 작성자 식별 정보가 노출되지 않는다.
- NPC는 공개 고백 기록만 참조하고 비공개 편지는 참조하지 않는다.
- 위험 고백 감지와 신고/숨김을 위한 최소 정책 진입점이 있다.

비목표:

- 공개 댓글, 대댓글, 토론 스레드
- 실시간 채팅형 상담
- 인기순 랭킹, 공유/홍보 피드
- 로컬 LLM 기반 NPC 고도화
- embedding 기반 유사 고민 검색
- 운영자 고급 콘솔

---

## 2. 병렬 에이전트 통합 결과

| 관점 | 결론 |
|------|------|
| 제품/UX | 피드가 아니라 책장 열람 경험으로 설계한다. 공개 댓글 없이 촛불 공감과 비공개 편지를 중심에 둔다. |
| 도메인/API | `ConfessionRecord`, `ConfessionLetter`, `ConfessionThankReply`, `ConfessionReaction` 4개 모델로 시작한다. |
| 안전/운영 | 위험 고백 감지, 비공개 편지 접근 제어, 신고/숨김, NPC 응답 제한은 MVP부터 최소 정책을 둔다. |

---

## 3. 도메인 모델 후보

### ConfessionRecord

- 고백 기록 ID
- 작성자 userId: 내부 권한 확인용, 외부 비노출
- 제목 또는 첫 문장
- 본문
- 책장/태그
- 감정/분위기
- 상태: `VISIBLE`, `HIDDEN_BY_AUTHOR`, `PENDING_REVIEW`, `HIDDEN_BY_MODERATOR`, `DELETED`
- 위험도: `LOW`, `MEDIUM`, `HIGH`, `IMMINENT`
- 생성/수정 시각

### ConfessionLetter

- 편지 ID
- 고백 기록 ID
- 편지 작성자 userId: 내부 권한 확인용, 외부 비노출
- 본문
- 상태: `SENT`, `HIDDEN`, `DELETED`
- 생성 시각

### ConfessionThankReply

- 감사 답장 ID
- 편지 ID
- 본문
- 생성 시각
- 제약: 편지 1개당 감사 답장 1개

### ConfessionReaction

- 공감 ID
- 고백 기록 ID
- 사용자 ID
- 이모지 타입
- 생성 시각
- 제약: `confessionId + userId + emojiType` 중복 금지

---

## 4. API 후보

### 고백 기록

```text
POST /api/confessions
GET /api/confessions
GET /api/confessions/{confessionId}
DELETE /api/confessions/{confessionId}
```

### 편지

```text
POST /api/confessions/{confessionId}/letters
GET /api/me/confessions/{confessionId}/letters
GET /api/me/confession-letters/{letterId}
DELETE /api/me/confession-letters/{letterId}
```

### 감사 답장

```text
POST /api/me/confession-letters/{letterId}/thank-reply
GET /api/me/confession-letters/{letterId}/thank-reply
```

### 이모지 공감

```text
POST /api/confessions/{confessionId}/reactions
DELETE /api/confessions/{confessionId}/reactions/{emojiType}
GET /api/confessions/{confessionId}/reactions
```

### NPC 안내

```text
GET /api/library/npc/similar-confessions
```

MVP에서는 태그 기반 유사 고백 기록 안내만 제공한다.

---

## 5. 구현 단계

이 티켓은 Issue #116 하나의 PR로 끝낸다. 아래 단계는 PR 분할 단위가 아니라
커밋 가능한 작업 단위다.

| 단계 | 범위 | 파일 후보 | 검증 | 필요한 역할 | 커밋 |
|------|------|-----------|------|-------------|------|
| 1 | 하네스/트랙 정책 교정 | docs conventions, track/spec | markdownlint | Main Codex | TBD |
| 2 | 백엔드 기존 구조 조사 | backend source, 기존 domain packages | 패키지/테스트 패턴 확인 | Main Codex | 완료 |
| 3 | 고백 도메인 골격 | `confession/domain`, `confession/error`, `application/port/in` | 도메인 단위 테스트 | Domain Engineer | TBD |
| 4 | 영속성 모델/마이그레이션 | `adapter/out/persistence`, migration | JPA/DB 제약 테스트 | Adapter Engineer, Concurrency Critic | TBD |
| 5 | 고백 기록 API | `adapter/in/web`, DTO, service | 작성/목록/상세/삭제 테스트 | Adapter Engineer, Test Engineer | TBD |
| 6 | 비공개 편지/감사 답장 API | letter usecase, controller, persistence | 권한 실패/중복 답장 테스트 | Security Critic, Test Engineer | TBD |
| 7 | 이모지 공감 | reaction usecase, unique insert | 중복 공감 멱등성 테스트 | Concurrency Critic | TBD |
| 8 | 위험 감지/신고 진입점 | safety policy, report model | 위험도 분류/신고 중복 테스트 | Security Critic | TBD |
| 9 | NPC 태그 기반 안내 | npc query usecase | 편지 미포함 검증 | Technical Strategy Critic | TBD |
| 10 | 프론트 MVP 화면 | library pages/components | 주요 흐름 수동/자동 검증 | Main Codex | TBD |
| 11 | 최종 검증 | tests, lint, review | Critic Gate + PR preflight | Critic | TBD |

---

## 6. 우선 구현 순서

1. 백엔드 구조 조사
2. `confession` 도메인 패키지 생성
3. 고백 기록 작성/조회 API
4. 편지 작성/조회 API
5. 감사 답장 1회 제한
6. 이모지 공감
7. 위험 감지 최소 정책
8. NPC 태그 기반 조회
9. 프론트 책장/상세/편지함 화면

---

## 7. Critical Rule 체크 지점

- Domain Entity에 JPA/Spring 어노테이션 금지
- User 도메인 직접 참조 금지, `userId` 값만 사용
- 감사 답장 1회 제한은 `exists()` 후 insert 금지
- 이모지 공감 중복 방지는 unique constraint 또는 insert-if-absent 기반
- `RuntimeException` 직접 throw 금지
- Controller에서 Entity 직접 반환 금지
- 비공개 편지와 작성자 식별자는 공개 API/NPC API에 포함 금지

---

## 8. 열린 질문

1. 비로그인 사용자의 고백 열람을 허용할 것인가?
2. 비로그인 사용자의 편지 작성을 허용할 것인가?
3. 고백 삭제 후 받은 편지와 감사 답장은 작성자에게 계속 보이는가?
4. 감사 답장 수정/삭제를 MVP에서 허용할 것인가?
5. 이모지 공감은 여러 종류를 동시에 남길 수 있는가, 하나만 남길 수 있는가?
6. 운영자는 신고되지 않은 비공개 편지 본문을 볼 수 없는 것이 기본 정책인가?
