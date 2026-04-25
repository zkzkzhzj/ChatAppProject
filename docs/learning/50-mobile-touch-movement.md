# 50. 모바일 터치 이동 — 키보드 전용 마을의 모바일 진입 결함 해소

> 작성 시점: 2026-04-26
> 트랙: `ui-mvp-feedback` (두 번째이자 마지막 노트)
> 맥락: F-1 — MVP 피드백에서 "모바일에서 캐릭터가 안 움직인다" 보고. 키보드(WASD/방향키) 외에 입력 경로가 없어 모바일 유저는 진입 즉시 무력화되는 상태였음
> 관련 파일: `frontend/src/game/scenes/VillageScene.ts`
> 관련 노트: [26 — Phaser vs HTML UI 키보드 포커스 충돌](./26-phaser-html-keyboard-focus-conflict.md) · [32 — 웹 2D 게임 엔진 비교](./32-web-2d-game-engine-comparison.md) · [49 — React 입력 IME 처리](./49-react-input-ime-handling.md)

---

## 0. 한 줄 요약

**모바일에는 키보드가 없으니, 캔버스 탭한 좌표로 캐릭터가 자동 이동하는 "tap-to-move" 패턴을 추가했다.** ZEP/Gather Town 류 2D 공간이 모두 채택한 익숙한 UX고, 본 마을은 충돌 처리가 없어 pathfinding 없이 직선 이동만으로 충분하다.

같은 자리에서 가상 조이스틱 UI 도 후보였지만, **(a) UI 위젯이 화면을 가리고 (b) 정밀 조작이 필요 없는 산책+채팅 톤에 과한 도구**라서 탈락. 데스크탑에서도 동일하게 "마우스 클릭 = 이동"으로 동작해 입력 경로가 일관된다는 점이 보너스로 따라왔다.

---

## 1. 배경 — F-1 이 어떻게 잡혔는가

### 1.1 증상

```text
2026-04-17 MVP 테스트
  - 모바일(아이폰 Safari) 유저 진입
  - 캐릭터 등장은 정상
  - 그 뒤 아무것도 못 함 — 화면 어디를 눌러도 캐릭터가 움직이지 않음
  - 채팅도 못 침 (입력창 포커스만 됨, 캐릭터를 NPC 옆까지 가져가는 행위 자체 불가)
  - 결국 "모바일에선 못 쓰는 서비스" 라는 인상으로 종료
```

### 1.2 원인

`VillageScene.ts` 의 입력 핸들러는 키보드만 있었다.

```ts
// 기존 코드 (요약)
this.cursors = keyboard.createCursorKeys();
this.wasd = { up: ..., down: ..., left: ..., right: ... };

// movePlayer 안에서
if (left.isDown || this.wasd.left.isDown) dx -= 1;
// ...
```

데스크탑에선 WASD/방향키로 잘 동작하고, 마우스 클릭은 NPC 인터랙션(말걸기) 외엔 아무 의미 없었다. 모바일은 키보드 이벤트가 발생할 자판이 없어 `dx`/`dy` 가 영원히 0.

### 1.3 정책 맥락

| 정책 | 본 작업의 함의 |
|---|---|
| **데스크탑 우선** | 모바일 게임 수준의 정밀 조작·반응성·터치 제스처는 out of scope |
| **모바일 앱 미고려 (웹만)** | iOS/Android 네이티브 SDK 통합·가상 키보드 직접 제어 같은 영역 안 건드림 |
| **"안식처에서 산책" 톤** | 모바일에서도 "최소한 캐릭터는 움직이고 채팅까지는 닿는다" 수준이 목표. 모바일 RPG 같은 액션성 X |

이 세 줄이 의사결정 기준의 전부. **모바일을 1급 시민으로 만드는 것이 아니라, "기본권"만 보장한다**.

### 1.4 검증 한계 (반드시 명시)

이 결정과 구현은 **개발자가 모바일 실기기에서 직접 검증하지 못한 상태**에서 작성됐다. 신뢰 근거:

1. **데스크탑 마우스 클릭으로 동일 코드 경로 검증** — Phaser `pointerdown` 은 마우스/터치를 동일 이벤트로 추상화하므로, 데스크탑 클릭이 동작하면 모바일 탭도 동작 (Pointer Events 표준).
2. **선례** — ZEP·Gather Town·모여봐요 동물의 숲(닌텐도) 모두 동일 UX. 사용자 학습 비용이 거의 0.
3. **회귀 표면** — 추가는 `pointerdown` 핸들러 1개 + `movePlayer` 분기 1개. 키보드 입력 흐름은 그대로.

