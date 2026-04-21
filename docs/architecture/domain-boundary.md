# Domain Boundary — 마음의 고향

---

## 1. 설계 원칙

도메인은 "기능 목록"이 아니라 **"비즈니스 맥락"** 기준으로 나눈다.

**같은 도메인인가를 판단하는 기준:**

- 같은 비즈니스 규칙(불변조건)을 공유하는가?
- 같은 언어/용어를 같은 의미로 사용하는가?
- 독립적으로 변경하고 진화할 수 있는가?

**같은 도메인이 아닌 것:**

- 같은 화면에 보인다고 같은 도메인이 아니다. (마을에서 채팅하지만, Village와 Communication은 다르다)
- 같은 유스케이스에서 만난다고 같은 도메인이 아니다. (구매 시 포인트와 아이템이 만나지만, 각자 다른 규칙을 가진다)

---

## 2. 전략적 분류

| 분류 | Bounded Context | 핵심 이유 |
|------|----------------|-----------|
| Core | Communication | 서비스의 존재 이유. 이게 없으면 서비스가 아니다. |
| Core | Village | 차별화의 핵심. "마을"이라는 공간 경험을 만든다. |
| Core | Economy | 서비스 경제를 움직인다. 정합성이 곧 신뢰다. |
| Support | Safety | 서비스를 안전하게 유지한다. 없으면 커뮤니티가 무너진다. |
| Generic | Identity | 인증/인가. 대부분의 서비스에 공통으로 존재한다. |

**Notification은 도메인이 아니라 인프라 서비스다.** 자체 비즈니스 규칙이 없고, 알림 없이도 서비스가 정상 동작한다. 다른 도메인이 발행한 이벤트를 구독하여 FCM Web Push를 발송하는 역할만 한다. 최상위 `notification/` 패키지에 독립 모듈로 위치한다. 자체 정책(수신 설정, 재시도 등)이 추가되면 Bounded Context로 승격을 검토한다.

---

## 3. Bounded Context 상세

### 3.1 Communication (Core)

서비스의 핵심. 유저 간 실시간 소통을 담당한다.

**책임:**

- 채팅방 생성/관리
- 실시간 메시지 전송 (WebSocket/STOMP)
- 메시지 저장 및 조회 (Cassandra)
- 메시지 필터링 (욕설/비난 감지)
- 참여자 상태 관리 (접속 중, 입력 중 등)
- 음성/화면 공유 시그널링 (WebRTC) — **추후 추가 예정**

**핵심 모델:**

- ChatRoom — 대화가 일어나는 공간
- Message — 개별 메시지
- Participant — 채팅 참여자 (유저가 아닌 "참여자"로 표현)

**불변조건:**

- 메시지는 반드시 ChatRoom에 속해야 한다.
- 참여자만 메시지를 보낼 수 있다.
- 제재 상태인 유저는 메시지를 보낼 수 없다.

**사용 인프라:** Cassandra, WebSocket, Redis Pub/Sub, WebRTC (추후 추가 예정)

**발행 이벤트:**

- MessageReported (신고 접수 시)

**구독 이벤트:**

- UserSanctioned (Safety → 제재 적용)

---

### 3.2 Village (Core)

마을에서 "살아가는 경험"을 담당한다. 공간, 캐릭터, NPC를 포함한다.

**책임:**

- 마을 맵 상태 관리
- 유저 위치 동기화 (실시간)
- 공간(집) 생성 및 아이템 배치
- NPC 배치 및 상태 관리
- 캐릭터 생성 및 외형 관리
- 게스트 유저의 마을 입장 처리

**핵심 모델:**

- Space — 마을 또는 개인 공간 (SpaceTheme으로 테마 구분)
- Character — 유저의 캐릭터 (게스트는 `defaultGuest()` 인메모리)
- *(향후 추가 예정)* Presence — 유저의 현재 위치 및 상태
- *(향후 추가 예정)* WorldObject — NPC, 가구, 배경 오브젝트

**불변조건:**

- 유저는 동시에 하나의 Space에만 존재할 수 있다.
- 게스트 유저는 기본 Avatar만 사용할 수 있다.
- 아이템 배치는 Space 소유자만 가능하다.

**사용 인프라:** PostgreSQL, WebSocket, Redis (위치 캐싱), Phaser.js (프론트)

**발행 이벤트:**

- ItemEquipped (캐릭터 외형 변경 시)

**구독 이벤트:**

- ItemGranted (Economy → 아이템 지급 완료)

**향후 분리 후보:** 아바타 커스터마이제이션 규칙이 복잡해지면 Avatar를 독립 Context로 분리 검토.

---

### 3.3 Economy (Core)

서비스의 경제 시스템. 포인트와 아이템을 관리한다.

내부적으로 **Wallet**(포인트)과 **Inventory**(아이템) 두 서브 도메인으로 나뉜다. 현재는 같은 Bounded Context 안에서 패키지로 분리하되, 규모가 커지면 독립 Context로 승격할 수 있다.

#### Wallet (서브 도메인)

