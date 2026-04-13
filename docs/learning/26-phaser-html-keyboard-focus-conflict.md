# 26. Phaser.js와 HTML UI의 키보드 포커스 충돌 — 게임 엔진 위에 웹 UI를 올리면 반드시 만나는 문제

> 작성 시점: 2026-04-13
> 맥락: Next.js + Phaser.js 구조에서 Phaser 캔버스 위에 HTML UI(채팅 입력, 로그인 폼)를 오버레이로 올렸더니 WASD 키가 HTML input과 게임 캐릭터 이동 사이에서 충돌하는 문제를 해결하면서 정리했다.

---

## 배경

이 프로젝트는 Phaser.js 캔버스 위에 React 컴포넌트를 HTML 오버레이로 올리는 구조다. 채팅 입력창, 로그인 폼 같은 HTML UI가 캔버스 위에 `position: absolute`로 떠 있다.

문제는 **키보드 이벤트의 소유권**이다. Phaser는 WASD를 캐릭터 이동에 쓰고, HTML input은 WASD를 텍스트 입력에 쓴다. 둘 다 같은 `keydown` 이벤트를 소비하려고 한다.

Phaser의 `addCapture()`로 WASD를 캡처하면 HTML input에 'w', 'a', 's', 'd'가 입력되지 않는다. 반대로 캡처를 풀면 input에 타이핑할 때 캐릭터가 같이 움직인다.

이건 Phaser에만 국한된 문제가 아니다. **게임 엔진 위에 웹 UI를 올리는 모든 하이브리드 구조**에서 만나는 보편적인 포커스 관리 문제다.

---

## 선택지 비교

|  | A. Zustand store 기반 (isInputFocused) | B. document.activeElement 기반 | C. Phaser input.keyboard.enabled 토글 |
|--|---------|---------|---------|
| 핵심 개념 | React 컴포넌트에서 `onFocus`/`onBlur` 시 store의 `isInputFocused` 플래그를 토글. Phaser의 `update()`에서 이 플래그를 읽어 이동 여부 결정 | 매 프레임 `document.activeElement`가 HTMLInputElement인지 체크. input에 포커스가 있으면 키 캡처 해제, 없으면 캡처 복원 | Phaser의 키보드 플러그인 자체를 통째로 켜고 끄기. `this.input.keyboard.enabled = false` |
| 장점 | React의 상태 관리 패턴과 일치. 디버깅 시 DevTools에서 상태를 바로 확인 가능 | **모든 HTML input에 자동 적용.** 새 input을 추가해도 코드 수정 불필요. 브라우저 API만 사용하므로 프레임워크 독립적 | 가장 단순. 한 줄로 전체 키보드 입력을 차단/허용 |
| 단점 | **모든 HTML input 컴포넌트마다 `setInputFocused(true/false)`를 연동해야 함.** 하나라도 빠뜨리면 버그. 로그인 폼, 설정 창 등 새 UI가 추가될 때마다 누락 위험 | Phaser Scene에서 DOM에 직접 접근하는 결합이 생김. 게임 로직이 브라우저 DOM을 알아야 한다 | **선택적 제어 불가.** WASD만 풀고 싶어도 모든 키가 비활성화됨. ESC로 메뉴 열기 같은 글로벌 단축키도 먹통이 됨 |
| 적합한 상황 | HTML input이 1~2개로 고정된 경우. 포커스 상태에 따라 다른 UI 변화도 필요한 경우 | HTML input 종류가 다양하고 계속 늘어나는 경우. "게임 위에 웹 UI 오버레이" 구조 전반 | 키보드를 아예 안 쓰는 UI 모드가 명확히 분리된 경우 (예: 전체 화면 설정 창) |
| 실제 사용 사례 | 단순한 채팅 전용 게임에서 채팅창 하나만 관리 | ZEP, Gather.town 같은 2D 메타버스 (HTML 오버레이 다수) | 게임 내 풀스크린 메뉴/인벤토리 화면 |

---

## 이 프로젝트에서 고른 것

**선택: B. document.activeElement 기반**

이유:
1. **확장성.** 채팅 입력창 외에도 로그인 폼, 설정 창, 닉네임 입력 등 HTML input이 계속 추가될 예정이다. 새 input마다 store 연동을 하는 건 실수가 예정된 구조다.
2. **비용이 거의 없다.** `document.activeElement`는 DOM 쿼리가 아니라 브라우저가 이미 관리하고 있는 프로퍼티 접근이다. 매 프레임 읽어도 성능 영향이 없다.
3. **초기에 A를 시도했다가 B로 전환했다.** 실제로 zustand의 `isInputFocused` 방식을 먼저 구현했는데, 채팅 입력 외의 다른 HTML input(로그인 폼)에서 캐릭터가 움직이는 버그가 나왔다. 그때 "모든 input에 대응하려면 DOM 수준에서 판단해야 한다"는 결론에 도달했다.