**한계**: 모바일 Safari 의 더블탭 줌·롱프레스 컨텍스트 메뉴 같은 OS 제스처와의 상호작용은 실기기 검증 필요. **트랙 머지 후 원 피드백 제공자 재검증** 약속이 따라붙어야 한다.

---

## 2. 후보 비교 — 두 방안

### 2.1 방안 A — 탭 위치로 캐릭터 이동 (tap-to-move)

화면을 누르면 그 지점이 목표 좌표가 되고, 캐릭터가 목표를 향해 직선으로 걸어간다.

```text
사용자 탭 (worldX=400, worldY=300)
   │
   ▼
moveTarget = {x:400, y:300}
   │
   ▼
매 프레임: 현재 위치 → 목표 방향으로 SPEED * dt 만큼 전진
   │
   ▼
도착하면 moveTarget = null
```

### 2.2 방안 B — 가상 조이스틱

화면 좌하단에 동그란 베이스 + 드래그 가능한 핸들. 핸들 방향이 이동 방향, 거리가 속도.

```text
┌──────────────────────────────┐
│                              │
│    [마을 캔버스]              │
│                              │
│                              │
│  ╭──╮                        │
│  │ ●│                        │  ← 조이스틱
│  ╰──╯                        │
└──────────────────────────────┘
```

### 2.3 비교 표

| | A. tap-to-move | B. 가상 조이스틱 |
|--|---|---|
| **구현 복잡도 (충돌 처리 없는 마을 기준)** | 낮음. 목표 좌표 + 직선 보간 30줄 | 중간. UI 위젯 + 드래그 상태 + 좌표→방향 벡터 변환 + 핸들 복귀 애니메이션 |
| **구현 복잡도 (충돌 처리 추가 시)** | 높음. A* 또는 Navmesh 등 pathfinding 필요 | 낮음 (상대적). 매 프레임 충돌 검사만 하면 됨 |
| **화면 점유** | 0. UI 위젯 없음 | 항상 일정 영역 차지. 풍경/캐릭터를 가림 |
| **시각 노이즈** | 없음 (또는 클릭 위치에 작은 도트 정도 옵션) | 위젯이 시각적으로 게임 영역을 분할 |
| **정밀 조작** | 약함. 클릭 위치까지 직선만, 미세 방향 제어 X | 강함. 아날로그 방향·속도 |
| **데스크탑/모바일 일관성** | 높음. 동일 코드 = 마우스 클릭 = 터치 탭 | 낮음. 데스크탑에선 조이스틱 노출이 어색, 모바일에서만 보이게 분기 필요 |
| **사용자 학습 비용** | 거의 0. ZEP 류로 이미 익숙 | 게임을 안 하는 유저에겐 "이게 뭔가요?" 질문 발생 |
| **서비스 톤 적합성** | "산책·대화" 분위기와 맞음 | 모바일 게임 분위기. "안식처" 와 톤 충돌 |
| **적합한 상황** | 오픈 평면 또는 단순 충돌 / 정밀 조작 불필요 | 액션 게임·플랫포머·정밀 조작 필요 |
| **실제 사용 사례** | ZEP, Gather Town, 모여봐요 동물의 숲, 스타듀밸리 모바일판 일부, RPG Maker MV/MZ 모바일 빌드 | 모바일 액션 RPG 대부분, 콘솔 포팅 모바일 게임, 일부 MMORPG |

### 2.4 선택 — A 안

**이유 4가지:**

1. **장애물·충돌 처리가 현재 마을에 없다.** 캐릭터가 나무·벤치·NPC 를 통과해도 게임적 페널티 없음 → pathfinding 알고리즘 자체가 불필요 → A 의 가장 큰 단점("복잡한 길을 못 찾음") 이 본 프로젝트에선 단점이 아님.
2. **데스크탑/모바일 입력 일관성.** 같은 `pointerdown` 핸들러로 두 환경을 동시에 만족. 분기·조건부 렌더 없음. 데스크탑 사용자에게도 "마우스로 가고 싶은 곳 클릭" 이라는 보너스 UX 가 따라옴 (ZEP-like).
3. **화면 가림 0.** 안식처 톤의 마을은 풍경을 즐기는 시간이 길다. 좌하단 조이스틱 위젯이 풍경을 가리는 비용이 크다.
4. **정밀 조작 불필요.** 본 서비스의 캐릭터가 하는 일은 "마을 돌아다니기 + NPC/유저 옆에 가서 채팅". 픽셀 단위 컨트롤이 의미 있는 시나리오가 없음.

