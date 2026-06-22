# Domain Boundary - 마음의 고향

---

## 1. 설계 원칙

도메인은 기능 목록이 아니라 **비즈니스 맥락**으로 나눈다.

- 같은 비즈니스 규칙과 불변조건을 공유하는가?
- 같은 언어를 같은 의미로 사용하는가?
- 독립적으로 변경하고 진화할 수 있는가?

같은 화면에 보인다고 같은 도메인이 아니다. 마을에서 채팅이 일어나더라도 Village와 Communication의 책임은 분리한다. 일반 채팅과 고백/편지도 서로 다른 저장 목적과 안전 경계를 가진다.

---

## 2. 전략적 분류

| 분류 | Bounded Context | 핵심 이유 |
|------|-----------------|-----------|
| Core | Confession / Library | 고백, 편지, 감사 답장, 사서 RAG의 사적 데이터 경계 |
| Core | Village | 3D 마을/도서관 런타임 경험, 위치 공유, 방문 집계 |
| Core | Communication | 공개 채팅과 실시간 메시지 전달 |
| Support | Safety | 신고와 제재로 서비스 안전성 유지 |
| Generic | Identity | 인증, 회원, 게스트 세션 |

수익 모델과 구매형 루프는 이번 트랙의 현재 bounded context가 아니다.

Notification은 현재 독립 도메인이 아니라 인프라 서비스다. 다른 도메인이 발행한 이벤트를 받아 Web Push 등을 보내는 역할로 둔다.

---

## 3. Bounded Context 상세

### 3.1 Confession / Library (Core)

서비스의 장기 제품 축이다. 사용자가 남긴 고백과 그에 도착한 편지, 감사 답장, 반응/신고, 사서 RAG의 사적 데이터 경계를 담당한다.

**책임:**

- 고백 작성, 조회, 상태 관리
- 편지 작성, 읽음 처리
- 감사 답장 작성
- 고백 반응과 신고 중복 방지
- 위험 수준과 안전 운영에 필요한 메타데이터 관리
- 비공개 사서 RAG가 참조할 수 있는 사적 데이터 경계 정의

**핵심 모델:**

- ConfessionRecord: 사용자가 남긴 고백
- ConfessionLetter: 고백에 도착한 편지
- ConfessionThankReply: 편지에 대한 감사 답장
- ConfessionReaction: 고백 반응
- ConfessionReport: 고백 신고

**불변조건:**

- 편지는 반드시 하나의 고백에 속한다.
- 감사 답장은 하나의 편지에 최대 하나만 연결된다.
- 같은 사용자는 같은 고백에 같은 반응을 중복으로 남길 수 없다.
- 같은 사용자는 같은 고백을 중복 신고할 수 없다.
- 사서 RAG는 일반 채팅을 장기 기억으로 사용하지 않는다.

**사용 인프라:** PostgreSQL, LLM/RAG 인프라(구체 저장소는 구현 시 별도 설계)

---

### 3.2 Village (Core)

마을과 도서관에서 "들어와 머무는 경험"을 담당한다. 저장형 사용자별 설정이 아니라 런타임 경험과 운영 집계가 중심이다.

**책임:**

- 3D 마을/도서관 진입 경험
- 장면 전환
- 기본 아바타와 RemotePlayer 렌더링을 위한 런타임 위치 공유
- 접속 종료 감지와 퇴장 broadcast
- 오늘 방문 집계
- 오늘 대시보드 조회
- 건의사항 등록/조회

**핵심 모델:**

- DailyVisit: 하루 방문 집계
- Suggestion: 건의사항
- RuntimeAvatar: 클라이언트 런타임 시각 상태
- Presence: WebSocket 세션 동안의 위치/퇴장 상태

**불변조건:**

- 같은 방문자는 같은 KST 날짜에 한 번만 방문 집계된다.
- 위치 상태는 장기 보관하지 않는다.
- 아바타와 RemotePlayer는 DB 기반 개인화가 아니다.
- Village는 고백/편지의 사적 데이터를 소유하지 않고 Confession/Library에 둔다.

**사용 인프라:** PostgreSQL, WebSocket/STOMP, Redis(필요 시 런타임 캐시), Three.js

---

### 3.3 Communication (Core)

마을 안에서 일어나는 공개 채팅과 실시간 메시지 전달을 담당한다.

**책임:**

- 채팅방 생성/관리
- 실시간 메시지 전송
- 메시지 저장과 조회
- 참여자 상태 관리
- 메시지 신고 이벤트 발행

**핵심 모델:**

- ChatRoom: 대화가 일어나는 공간
- Participant: 채팅 참여자
- Message: 개별 메시지

**불변조건:**