---

## 핵심 개념 정리

### Phaser의 키보드 캡처 메커니즘

Phaser의 `KeyboardPlugin`은 브라우저의 `keydown`/`keyup` 이벤트를 가로채서 게임 로직에 전달한다. `addCapture()`를 호출하면 해당 키코드에 대해 `preventDefault()`를 걸어서 **브라우저 기본 동작을 막는다.**

```
브라우저 keydown 이벤트
    │
    ├── addCapture된 키? ──Yes──→ preventDefault() 호출 → HTML input에 문자 전달 안 됨
    │                              └→ Phaser의 Key 객체에 isDown = true
    │
    └── 아니면 ──→ 정상적으로 HTML에 전달
```

중요한 점: **캡처는 글로벌이다.** Scene A에서 캡처하면 Scene B에서도 캡처가 적용된다. 이건 Phaser 공식 문서에도 명시되어 있다.

### 해결 패턴: 포커스 기반 캡처 토글

매 프레임(`update()`)에서 현재 포커스가 어디에 있는지 확인하고, 그에 따라 캡처를 동적으로 전환한다.

```
update() 매 프레임 호출
    │
    ├── document.activeElement가 HTMLInputElement 또는 HTMLTextAreaElement?
    │     │
    │     ├── Yes → releaseKeys()  (WASD 캡처 해제, HTML input에서 정상 타이핑)
    │     │         └→ return (이동 로직 스킵)
    │     │
    │     └── No  → captureKeys()  (WASD 캡처 복원, 캐릭터 이동)
    │               └→ 이동 로직 실행
```

### 캔버스 클릭 시 blur 처리가 필수인 이유

위 로직만으로는 부족하다. HTML input에 포커스가 있는 상태에서 **Phaser 캔버스를 클릭해도 input의 포커스가 자동으로 해제되지 않는다.** 캔버스는 `<canvas>` 엘리먼트이고, `<canvas>`를 클릭해도 브라우저가 자동으로 다른 요소의 focus를 blur하지 않기 때문이다.

그래서 Phaser의 `pointerdown` 이벤트에서 명시적으로 `document.activeElement.blur()`를 호출해야 한다.

```typescript
// VillageScene.ts - setupInput()
this.input.on('pointerdown', () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
```

이게 없으면: 채팅 입력창에 커서를 놓고 → 맵을 클릭해도 → input에 포커스가 유지되어 → WASD가 계속 텍스트로 입력됨.

### addCapture vs removeCapture 동작

```typescript
// 캡처: 이 키들의 브라우저 기본 동작을 막는다
keyboard.addCapture([KeyCodes.W, KeyCodes.A, KeyCodes.S, KeyCodes.D]);

// 해제: 이 키들의 브라우저 기본 동작을 다시 허용한다
keyboard.removeCapture([KeyCodes.W, KeyCodes.A, KeyCodes.S, KeyCodes.D]);
```

내부적으로 `KeyboardPlugin`은 캡처된 키코드를 Set으로 관리한다. `addCapture`는 Set에 추가, `removeCapture`는 Set에서 제거. `keydown` 이벤트 핸들러에서 이 Set을 체크해서 `preventDefault()` 호출 여부를 결정한다.

---

## 실전에서 주의할 점

- **`addCapture`/`removeCapture`를 매 프레임 호출하는 건 괜찮은가?** 괜찮다. 내부적으로 Set에 add/delete하는 것이라 비용이 거의 없다. 이미 캡처된 상태에서 다시 `addCapture`해도 중복 방지가 되어 있다.
- **select, contenteditable 같은 다른 입력 요소도 고려해야 한다.** 현재 코드는 `HTMLInputElement`과 `HTMLTextAreaElement`만 체크한다. 만약 `contenteditable` div나 `<select>` 같은 요소를 쓸 일이 생기면 체크 조건을 확장해야 한다. 포괄적으로 하려면 `el?.tagName`으로 체크하거나 `el !== document.body && el !== canvas` 같은 역방향 체크가 더 안전할 수 있다.
- **Phaser Scene에서 `document`에 직접 접근하는 결합.** 이건 의식적으로 수용한 트레이드오프다. Phaser가 브라우저 위에서 돌아가는 이상, DOM과의 상호작용을 완전히 차단하는 건 비현실적이다. 다만 DOM 접근을 `movePlayer()`와 `setupInput()` 두 군데에 집중시켜서 나중에 리팩토링할 때 찾기 쉽게 했다.
- **모바일에서는 이 문제가 없다.** 모바일에서는 가상 키보드가 올라올 때 input이 포커스를 가지므로, 물리 키보드 충돌 자체가 발생하지 않는다. 이 프로젝트는 데스크탑 우선이라 이 문제를 풀어야 했다.