### 2.5 B 를 안 쓴 이유 (그리고 다시 검토할 시점)

B 안은 다음 시점에 다시 봐야 한다:

- **마을에 충돌 처리가 들어왔을 때** — 장애물 사이를 돌아가는 경로 표현이 tap-to-move 의 직선보단 조이스틱이 자연스러움
- **액션 요소가 도입됐을 때** — 미니게임·이벤트 등 정밀 조작이 가치 있는 컨텐츠
- **모바일이 1급 시민으로 격상됐을 때** — 그 시점에는 pwa·virtual keyboard·gesture 등을 함께 다루므로 조이스틱 도입 비용이 상대적으로 작아짐

지금은 그 단계가 아니다.

---

## 3. 충돌 처리가 없다는 결정 — 왜 pathfinding 을 안 만드는가

A 안의 가장 큰 가정은 "직선 이동으로 충분"이다. 이 가정을 받쳐주는 게 **마을에 명시적 충돌 처리가 없다는 사실**.

### 3.1 만약 충돌이 있었다면 — 후보 알고리즘 비교

| 알고리즘 | 한 줄 | 본 프로젝트에 도입 시 |
|---|---|---|
| **A\*** | 격자 기반 최단 경로. 가장 흔한 선택 | 마을을 그리드로 분할 + 노드 가중치 + 휴리스틱 함수. 캔버스 단위 그리드 변환 비용 발생 |
| **Navmesh** | 다각형 메시 위에서 경로. 자유로운 지형에 강함 | recast.js / navmesh.js 등 외부 라이브러리. 메시 생성 도구(Tiled 등)와의 통합 필요 |
| **Theta\*** | A\* 변종. 자연스러운 곡선 경로 | A\* 보다 시각 품질↑, 구현 복잡도↑ |
| **Flow Field** | 다수 유닛이 같은 목표로 갈 때 효율적 | RTS 류에서 사용. 단일 캐릭터엔 과한 도구 |
| **Funnel Algorithm** | Navmesh 위에서 경로 평활화 | Navmesh 와 짝. 단독으론 의미 없음 |

여기에 클라이언트 단 / 서버 단 / 클라이언트-서버 동기화 같은 차원이 한 겹 더 있다. **본 프로젝트는 이 모두를 검토할 단계가 아니다.**

### 3.2 "충돌 없는 마을" 의 정합성

```text
현재 구현: 캐릭터가 나무·벤치를 통과 가능
서비스 의도: 안식처·산책 — 길 찾기 스트레스 없음
멀티플레이 동작: 다른 유저도 통과 가능 (밀어내기 없음)
NPC 충돌: 없음. 다만 NPC 는 hitArea 가 있어 클릭 가능
```

이 설계는 **"마을은 게임이 아니라 공간"** 이라는 톤 결정을 정확히 반영한다. 게임 룰(못 가는 곳·충돌·밀어내기) 이 없으니 직선 이동이 자연스럽고, 직선 이동이 자연스러우니 pathfinding 이 필요 없고, pathfinding 이 없으니 A 안의 단순함이 살아난다. 이 사슬이 끊어지면(충돌이 도입되면) 본 결정도 다시 봐야 한다.

### 3.3 향후 충돌이 들어올 가능성

| 시나리오 | 가능성 | 대응 |
|---|---|---|
| 시각적 장애물 (지나가지 못해야 하는 벽·문) | 중간. 마을 지도가 복잡해지면 자연스럽게 요청됨 | 그리드 기반 A\* + 캔버스 좌표 → 그리드 변환. 단순 직사각형 콜리전부터 시작 |
| NPC 와 부딪히면 자동 대화 시작 | 낮음 (현재는 클릭 기반) | 충돌 콜백만 추가. 경로 알고리즘 영향 없음 |
| 멀티플레이 푸시·밀어내기 | 매우 낮음 (안식처 톤과 충돌) | 도입 시 서버 권위 필요 — 이는 별도 트레이드오프 |

대부분 시나리오에서 첫 단추는 **A\* + 단순 콜리전** 으로 충분. Navmesh 까진 가지 않을 가능성이 높다 [추정].

---

## 4. 키보드 vs 터치 — 입력 우선순위 설계

두 입력 모드를 동시 지원할 때 가장 흔한 함정:

### 4.1 함정 1 — 입력 충돌 (키 누르는 동안 탭 발생)

