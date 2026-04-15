# MD 정합성 리뷰 -- 2026-04-16 01:38

## 대상
- 종류: 문서 정합성 + 코드<->명세 교차검증
- 도구: Codex CLI (gpt-5.4) + Claude 보완 검증

## Codex 리뷰 결과

6건의 불일치 발견:

1. [P1] `docs/specs/api/communication.md:120-122` -- GET /api/v1/chat/mentionables를 Public으로 문서화했으나 실제로는 JWT 필요
2. [P2] `docs/specs/websocket.md:275-277` -- 토큰 없는 STOMP 연결을 "게스트로 취급"이라 했으나 실제로는 Principal 미설정
3. [P2] `docs/specs/event.md:56-59` -- user.registered 파싱 오류 시 "로그 후 스킵"이라 했으나 실제로는 rethrow+재시도
4. [P2] `docs/specs/event.md:104-106` -- npc.conversation.summarize LLM 실패 시 "로그 후 스킵"이라 했으나 실제로는 alert+rethrow+재시도
5. [P2] `docs/architecture/erd.md:52-63` -- USER_SOCIAL_AUTH가 현재 모델처럼 기술되었으나 JPA Entity 미구현
6. [P2] `docs/architecture/erd.md:184-207` -- CATEGORY, CHAT_ROOM_CATEGORY가 현재 모델처럼 기술되었으나 JPA Entity 미구현

## 보완 검증 및 수정 내역

### 추가 발견 (Claude 보완)

1. [WARNING] `V1__initial_schema.sql:134` -- chat_room.type 주석이 `DIRECT / GROUP / NPC`로 PUBLIC 누락. ERD와 코드에는 PUBLIC 포함.
2. [INFO] `global/config/StompAuthChannelInterceptor.java:14` -- global 패키지에서 identity 패키지 직접 import. 패키지 구조 문서상 global은 cross-cutting만 담당해야 하나, config 클래스의 의존성 주입이므로 위반은 아닌 것으로 판단.
3. [INFO] `docs/architecture/domain-boundary.md:269-281` -- 동기 조회 Port (Village->Identity, Communication->Village, Village->Economy)와 비동기 이벤트(MessageReported, UserSanctioned 등)가 문서화되어 있으나 모두 미구현. 문서에 "미구현"/"계획" 표시가 없어 혼동 가능.
4. [INFO] economy/, safety/, notification/ 패키지 -- 디렉토리 스캐폴딩만 존재하고 .java 파일 없음. package-structure.md에 "미구현, Phase X 예정"으로 표시되어 있어 문서는 정확함.

### 수정한 문서

| 파일 | 수정 내용 |
|------|----------|
| `docs/specs/api/communication.md:122` | "인증 불필요 (Public)" -> "인증 필요 (회원/게스트 모두 허용)" + 참고 노트 추가 |
| `docs/specs/websocket.md:277` | "토큰 없이 연결 시 게스트로 취급" -> Principal 미설정 동작 정확히 기술 |
| `docs/specs/event.md:56-59` | user.registered 에러 처리: userId null과 JSON 파싱 오류 구분, rethrow 동작 명시 |
| `docs/specs/event.md:104-106` | npc.conversation.summarize 에러 처리: alert+rethrow+재시도 동작 명시 |
| `docs/architecture/erd.md:52-63` | USER_SOCIAL_AUTH에 "미구현" 상태 노트 추가 |
| `docs/architecture/erd.md:184-207` | CATEGORY, CHAT_ROOM_CATEGORY에 "미구현" 상태 노트 추가 |
| `V1__initial_schema.sql:134` | chat_room.type 주석에 PUBLIC 추가 |