---

## 나중에 돌아보면

- **이 결정이 틀렸다고 느끼는 시점:** HTML input 종류가 10개 이상으로 늘어나고, 특정 input에서는 일부 키(예: ESC)만 게임에 전달하고 싶은 세밀한 요구가 생길 때. 그때는 `document.activeElement` 체크만으로는 부족하고, "어떤 input에 포커스가 있을 때 어떤 키를 게임에 넘길 것인가"를 정의하는 포커스 매니저 클래스가 필요해진다.
- **Phaser를 버리고 다른 엔진으로 바꾸면:** 이 패턴의 본질(DOM 포커스 체크 → 게임 입력 토글)은 엔진과 무관하다. PixiJS, BabylonJS 등 브라우저 기반 게임 엔진이라면 동일한 문제가 동일한 방식으로 해결된다.
- **Phaser 4(또는 미래 버전)에서 공식 지원이 생기면:** Phaser 커뮤니티에서 이 문제는 반복적으로 보고되고 있다. 향후 버전에서 `keyboard.respectDOMFocus` 같은 옵션이 추가될 수 있다. 그때는 커스텀 로직을 걷어내고 엔진 기능으로 대체한다.

---

## 더 공부할 거리

### Phaser 키보드 시스템
- [Phaser 3 KeyboardPlugin 공식 문서](https://photonstorm.github.io/phaser3-docs/Phaser.Input.Keyboard.KeyboardPlugin.html) -- addCapture, removeCapture, clearCaptures의 정확한 시그니처와 동작
- [Phaser KeyboardManager 문서](https://docs.phaser.io/api-documentation/class/input-keyboard-keyboardmanager) -- KeyboardPlugin과 KeyboardManager의 차이. Manager는 전역, Plugin은 Scene 단위
- [addCapture 상세 문서](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Input.Keyboard.KeyboardPlugin-addCapture) -- 캡처가 글로벌로 동작하는 이유 설명
- [Phaser 포럼: Temporarily disable key captures](https://phaser.discourse.group/t/temporarry-disable-key-captures-in-game/4524) -- 같은 문제로 고민한 사람들의 토론. `disableGlobalCapture()`가 왜 기대대로 동작하지 않는지

### 게임 엔진 + 웹 UI 통합
- [Phaser GitHub Issue #4447: Mouse input goes through overlay HTML](https://github.com/photonstorm/phaser/issues/4447) -- 마우스 이벤트의 동일한 문제. 키보드만이 아니라 마우스 클릭도 캔버스와 HTML 오버레이 간 충돌 가능
- [Phaser Input 공식 가이드](https://docs.phaser.io/phaser/concepts/input) -- Phaser의 입력 시스템 전반. 마우스, 키보드, 터치의 이벤트 흐름

### 관련 학습노트
- [21-village-public-chat-architecture.md](./21-village-public-chat-architecture.md) -- 마을 공개 채팅의 전체 아키텍처. 채팅 입력 UI가 이 키보드 충돌 문제의 직접 원인이었다
- [15-websocket-stomp-deep-dive.md](./15-websocket-stomp-deep-dive.md) -- STOMP 메시지 전송 구조. 채팅 메시지를 보내려면 input에 타이핑이 되어야 하니까

### 더 깊이 파려면
- **브라우저의 포커스 모델 자체를 이해하기:** [MDN - Focus management](https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement)와 [focusin/focusout 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusin_event). `document.activeElement`가 정확히 어떤 시점에 바뀌는지, `<canvas>`가 포커스를 받을 수 있는지(`tabindex` 속성)를 알면 엣지케이스를 예측할 수 있다
- **Unity WebGL의 동일 문제:** Unity도 WebGL 빌드에서 HTML 오버레이와 키보드 충돌이 발생한다. Unity는 `WebGLInput.captureAllKeyboardInput`이라는 플래그로 제어한다. 다른 엔진들이 같은 문제를 어떻게 해결했는지 보면 패턴이 보인다