```text
사용자가 D 키(오른쪽) 누르고 있는 도중에 화면 왼쪽 탭
  ↓ 가드 없으면
moveTarget = 왼쪽 좌표 (탭 결과)
키 입력 처리: dx=+1 → 오른쪽 이동 시도
moveTarget 도 적용: 왼쪽 이동 시도
→ 캐릭터가 떨림 (jitter) 또는 한쪽으로만 이동 + 다른 쪽 입력은 무시됨
```

### 4.2 함정 2 — 도착 직전 키 입력 (잔류 moveTarget)

```text
탭으로 (400, 300) 이동 시작
거의 도착했을 때 사용자가 키보드로 손수 조작 시작
  ↓ 가드 없으면
키 입력 + moveTarget 둘 다 살아있어 이상 동작
```

### 4.3 채택한 룰 — "사용자가 손수 조작하면 즉시 그 모드"

```ts
// movePlayer 의 핵심 분기
if (dx !== 0 || dy !== 0) {
  // 키보드 입력은 터치 이동 목표보다 우선한다 — 사용자가 키 누르면 즉시 손수 조작으로 전환.
  this.moveTarget = null;
  // ... 기존 키보드 이동
} else if (this.moveTarget) {
  // 키보드 무입력일 때만 터치 목표 향해 진행
}
```

핵심은 **`this.moveTarget = null` 한 줄**. 키 입력이 감지된 프레임에 즉시 터치 목표를 폐기. 함정 1·2 가 한꺼번에 사라진다.

이 룰의 일반화:

> **"명시적 입력이 들어오면 자동 이동을 즉시 취소한다."**
>
> RPG·MMO 의 클릭 이동 + 키보드 이동 공존 게임 (WoW, FFXIV, Lost Ark) 모두 동일한 룰. 사용자가 "내가 통제하고 싶다" 는 신호를 키 입력으로 표현하므로, 자동 경로는 그 신호에 양보하는 게 일관된 UX.

### 4.4 반대 방향은 안 되는가 — 터치 우선?

"키 입력 중에도 탭이 들어오면 새 탭으로 갈아치움" 패턴도 가능하다. 그러나:

- 키보드 사용자는 **누르고 있는 동안 계속 이동** 하고 싶다는 의도가 명확
- 탭은 한 순간의 단발 입력 → 키보드 의도를 가리기엔 약한 시그널

따라서 **연속 입력(키보드) > 단발 입력(탭)** 우선순위가 자연스럽다.

---

## 5. Phaser 입력 모델 — 알아두면 디버깅이 쉬워지는 것들

### 5.1 `pointerdown` 은 마우스/터치 통합 이벤트

```text
사용자 입력             Phaser 가 발사하는 이벤트
─────────────────      ──────────────────────────
마우스 좌클릭          pointerdown (pointer.button=0)
터치 (모바일)          pointerdown (pointer.button=0)
펜 터치 (Surface 등)   pointerdown
```

이게 **Pointer Events 표준** (W3C). Phaser 가 이를 추상화해서 `pointerdown` 하나로 노출한다. 즉 본 구현은 **모바일을 위해 추가한 게 아니라, 모바일과 데스크탑에 동시에 동작하는 입력을 추가한 것**. 데스크탑 검증이 모바일 검증의 80% 가 되는 이유.

### 5.2 scene-level vs object-level pointerdown — 둘 다 발사된다

```text
사용자가 NPC 클릭

Phaser 입력 시스템:
  ├─ NPC hitArea (interactive sprite) 의 pointerdown 발사
  │     → onNpcClick() 호출 (대화 시작)
  └─ scene 의 pointerdown 도 발사
        → moveTarget = NPC 위치로 설정
        → 캐릭터가 NPC 쪽으로 걸어감
```

두 핸들러가 모두 발사된다. 본 구현은 **이 동작을 의도적으로 받아들였다**:

- 사용자가 NPC 를 클릭 → 대화창 열림 + 캐릭터가 NPC 쪽으로 자동 이동
- "말 걸려고 클릭했더니 가까이 다가가준다" 는 자연스러운 부수 효과

만약 이 이중 발사가 싫다면:

```ts
// hitArea.on 안에서
hitArea.on('pointerdown', (pointer, _x, _y, event) => {
  this.onNpcClick();
  event.stopPropagation();  // scene-level 까지 전파 차단
});
```

`event.stopPropagation()` 으로 차단 가능. 본 구현은 차단하지 않았다. 향후 "NPC 클릭 시 캐릭터가 가까이 안 가는 게 더 좋다" 는 피드백이 오면 그때 차단.