**책임:**

- 포인트 지갑 관리
- 포인트 획득 (광고 시청, 미션 보상 등)
- 포인트 소비 (아이템 구매)
- 거래 내역 기록
- 멱등성 및 동시성 제어

**핵심 모델:**

- PointWallet — 유저의 포인트 잔액 (금액성 Aggregate)
- PointTransaction — 거래 내역 (적립/차감)

**불변조건:**

- 잔액보다 많이 차감할 수 없다.
- 동일 요청에 대해 중복 차감/적립이 발생하지 않는다. (멱등성)
- 잔액의 정합성 기준은 항상 PostgreSQL이다. (캐시는 조회 가속 용도)

#### Inventory (서브 도메인)

**책임:**

- 아이템 카탈로그 (종류, 가격, 이미지)
- 유저 인벤토리 (보유 아이템 목록)
- 아이템 지급/회수

**핵심 모델:**

- ItemDefinition — 아이템 정의 (카탈로그)
- OwnedItem — 유저가 보유한 아이템
- Inventory — 유저의 아이템 목록

**불변조건:**

- 존재하지 않는 아이템은 지급할 수 없다.
- 보유하지 않은 아이템은 장착할 수 없다.

#### 구매 프로세스

아이템 구매는 Wallet과 Inventory를 **조율하는 Application Service**가 처리한다. 구매 자체는 도메인이 아니라 프로세스다.

```java
// PurchaseItemService — Wallet과 Inventory를 조율
@Transactional
public PurchaseResult execute(PurchaseItemCommand command) {
    // 멱등성 선점
    // Wallet: 포인트 차감
    // Inventory: 아이템 지급
    // 같은 트랜잭션으로 원자적 처리
}
```

**사용 인프라:** PostgreSQL, Kafka (부수 효과 이벤트)

**발행 이벤트:**

- PurchaseCompleted (Outbox)
- PointEarned (Outbox)
- PointSpent (Outbox)

**구독 이벤트:**

- AdRewardCallback (광고 SDK 콜백)

**향후 분리 후보:** Wallet과 Inventory 간 트랜잭션 충돌이 빈번해지거나 규모가 커지면 독립 Context로 분리. 이때 구매는 Saga 또는 Process Manager로 전환.

---

### 3.4 Safety (Support)

서비스의 안전을 지킨다. 신고와 제재를 담당한다.

**책임:**

- 신고 접수 (메시지 + 전후 맥락 첨부)
- 신고 누적 관리
- 제재 판단 및 적용 (경고, 채팅 제한, 정지)
- 제재 이력 관리

**핵심 모델:**

- Report — 개별 신고
- ModerationCase — 신고 누적 및 판단 단위
- Sanction — 제재 내역

**불변조건:**

- 동일 유저가 같은 메시지를 중복 신고할 수 없다.
- 제재는 누적 기준에 따라 단계적으로 적용된다.

**사용 인프라:** PostgreSQL, Kafka (제재 이벤트)

**발행 이벤트:**

- UserSanctioned (Outbox)

**구독 이벤트:**

- MessageReported (Communication → 신고 접수)

---

### 3.5 Identity (Generic)

인증과 인가를 담당한다.

**책임:**

- 소셜 로그인 (Google, Kakao 등)
- JWT 발급/검증
- 게스트 세션 관리
- 게스트 → 회원 전환 시 데이터 마이그레이션

**핵심 모델:**

- User — 로그인 주체 (현재 구현: `identity/domain/User.java`)
- LocalAuthCredentials — 이메일/비밀번호 인증 수단 (현재 구현: `identity/domain/LocalAuthCredentials.java`)
- *(향후 추가 예정)* SocialAuthCredential — 소셜 인증 수단 (Google, Kakao)
- *(향후 추가 예정)* GuestSession — 비로그인 세션 (현재는 JWT 클레임으로 관리)

**불변조건:**

- 하나의 소셜 계정은 하나의 UserIdentity에만 연결된다.
- 게스트 세션은 회원 전환 시 기존 데이터와 병합된다.

**사용 인프라:** PostgreSQL, Redis (세션/토큰 캐싱)

**발행 이벤트:**

- UserRegistered
- GuestConverted

**구독 이벤트:**

- UserSanctioned (Safety → 계정 정지 적용)

---

## 4. "유저"는 컨텍스트마다 다른 의미다

"User"라는 단어를 모든 도메인에서 같은 Entity로 쓰면 God Entity가 된다. 각 컨텍스트는 자기 맥락에 맞는 표현을 사용한다.

| Context | "유저"의 표현 | 의미 |
|---------|-------------|------|
| Communication | Participant | 채팅 참여자 |
| Village | Presence / Avatar | 마을에 존재하는 캐릭터 |
| Economy | WalletOwner | 포인트 지갑 소유자 |
| Safety | ReportTarget / SanctionedUser | 신고 대상 / 제재 대상 |
| Identity | UserIdentity | 로그인 주체 |

도메인 간에는 `userId` (ID 값)로만 연결한다. 다른 도메인의 Entity를 import하지 않는다.