- 메시지는 반드시 ChatRoom에 속한다.
- 참여자만 메시지를 보낼 수 있다.
- 제재 상태인 사용자는 메시지를 보낼 수 없다.
- 일반 채팅 메시지는 사서 RAG의 사적 기억으로 승격하지 않는다.

**사용 인프라:** Cassandra, WebSocket/STOMP, Redis Pub/Sub

---

### 3.4 Safety (Support)

서비스의 안전성을 유지한다. 신고와 제재를 담당한다.

**책임:**

- 메시지와 고백 신고 접수
- 신고 이력 관리
- 제재 판단과 적용
- 제재 이력 관리

**핵심 모델:**

- Report: 개별 신고
- ModerationCase: 신고 검토 단위
- Sanction: 제재 이력

**불변조건:**

- 같은 사용자가 같은 대상을 중복 신고하지 않도록 한다.
- 제재는 이력 기준에 따라 단계적으로 적용한다.

**사용 인프라:** PostgreSQL, Kafka

---

### 3.5 Identity (Generic)

인증과 회원/게스트 세션을 담당한다.

**책임:**

- 이메일 로그인
- 소셜 인증 수단 확장
- JWT 발급/검증
- 게스트 세션 관리
- 게스트에서 회원으로 전환할 때 기존 데이터 연결

**핵심 모델:**

- User: 로그인 주체
- LocalAuthCredentials: 이메일 인증 수단
- SocialAuthCredential: 소셜 인증 수단
- GuestSession: 비로그인 세션

**불변조건:**

- 하나의 인증 수단은 하나의 사용자에게만 연결된다.
- 게스트 세션은 회원 전환 시 기존 데이터와 충돌하지 않아야 한다.

**사용 인프라:** PostgreSQL, Redis

---

## 4. "사용자"는 Context마다 다르게 표현한다

| Context | 표현 | 의미 |
|---------|------|------|
| Confession / Library | Author / Sender / Reporter | 고백 작성자, 편지 발신자, 신고자 |
| Village | Presence / RuntimeAvatar | 마을에 접속 중인 런타임 주체 |
| Communication | Participant | 채팅 참여자 |
| Safety | ReportTarget / SanctionedUser | 신고 대상 / 제재 대상 |
| Identity | UserIdentity | 로그인 주체 |

도메인 간에는 `userId` 같은 ID 값으로만 연결한다. 다른 도메인의 Entity, Repository, Service를 import하지 않는다.

---

## 5. 도메인 간 통신 규칙

### 5.1 내부 규칙

- 도메인 간 직접 참조 금지.
- 도메인 간 FK 금지.
- 동기 조회가 필요하면 Port와 조회 전용 VO를 사용한다.
- 부수 효과가 크거나 실패 후 보상이 필요한 흐름은 이벤트로 분리한다.

### 5.2 통신 맵

```text
Village -> Confession / Library
  오늘 대시보드 표시를 위한 고백 수 조회. FK 없이 read query로만 참조한다.

Communication -> Safety
  메시지 신고 이벤트 발행.

Confession / Library -> Safety
  고백 신고 또는 위험 신호 검토 요청.

Safety -> Identity / Communication
  제재 적용 이벤트 발행.

Identity -> Village
  게스트/회원 식별자를 런타임 위치 공유와 방문 집계에 제공.
```

### 5.3 동기 조회 예시

```java
public interface CountTodayConfessionsPort {
    long count(LocalDate date);
}
```

반환 객체는 대상 도메인의 Entity가 아니라 조회 목적에 맞춘 값이어야 한다.

---

## 6. 이벤트 흐름 예시

### 6.1 오늘 방문 집계

```text
사용자 마을 진입
  -> [Village] DailyVisit insert-if-absent
  -> [Village] 오늘 대시보드 응답
```

### 6.2 고백과 편지

```text
사용자 고백 작성
  -> [Confession / Library] ConfessionRecord 저장
  -> 다른 사용자가 편지 작성
  -> [Confession / Library] ConfessionLetter 저장
  -> 작성자가 감사 답장 작성
  -> [Confession / Library] ConfessionThankReply 저장
```

### 6.3 신고와 제재

```text
사용자 신고
  -> [Communication 또는 Confession / Library] 신고 이벤트 발행
  -> [Safety] 신고 접수와 검토
  -> 필요 시 [Safety] 제재 이벤트 발행
  -> [Identity / Communication] 제재 적용
```

---

## 7. 향후 분리 후보

| 대상 | 트리거 |
|------|--------|
| Library RAG 저장소 | 색인, 삭제 정책, 접근 권한이 Confession 테이블과 독립적으로 진화할 때 |
| Realtime Presence | 위치 공유 트래픽이 Village 애플리케이션 수명주기와 분리될 때 |
| Notification | 수신 설정, 재시도, 발송 이력 등 자체 정책이 생길 때 |

분리 시에는 ADR로 이유와 경계를 기록한다.