### 5.3 DOM UI vs Phaser 캔버스 입력은 자연 분리

`docs/learning/26` 에서 정리한 패턴.

```text
┌─────────────────────────────────────┐
│  [Phaser 캔버스]                     │
│  ────────────────                    │
│  • Phaser pointerdown 핸들러 동작     │
│  • 본 F-1 의 moveTarget 설정 대상     │
│                                      │
│  ┌──────────────────────────┐       │
│  │ [DOM 채팅 오버레이]       │       │
│  │  pointer-events-auto      │       │
│  │  ─────────────            │       │
│  │  • DOM 클릭 이벤트         │       │
│  │  • Phaser 까지 도달 X     │       │
│  └──────────────────────────┘       │
└─────────────────────────────────────┘
```

채팅창·NPC 대화창 같은 React DOM UI 는 `pointer-events-auto` 로 캡처되므로, 그 위 클릭은 Phaser 까지 안 내려간다. **별도 가드 없이도** 채팅창 위 탭은 moveTarget 을 건드리지 않는다.

다만 채팅창 *밖* 의 캔버스 영역 탭은 Phaser 로 들어가고, 그때 `setupInput` 의 핸들러가 `document.activeElement.blur()` 로 채팅 입력 포커스를 풀어주면서 동시에 moveTarget 설정. 이 두 효과가 한 핸들러 안에 같이 있다.

### 5.4 `pointer.worldX` vs `pointer.x` — 카메라 보정 차이

```ts
// 본 구현
this.moveTarget = {
  x: Phaser.Math.Clamp(pointer.worldX, ...),
  y: Phaser.Math.Clamp(pointer.worldY, ...),
};
```

| 속성 | 의미 |
|---|---|
| `pointer.x` / `pointer.y` | 화면(스크린) 좌표. 카메라 위치와 무관 |
| `pointer.worldX` / `pointer.worldY` | 월드 좌표. 카메라 줌·이동을 반영해 변환된 값 |

캐릭터는 월드 좌표계에서 움직이므로 **반드시 `worldX/worldY`**. `pointer.x` 를 쓰면 카메라가 이동한 후 탭 위치가 엉뚱한 곳으로 매핑된다. 디버깅 시 자주 헤매는 지점.

---

## 6. 코드 구조 — 핵심만

### 6.1 상태

```ts
private moveTarget: { x: number; y: number } | null = null;
```

`null` 이 "현재 자동 이동 없음" 의 명시 표현. 옵셔널 객체보다 의도가 분명.

### 6.2 입력 핸들러

```ts
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  // 채팅 등 DOM UI 포커스 해제 — Phaser 키 입력 복귀
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  // 월드 경계 안으로 클램프 — 캐릭터가 보이지 않는 좌표로 가지 않도록
  this.moveTarget = {
    x: Phaser.Math.Clamp(pointer.worldX, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
    y: Phaser.Math.Clamp(pointer.worldY, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS),
  };
});
```

`PLAYER_RADIUS` 만큼 가장자리에서 떨어지도록 클램프. 캐릭터가 월드 경계 코너에 박혀 잘려 보이는 것 방지.

### 6.3 이동 로직

```ts
if (dx !== 0 || dy !== 0) {
  // [키보드 우선] 키 입력 감지 → 자동 이동 즉시 취소
  this.moveTarget = null;
  // ... 키보드 정규화 + 위치 업데이트
} else if (this.moveTarget) {
  // [터치 자동 이동] 키보드 무입력일 때만 동작
  const tx = this.moveTarget.x - this.player.x;
  const ty = this.moveTarget.y - this.player.y;
  const dist = Math.hypot(tx, ty);
  if (dist <= step) {
    // 도착 — 한 프레임에 도달 가능한 거리면 정확히 목표로
    this.player.x = this.moveTarget.x;
    this.player.y = this.moveTarget.y;
    this.moveTarget = null;
  } else {
    // 진행 — 정규화 방향 × step
    this.player.x += (tx / dist) * step;
    this.player.y += (ty / dist) * step;
  }
}
```

**핵심 디테일:**

- `dist <= step` 도착 처리 — 이게 없으면 마지막 프레임에 목표를 지나쳐 진동(oscillation) 가능
- `Math.hypot(tx, ty)` — `Math.sqrt(tx*tx + ty*ty)` 의 의미적 동등 표현. 더 명료하고 오버플로 안전
- 정규화 후 `step` 곱셈 — 대각선 이동도 키보드와 동일한 속도