---

## 5. 도메인 간 통신 규칙

### 5.1 절대 규칙

- **도메인 간 직접 참조 금지.** 다른 도메인의 Entity, Repository, Service를 import하지 않는다.
- **도메인 간 FK(Foreign Key) 금지.** 다른 도메인의 테이블을 FK로 참조하지 않는다. `userId` 같은 ID 값만 저장한다.

### 5.2 통신 방식 판단 기준

| 기준 | 동기 (Port 호출) | 비동기 (Kafka) |
|------|-----------------|---------------|
| 응답이 즉시 필요한가? | ✅ | ❌ |
| 실패 시 원래 행위를 취소해야 하는가? | ✅ | ❌ |
| 부수 효과인가? | ❌ | ✅ |

### 5.3 도메인 간 통신 맵

```text
[동기 — 같은 트랜잭션]
Economy 내부: Wallet + Inventory (구매 시 포인트 차감 + 아이템 지급)

[동기 — 조회 목적 Port 호출]
Village → Identity    : 유저 기본 정보 조회
Communication → Village : 근접 기반 대화 가능 여부 확인
Village → Economy     : 유저 보유 아이템 조회 (공간 꾸미기 시)

[비동기 — Kafka 이벤트]
Economy → Notification    : 포인트 획득/사용 알림 (Outbox)
Economy → Village         : 아이템 장착 → 캐릭터 외형 갱신
Safety → Identity         : 제재 적용 (Outbox)
Safety → Communication    : 채팅 제한 적용 (Outbox)
Communication → Safety    : 메시지 신고 접수
Communication → (분석)    : 욕설 감지 분석 (Outbox 불필요)
Identity → Village        : 회원가입 시 기본 캐릭터/공간 생성
```

### 5.4 동기 조회 시 규칙

다른 도메인을 조회할 때는 반드시 Port를 통해 접근한다. 반환 객체는 해당 도메인의 Domain Entity가 아니라 **조회 전용 VO**로 한다.

```java
// Village에서 Economy의 보유 아이템을 조회할 때

// ✅ Port + 조회 전용 VO
public interface LoadOwnedItemsPort {
    List<OwnedItemSummary> loadByUserId(Long userId);
}

// ❌ Economy의 OwnedItem Entity를 직접 반환
public interface LoadOwnedItemsPort {
    List<OwnedItem> loadByUserId(Long userId);
}
```

---

## 6. 이벤트 흐름 예시

### 6.1 아이템 구매 (동기 + 비동기)

```text
유저가 "아이템 구매" 요청

→ [Economy] PurchaseItemService (동기 트랜잭션)
    1. 멱등성 선점 (insertIfAbsent)
    2. Wallet: 포인트 차감 (낙관적 락)
    3. Inventory: 아이템 지급
    4. 결과 저장
    5. Outbox에 "PURCHASE_COMPLETED" 저장
→ 트랜잭션 커밋

→ [Outbox Publisher] (비동기)
    6. Kafka "purchase-completed" 발행

→ [Notification] (비동기)
    7. 멱등성 확인 → "구매 완료" Web Push 발송
```

### 6.2 메시지 신고 → 제재 (비동기)

```text
유저가 메시지 "신고"

→ [Communication]
    1. 신고 정보를 Kafka "message-reported" 발행

→ [Safety] Kafka Consumer
    2. 신고 접수, 누적 확인
    3. 임계치 미도달 → 끝
    3. 임계치 도달 → Outbox에 "USER_SANCTIONED" 저장

→ [Outbox Publisher] (비동기)
    4. Kafka "user-sanctioned" 발행

→ [Identity] Kafka Consumer
    5. 멱등성 확인 → 계정 제재 적용
→ [Communication] Kafka Consumer
    6. 멱등성 확인 → 채팅 제한 적용
```

### 6.3 광고 시청 → 포인트 획득 (동기)

```text
유저가 광고 시청 완료

→ 광고 SDK가 서버에 콜백 (callbackId 포함)
→ [Economy - Wallet]
    1. callbackId 기반 멱등성 선점 (insertIfAbsent)
    2. PointWallet에 포인트 추가 (낙관적 락)
    3. 거래 내역 저장
→ 유저에게 "포인트 지급 완료" 응답
```

---

## 7. 향후 분리 로드맵

현재는 5개 Bounded Context + 1개 인프라 서비스로 시작한다. 서비스가 성장하면 아래 순서로 분리를 검토한다.

| 단계 | 분리 대상 | 트리거 |
|------|----------|--------|
| 1 | Economy → Wallet / Inventory 독립 | Wallet과 Inventory 간 트랜잭션 충돌 빈번, 구매를 Saga로 전환 필요 시 |
| 2 | Village → World / Avatar 독립 | 아바타 커스터마이제이션 규칙이 복잡해질 때 |
| 3 | Communication 내부 세분화 | 음성/화면 공유가 채팅과 다른 인프라 요구를 가질 때 |

분리 시 반드시 ADR에 이유를 기록한다.
