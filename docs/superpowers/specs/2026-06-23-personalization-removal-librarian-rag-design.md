# 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬 설계

> 작성일: 2026-06-23
> 상태: 승인된 설계
> 범위: DB에 저장되는 개인 공간, 개인 캐릭터, 꾸미기, Economy를 제거하고 고백/편지/개인별 사서 RAG 중심으로 프로젝트를 재정렬한다.

## 1. 목표

이 프로젝트는 더 이상 개인 방, 영속 캐릭터, 꾸미기, 포인트, 아이템을 핵심 제품 데이터로 취급하지 않는다.

현재 제품 모델은 다음과 같다.

- 3D 마을과 도서관은 진입 경험으로 유지한다.
- 아바타는 DB 캐릭터 레코드가 아니라 런타임 기본 시각 표현으로 유지한다.
- 실시간 채팅, 위치 공유, typing, 일일 방문, 건의, 대시보드는 유지한다.
- 고백, 편지, 감사 답장, 반응, 신고, 사서 RAG를 핵심 저장 데이터와 제품 표면으로 삼는다.
- 일반 채팅은 RAG 기억 저장소로 사용하지 않는다.

## 2. 비목표

- 제거 대상 테이블을 README나 아키텍처 문서에 미래 기능, 미사용 기능, 폐기 기능으로 남기지 않는다.
- 이번 트랙에서 대체 수익모델을 설계하지 않는다.
- Village 패키지 전체를 새 bounded context 이름으로 변경하지 않는다.
- 공개/일반 채팅 메시지를 사서 RAG 기억으로 사용하지 않는다.

## 3. 제품 경계

### 제거

- 개인 공간 저장
- 공간 배치와 꾸미기
- DB에 저장되는 개인 캐릭터
- 캐릭터 장비와 커스터마이징
- 포인트, 지갑, 거래 내역, 아이템 카탈로그, 인벤토리
- 회원가입 후 기본 캐릭터와 기본 공간을 생성하는 흐름
- `GET /api/v1/village/characters/me`
- `GET /api/v1/village/spaces/me`

### 유지

- 3D 마을/도서관 시각 경험
- 런타임 기본 아바타 표현
- Remote player 렌더링
- WebSocket 위치 공유, 퇴장 이벤트, typing indicator
- 일일 방문 집계
- 건의
- 마을 대시보드
- 공개 채팅과 메시지 저장
- 고백과 도서관 워크플로

### 새 중심

사서 RAG는 개인별 Confession 데이터로 한정한다.

- 1차 corpus는 사용자가 소유한 고백 데이터다. 작성한 고백, 받은 편지, 보낸 편지, 필요한 경우 감사 답장을 포함한다.
- RAG 경계는 일반 Communication 채팅이 아니라 Confession/Library에 둔다.
- 검색은 사용자 소유권과 프라이버시를 반드시 지켜야 한다.

## 4. 백엔드 설계

Village는 유지하되, 책임을 마을 런타임 동작과 가벼운 공개 표면으로 축소한다.

삭제한다.

- `Character`, `Space`, `SpaceTheme`
- character/space use case와 service
- character/space port
- character/space JPA entity와 repository
- `InitializeUserVillageUseCase`
- `InitializeUserVillageService`
- `UserRegisteredEventConsumer`
- character/space web response, exception, test

유지한다.

- `PositionHandler`
- `PositionBroadcast`
- `PositionDisconnectListener`
- `TypingHandler`
- `VillageBoardService`
- `DailyVisit`
- `Suggestion`
- 마을 대시보드 read model

Identity는 다른 consumer가 필요로 할 수 있으므로 `user.registered` 발행을 유지할 수 있다. 다만 Village는 더 이상 이 이벤트를 구독해 개인 레코드를 만들지 않는다.

## 5. DB 설계

새 Flyway migration을 추가한다. 기존 migration 이력은 직접 수정하지 않는다.

FK 의존성을 고려해 자식 테이블부터 삭제한다.

```sql
DROP TABLE IF EXISTS character_equipment;
DROP TABLE IF EXISTS space_placement;
DROP TABLE IF EXISTS character;
DROP TABLE IF EXISTS space;
DROP TABLE IF EXISTS user_item_inventory;
DROP TABLE IF EXISTS item_definition;
DROP TABLE IF EXISTS point_transaction;
DROP TABLE IF EXISTS point_wallet;
```

해당 테이블의 기존 데이터는 의도적으로 삭제한다.

## 6. 문서 설계

문서는 현재 제품 모델과 일치하도록 수정한다. 제거 대상 개념을 활성 기능, 대기 기능, 폐기 기능으로 설명하지 않는다.

필수 수정 대상:

- `README.md`
- `docs/planning/project-overview.md`
- `docs/architecture/erd.md`
- `docs/architecture/erd.mermaid`
- `docs/architecture/domain-boundary.md`
- `docs/wiki/village/space-system.md`와 `docs/wiki/village/character-system.md`: 삭제하거나 런타임 presence 문서로 대체
- `docs/specs/api/village.md`
- handover track/index 파일

## 7. 이슈와 트랙

전체 전환을 다루는 GitHub 이슈 1개를 만든다.

> 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬

이슈에는 다음 체크리스트를 포함한다.

- 백엔드 character/space 제거
- DB drop migration
- 테스트 정리
- README와 아키텍처 문서 정리
- ERD 정리
- RAG 경계 문서화
- 검증

이 작업과 대응되는 handover track과 feature spec을 만든다.

## 8. 검증

가능한 가장 강한 로컬 검증을 실행한다.

- 백엔드 컴파일 또는 `./gradlew.bat --no-daemon test`
- 개인 공간, 캐릭터 영속화, 포인트, 아이템, 인벤토리, 지갑, Economy의 stale active reference 검색
- 제거된 API 스펙과 controller 동작 정합성 확인
- Flyway migration 순서와 삭제 대상 테이블명 확인
- 프론트엔드가 제거된 character/space API를 호출하지 않는지 확인하고, 호출이 남아 있으면 수정

## 9. 리스크

- 코드, DB, 테스트, 문서를 모두 건드리는 큰 PR이다.
- 기존 프론트엔드 코드가 제거된 character/space endpoint를 호출하고 있을 수 있다.
- 개인화와 Economy 관련 기존 DB 데이터는 migration으로 삭제된다.
- RAG 구현 세부사항이 이번 트랙에서 일반 채팅 기억으로 확장되면 안 된다.