---

## 7. 검증 — 무엇을 어떻게 확인했는가

### 7.1 자동 테스트의 한계

Phaser scene 은 jsdom 에서 테스트가 어렵다.

| 어려움 | 설명 |
|---|---|
| **Canvas API** | jsdom 은 `<canvas>` 의 2D context 를 nullable 로만 제공. Phaser 는 실제 canvas context 를 요구 |
| **WebGL** | jsdom 은 WebGL 미지원. Phaser 는 기본 렌더러가 WebGL (Auto → Canvas fallback) |
| **requestAnimationFrame** | jsdom 에서도 동작하지만 실제 60fps 시뮬레이션 어려움 |
| **Pointer Events** | `fireEvent.pointerDown` 은 가능하지만 Phaser 의 입력 매니저까지 도달하려면 캔버스 hit-test 필요 |

해결책으로 `headless-gl` + `node-canvas` 조합이 있긴 하나, **F-1 한 건의 회귀 방지를 위해 게임 엔진 수준 mock 인프라를 세팅하는 비용은 ROI 가 낮다**. 본 트랙은 인프라를 추가하지 않고 수동 검증 + 표준 패턴 의존으로 받쳤다.

### 7.2 수동 검증 시나리오 (트랙 머지 전 실행)

```text
✅ 데스크탑 시나리오 (개발자 직접 검증)
   1. 캔버스 빈 공간 클릭 → 캐릭터가 그 위치로 이동하는가
   2. 이동 도중 WASD 누름 → 즉시 키보드 조작으로 전환되는가
   3. 채팅창 위 클릭 → 캐릭터 이동 영향 없는가 (DOM 자연 분리 확인)
   4. NPC 클릭 → 대화창 열림 + 캐릭터가 NPC 쪽으로 이동하는가 (의도된 부수 효과)

🟡 모바일 에뮬레이션 시나리오 (Chrome DevTools 디바이스 모드)
   1. iPhone 14 / Pixel 7 에뮬레이션 → 탭으로 이동되는가
   2. 핀치 줌 / 더블탭 줌이 게임 영역에서 발생하는가 (의도와 다른 동작)

🔴 실기기 시나리오 (트랙 머지 후 원 피드백 제공자에게 위임)
   1. iOS Safari 에서 탭 이동
   2. 안드로이드 Chrome 에서 탭 이동
   3. 모바일 가상 키보드 띄운 상태에서 캐릭터 조작 가능한가
```

### 7.3 트랙 머지 후 액션

- 원 피드백 제공자(F-1 보고자)에게 모바일 재검증 요청
- 보고된 환경(브라우저·OS) 명시 받기
- 회귀 보고가 들어오면 별도 추적 (이 노트의 §9 후속 개선 항목으로 흡수)

---

## 8. 실전에서 주의할 점

### 8.1 모바일 더블탭 줌과의 충돌 가능성

iOS Safari 는 더블탭으로 화면 줌 인. 빠르게 두 번 탭하면 두 번째 탭이 줌으로 가로채일 수 있다.

```html
<!-- viewport 메타로 줌 비활성화 가능 -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

다만 이건 **접근성을 해친다** (시각 약자가 줌으로 글자 키우는 것을 막음). 본 트랙은 viewport 를 수정하지 않는다. 더블탭 충돌이 실측되면 그때 트레이드오프 재검토.

### 8.2 롱프레스 컨텍스트 메뉴

iOS 에서 길게 누르면 "이미지 저장" 같은 컨텍스트 메뉴가 뜬다. 캔버스에선 보통 안 뜨지만, 일부 환경에서 발생 가능.

```ts
// canvas 또는 canvas 부모에서
element.style.webkitTouchCallout = 'none';
element.style.userSelect = 'none';
```

본 트랙은 추가하지 않음. 회귀 보고 시 검토.

### 8.3 멀티터치 — 의도된 미지원

손가락 두 개로 동시에 두 곳을 누르면? 본 구현은 **마지막 `pointerdown` 만 반영** (moveTarget 갱신). 손가락 하나만 인식되는 듯한 동작. RPG 라면 한쪽은 이동·한쪽은 액션 같은 2-point 인터랙션이 필요하지만, 본 서비스에선 불필요.

### 8.4 빠른 연타 → 캐릭터 떨림 가능성

```text
사용자가 같은 자리를 빠르게 5번 탭
  ↓
moveTarget 5번 갱신 (마지막 값으로 수렴)
  ↓
