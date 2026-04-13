# 23. 채팅방 구조 설계 — "공간이 곧 채팅방"인가, 분리해야 하는가

> 작성 시점: 2026-04-13
> 맥락: NPC 클릭마다 `POST /api/v1/chat-rooms`가 새 채팅방을 생성하는 문제를 발견하면서, "채팅방이란 무엇인가"부터 재정의하게 되었다.

---

## 배경

현재 코드에서 NPC를 클릭할 때마다 새 채팅방이 생성된다. 마을은 1개인데 채팅방은 무한 증식한다. 이건 단순 버그가 아니라 **"채팅방"의 정의가 모호한 설계 문제**다.

구체적으로:
- "마을 공개 채팅"은 채팅방인가? 마을 자체인가?
- "NPC와 1:1 대화"는 채팅방인가? 대화 세션인가?
- 이 둘을 같은 `ChatRoom` 엔티티로 관리하는 게 맞는가?

ZEP, Gather.town 같은 2D 메타버스 서비스들이 이 문제를 어떻게 풀었는지 참고했다.

---

## 선택지 비교

|  | A. Space = ChatRoom | B. 채팅방 독립 엔티티 | C. Discord 스타일 Channel 모델 |
|--|---------|---------|---------|
| 핵심 개념 | 마을(Space)이 생성되면 채팅방이 자동 생성된다. 입장 = 구독. 별도 "방 생성" API 없음 | 공간과 채팅방을 완전히 분리. 하나의 공간 안에 여러 채팅방이 존재할 수 있음 | Server(=마을) 안에 Channel(일반, 거래, 자유 등)을 만들고, 각 Channel이 독립 채팅 스트림 |
| 장점 | 단순하고 직관적. 유저가 "방 생성"이라는 개념을 몰라도 됨. ZEP/Gather가 이미 검증한 모델 | 유연함. "거래 채팅방", "잡담방" 같은 채널 분리가 자연스러움. 채팅방마다 다른 정책(읽기전용 등) 적용 가능 | 구조적으로 가장 확장성이 좋음. 커뮤니티 규모가 커져도 정보를 채널별로 분산 |
| 단점 | 채팅 유형이 다양해지면 Space에 너무 많은 책임이 몰림. 나중에 채널 분리 시 마이그레이션 필요 | 현재 마을 1개, 채널 1개인데 테이블 조인과 관리 포인트가 늘어남. 전형적인 YAGNI 위반 | 우리 서비스의 핵심 가치("고향의 편안함")와 맞지 않음. Discord는 커뮤니티 관리 도구지 안식처가 아님 |
| 적합한 상황 | 소규모 공간 기반 서비스. "공간에 들어가면 자연스럽게 대화가 시작"되는 경험이 중요한 경우 | 채팅이 핵심 기능이고, 공간과 대화를 독립적으로 발전시키려는 경우 | 수천 명 규모의 커뮤니티. 정보를 주제별로 정리해야 하는 경우 |
| 실제 사용 사례 | ZEP, Gather.town, SpatialChat | Slack 워크스페이스 (Space) + 채널 (Room) | Discord (Server + Channel + Thread) |

---

## 이 프로젝트에서 고른 것

**선택: A. Space = ChatRoom**

이유:
1. **ZEP/Gather에서 검증된 모델이다.** 2D 공간 기반 서비스에서 "입장 = 채팅 참여"는 이미 수백만 유저가 익숙한 UX다. 유저에게 "채팅방을 만드세요"라고 요구하는 건 마을의 자연스러움을 깨뜨린다.
2. **YAGNI.** 현재 마을 1개, 채널 종류 1개(공개 채팅). 채널 분리가 필요한 시점은 "거래 기능"이나 "동호회 기능"이 생길 때인데, 그건 Phase 5 이후 이야기다. 지금 채널 모델을 만들면 빈 추상화만 늘어난다.
3. **NPC 대화는 채팅방이 아니다.** NPC 클릭 시 새 채팅방이 생기는 것 자체가 모델링 오류다. NPC와의 1:1 대화는 "대화 세션(Conversation)"이라는 별도 개념으로 분리하는 게 맞다. 채팅방 무한 증식 문제가 자연스럽게 해결된다.