캐릭터는 부드럽게 마지막 좌표로 이동
```

문제 없음. 다만 **다른 위치를 빠르게 연타** 하면 목표가 매번 바뀌어 캐릭터가 갈팡질팡한다. UX 문제는 아니지만 인지하고 있을 것.

### 8.5 다른 유저(다른 클라이언트)에게 보내는 위치 갱신

본 구현은 클라이언트 단 자동 이동. 매 프레임 위치가 바뀌고, 기존 `sendPosition` 의 throttle (`POSITION_SEND_INTERVAL = 100ms`) 이 그대로 적용된다. **추가 작업 없이 멀티플레이 동기화에 자연스럽게 흡수**.

---

## 9. 나중에 돌아보면

### 9.1 이 결정이 틀렸다고 느낄 시점

| 시점 | 신호 | 대응 |
|---|---|---|
| 충돌 처리 도입 | "캐릭터가 벽을 통과한다" 피드백 | A\* pathfinding + 직선 이동을 경로 위 직선 다구간으로 확장 |
| 정밀 조작 컨텐츠 추가 | 미니게임·이벤트 | 가상 조이스틱 추가 (본 tap-to-move 와 병존) |
| 모바일 1급 시민 격상 | 모바일 유저 비중 30%+ | PWA · 가상 키보드 직접 제어 · 제스처 등 종합 재설계 |
| 매우 큰 마을 | 한 번 클릭으로 닿기 어려운 거리 | "Run/Walk" 토글 + double-tap-to-run 같은 보조 입력 |

### 9.2 스케일에 따른 추천

| 스케일 | 추천 |
|---|---|
| 현재 (충돌 X, 단일 마을, 평면) | A 안 (현재 구현). 추가 인프라 불필요 |
| 충돌 + 단일 마을 | A 안 + 그리드 A\*. 라이브러리 안 쓰고 자체 구현 가능 수준 |
| 다수 맵 + 복잡한 지형 | Navmesh + 외부 라이브러리 (recast.js) |
| 액션 요소 추가 | A 안 + 가상 조이스틱 모드 토글. 두 모드 공존 |

### 9.3 다음번에 새 입력 모드를 추가한다면

1. **입력 우선순위를 명시 문서화** — 본 트랙처럼 "키보드 > 터치" 같은 룰을 코드 주석/문서에 한 줄로 박기
2. **수동 검증 시나리오를 PR 본문에 체크리스트로** — 자동 테스트가 어려운 영역은 검증 행위 자체를 산출물로 남김
3. **DOM UI 와 게임 캔버스의 입력 분리 패턴** ([learning/26](./26-phaser-html-keyboard-focus-conflict.md)) 을 매번 다시 확인. 새 입력 추가는 이 분리 위에서만 안전

---

## 10. 더 공부할 거리

### 10.1 직접 관련 (이 프로젝트)

- [learning/26 — Phaser vs HTML UI 키보드 포커스 충돌](./26-phaser-html-keyboard-focus-conflict.md) — 게임 엔진 + DOM UI 입력 경계
- [learning/32 — 웹 2D 게임 엔진 비교](./32-web-2d-game-engine-comparison.md) — Phaser 가 본 프로젝트에 선택된 이유
- [learning/21 — 마을 공개 채팅 아키텍처](./21-village-public-chat-architecture.md) — ZEP/Gather Town UX 패턴 참고

### 10.2 표준·공식 문서

- [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) — 마우스·터치·펜 통합 표준
- [Phaser 3 Input Plugin docs](https://docs.phaser.io/api-documentation/class/input-inputplugin) — `pointerdown` / `pointer.worldX` / interactive sprite
- [Phaser 3 Cameras docs](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) — 월드 좌표 ↔ 화면 좌표 변환

### 10.3 tap-to-move UX 패턴 사례

- [Gather Town UX 분석 글들](https://www.gather.town/) — 동일 패턴의 대표 서비스
- [ZEP 입력 시스템](https://zep.us/) — 한국 시장의 동일 카테고리 서비스
- 모여봐요 동물의 숲 (닌텐도) — A 버튼 / 터치(스마트폰 컴패니언 앱) 양방향. 콘솔이지만 UX 참고
- [Stardew Valley 모바일판 — tap-to-move](https://www.stardewvalley.net/) — 충돌 있는 환경에서의 tap-to-move 구현 사례

### 10.4 pathfinding 알고리즘 (도입 시 학습)

- [Red Blob Games — Introduction to A\*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — A\* 입문의 정석
- [A\* 시각화](https://qiao.github.io/PathFinding.js/visual/) — 알고리즘별 비교 시각화
- [Recast & Detour (Navmesh)](https://github.com/recastnavigation/recastnavigation) — 산업 표준 navmesh. JS 포팅판 존재
- [navmesh.js](https://github.com/mikewesthad/navmesh) — Phaser 와 잘 맞는 경량 navmesh 라이브러리
- [Game AI Pro 시리즈](https://www.gameaipro.com/) — pathfinding 챕터 무료 PDF

### 10.5 모바일 웹 게임 입력 모범 사례

- [MDN — Touch events on the web](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) — 터치 이벤트 표준 (Pointer Events 와 함께 보면 좋음)
- [Google web.dev — Mobile-first web games](https://web.dev/articles/) — viewport · 360-touch · 가상 키보드
- [Phaser 3 examples — pointer & touch](https://phaser.io/examples) — 공식 예제 모음. tap-to-move 변형들 포함

### 10.6 게임 입력 우선순위 설계의 일반론

- WoW / FFXIV / Lost Ark 의 클릭 이동 + WASD 공존 시스템 분석 글 (커뮤니티 게시판 다수)
- "Input Buffering" 검색 — 입력 버퍼링 / 우선순위 / 캔슬 시스템 (액션 게임에선 더 정교한 모델 사용)

---

## 부록 A. 디버깅 시 쓸 만한 스니펫

브라우저 콘솔에서 Phaser 입력을 직접 관찰하고 싶을 때 (개발 모드 캔버스에 연결된 Phaser 인스턴스가 `window.game` 으로 노출돼 있다고 가정):

```js
// scene 의 pointerdown 을 가로채 콘솔에 좌표·환경 출력
const scene = window.game.scene.getScene('VillageScene');
scene.input.on('pointerdown', (pointer) => {
  console.log({
    screen: { x: pointer.x, y: pointer.y },
    world: { x: pointer.worldX, y: pointer.worldY },
    pointerType: pointer.pointerType,  // 'mouse' | 'touch' | 'pen'
    button: pointer.button,
    isDown: pointer.isDown,
    activeElement: document.activeElement?.tagName,
  });
});
```

`pointerType` 으로 마우스/터치 구분 가능. 모바일 디버깅 시 캡처해 보내달라고 요청하면 사후 분석에 유용.

---

## 부록 B. F-1 수정의 전체 diff (참고용)

```diff
+  private moveTarget: { x: number; y: number } | null = null;

   private setupInput() {
     // ... 키보드 셋업 ...

+    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
+      if (document.activeElement instanceof HTMLElement) {
+        document.activeElement.blur();
+      }
+      // 모바일 터치 이동(F-1) — 캔버스 탭/클릭한 월드 좌표를 이동 목표로 설정.
+      this.moveTarget = {
+        x: Phaser.Math.Clamp(pointer.worldX, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
+        y: Phaser.Math.Clamp(pointer.worldY, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS),
+      };
+    });
   }

   private movePlayer(delta: number) {
     // ... 키 상태 수집 ...

     if (dx !== 0 || dy !== 0) {
+      // 키보드 입력은 터치 이동 목표보다 우선한다.
+      this.moveTarget = null;
       // ... 기존 키보드 이동 ...
+    } else if (this.moveTarget) {
+      // F-1 모바일 터치 이동 — 정규화 속도로 직선 진행
+      const tx = this.moveTarget.x - this.player.x;
+      const ty = this.moveTarget.y - this.player.y;
+      const dist = Math.hypot(tx, ty);
+      if (dist <= step) {
+        this.player.x = this.moveTarget.x;
+        this.player.y = this.moveTarget.y;
+        this.moveTarget = null;
+      } else {
+        this.player.x += (tx / dist) * step;
+        this.player.y += (ty / dist) * step;
+      }
     }

     // ... 월드 경계 클램프 / depth ...
   }
```

코드 추가량 **약 25 줄**. 영향 범위 **0** (기존 키보드 입력은 동작 변화 없음, DOM UI 영역 클릭은 자연 분리). 회귀 표면 **scene 단일 파일**. 검증 한계 **모바일 실기기 부재로 사용자 재검증 필수**.

---

> 이 노트는 `ui-mvp-feedback` 트랙의 마지막 학습 기록이다. F-3 (49번) 와 F-1 (50번) 으로 트랙의 트레이드오프 결정을 모두 정리. 후속 트랙(s3-media 등) 은 51번부터.