---

## 핵심 개념 정리

### 채팅 유형을 먼저 분류해야 모델이 보인다

채팅방 구조를 고민하기 전에, "이 서비스에 어떤 종류의 대화가 있는가"부터 정리해야 한다. 종류가 다르면 수명, 저장 방식, 토픽 구조가 전부 달라진다.

```
채팅 유형                 성격       수명       저장          STOMP 토픽
──────────────────────────────────────────────────────────────────────────
마을 공개 채팅     N:N broadcast    영구    Cassandra    /topic/chat/{spaceId}
NPC 1:1 대화      1:1 세션         세션/영구  Cassandra    /topic/npc/{conversationId}
귓속말(DM)        1:1 휘발         휘발    Redis pub/sub  /queue/whisper
```

이 분류에서 핵심 통찰은 **NPC 대화가 "채팅방"이 아니라 "대화 세션"이라는 점**이다.

### Space = ChatRoom이 의미하는 것

```
[마을 생성]
    │
    ├── Village 엔티티 생성
    └── ChatRoom 자동 생성 (type=VILLAGE, spaceId=village.id)
         └── 1:1 매핑. 마을이 존재하는 한 채팅방도 존재.

[유저 입장]
    │
    ├── STOMP SUBSCRIBE /topic/chat/{spaceId}  ← 자동 구독
    └── REST GET /messages?limit=50            ← 히스토리 로드
```

유저가 "채팅방에 들어간다"는 행위 자체가 없다. 마을에 입장하면 이미 채팅에 참여한 것이다. 이게 ZEP/Gather의 핵심 UX이고, 우리도 그걸 따른다.

### NPC 대화 = Conversation (채팅방이 아니다)

```
[NPC 클릭]
    │
    ├── 기존 Conversation 조회 (유저 + NPC 조합)
    │     ├── 있으면 → 기존 세션 재개, 대화 히스토리 로드
    │     └── 없으면 → 새 Conversation 생성
    │
    └── Conversation은 ChatRoom과 다른 엔티티
          - ChatRoom: 공간에 귀속. 영구적. N:N.
          - Conversation: 유저-NPC 관계에 귀속. 1:1. 세션 기반.
```

이렇게 분리하면 NPC 클릭마다 채팅방이 생기는 문제가 구조적으로 사라진다. Conversation은 (userId, npcId) 조합으로 unique하게 관리되므로, 같은 NPC를 여러 번 클릭해도 같은 대화가 이어진다.

### 비교 서비스 모델 분석

**ZEP / Gather.town 모델:**
```
Space (공간)
  └── 공개 채팅 (Space에 귀속, 1:1)
  └── Nearby 채팅 (좌표 기반, 선택적)
  └── DM (유저 간 1:1, Space와 독립)
```
공간 입장이 곧 채팅 참여. "채팅방 생성" 개념이 없다.

**Discord 모델:**
```
Server (커뮤니티)
  └── Category
       └── Channel (텍스트/음성)
            └── Thread (채널 내 분기 대화)
  └── DM (Server와 독립)
```
채팅이 핵심 기능. 공간이 아니라 "대화 조직"이 목적이다.

우리 서비스는 **공간이 핵심이고 대화는 부가 기능**이므로, ZEP 모델이 맞다.

---

## 실전에서 주의할 점

- **ChatRoom과 Conversation의 경계가 흐려지지 않게 주의한다.** "NPC와의 대화도 결국 채팅 아닌가?"라는 유혹이 올 때마다 수명과 참여자 수를 기준으로 판단한다. N:N + 영구 = ChatRoom, 1:1 + 세션 = Conversation.
- **마을 삭제 시 ChatRoom도 비활성화해야 한다.** Space = ChatRoom이므로 마을 라이프사이클에 ChatRoom이 종속된다. Conversation은 마을이 삭제되어도 NPC 대화 히스토리로 남을 수 있다 (정책 결정 필요).
- **"채팅방 생성" API를 아예 없애야 하는가?** 당장은 VILLAGE 타입의 ChatRoom은 마을 생성 시 자동으로 만들어지므로, 외부에서 호출하는 생성 API가 필요 없다. 하지만 미래에 "유저가 만드는 소모임 채팅방"이 필요할 수 있으므로 API 자체를 삭제하기보다 VILLAGE 타입은 내부에서만 생성하도록 제한하는 게 낫다.
- **STOMP 토픽 네이밍을 지금 잘 잡아야 한다.** `/topic/chat/{spaceId}`와 `/topic/npc/{conversationId}`를 지금 확정하면 클라이언트 코드가 이 경로에 의존하게 된다. 나중에 바꾸면 프론트/백 동시 수정이 필요하다.

---

## 나중에 돌아보면

- **채널 분리가 필요해지는 시점:** 마을에 "거래 게시판", "자유 게시판" 같은 기능이 추가되면 단일 공개 채팅방으로는 부족하다. 그때 ChatRoom에 `channel` 개념을 추가하거나 별도 엔티티로 분리해야 한다. 하지만 이건 마이그레이션이라기보다 확장이다 -- ChatRoom 테이블에 `channel_type` 컬럼 추가 + 토픽 경로에 채널 구분자 추가 정도.
- **유저 간 1:1 DM이 필요해지는 시점:** 현재는 NPC와의 Conversation만 있지만, 유저끼리 귓속말을 넘어 진짜 DM을 주고받고 싶다는 요구가 올 수 있다. 그때 Conversation 모델을 유저 간으로 확장할지, 새 엔티티를 만들지 결정해야 한다.
- **동시 접속 100명 이상:** Everyone 채팅이 너무 빠르게 흐르면 [21번 학습노트](./21-village-public-chat-architecture.md)에서 다룬 Nearby 채팅 도입을 재검토한다.
- **이 결정이 틀렸다고 느끼는 순간:** "한 마을에 성격이 다른 대화가 3종류 이상 섞이기 시작할 때". 그때는 Space != ChatRoom으로 분리해야 한다.

---

## 더 공부할 거리

### 직접 관련
- 관련 학습노트: [21-village-public-chat-architecture.md](./21-village-public-chat-architecture.md) -- 마을 공개 채팅의 Everyone/Nearby/DM 비교와 @멘션 NPC 패턴
- 관련 학습노트: [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) -- STOMP 프로토콜 동작 원리

### 채팅 시스템 설계
- [How to Design a Chat System: A Complete Guide](https://www.systemdesignhandbook.com/guides/design-a-chat-system/) -- 채팅 시스템 전체 설계를 체계적으로 정리한 가이드
- [System Design Interview: Chat Application](https://medium.com/@m.romaniiuk/system-design-chat-application-1d6fbf21b372) -- WhatsApp/Slack/Discord 관점의 채팅 시스템 설계
- [Alternative to Discord architecture](https://chrisza.me/discord-architecture-alternative/) -- Discord 아키텍처의 대안적 접근

### 메타버스 채팅 패턴
- [NPC Conversations in the Metaverse](https://charisma.ai/blog/npc-conversations-in-the-metaverse) -- 메타버스에서 NPC 대화의 설계 패턴. "대화 세션"이라는 개념이 왜 "채팅방"과 달라야 하는지를 잘 설명
- [Private Chat in a Public Space of Metaverse Systems](https://arxiv.org/html/2511.07993v1) -- 메타버스 공유 공간 내 프라이빗 대화 설계에 관한 학술 연구
- [Third Room (Matrix.org)](https://github.com/matrix-org/thirdroom/discussions/20) -- Matrix 프로토콜 기반 오픈소스 메타버스. 공간과 채팅을 어떻게 통합하는지 참고

### YAGNI와 설계 판단
- [The Power of Simplicity: Understanding YAGNI](https://www.linkedin.com/pulse/power-simplicity-understanding-yagni-software-varghese-chacko) -- 채팅 앱 사례를 포함한 YAGNI 원칙 실전 적용기
- 핵심 질문: "지금 채널 모델을 만들면 3개월 안에 쓸 것인가?" 대답이 "아니오"면 만들지 않는다
