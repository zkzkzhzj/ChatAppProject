# 3D 게임·메타버스 채팅 UI 패턴 리서치

> 작성일: 2026-05-13
> 대상 트랙: `village-3d` Step 1.7 — 채팅 입력 UI 재설계
> 컨텍스트: Three.js 3D 마을 안식처. 머리 위 인라인 `<input>` + `[전송]` button 결로 사용자 평가 부정.

---

## 1. 3D 게임·메타버스 채팅 입력 UI 사례

### 1.1 Animal Crossing: New Horizons (모여봐요 동물의 숲)

- **위치**: 화면 하단 모달 키보드 (콘솔 한정). PC 키보드 시는 직접 타이핑.
- **트리거**: 채팅 아이콘 → 가상 키보드 → Enter 전송.
- **표시**: 머리 위 hand-drawn 결 wobbly 말풍선. 한 글자씩 페이드 인. 캐릭터별 색상으로 화자 구분.
- **디자인 특징**: bean 모양 name tag, 둥근 corner, soft shadow, animalese 사운드. 안식처 톤의 정수.
- **시사점**: "전송 버튼" 자체가 없고 키보드 Enter만 사용. 말풍선 자체가 UX의 주인공.

### 1.2 Stardew Valley Multiplayer

- **위치**: 좌측 하단 1줄 input. T 또는 / 키로 열림.
- **트리거**: Enter 전송. 별도 버튼 없음.
- **표시**: 모드(`Multiplayer Speech Bubbles`)로 머리 위 말풍선 가능. 바닐라는 좌하단 채팅 로그만.
- **시사점**: 미니멀. 입력창과 전송 버튼이 시각적으로 분리되지 않음. Enter only.

### 1.3 Genshin Impact (원신)

- **위치**: 좌측 하단 채팅 바. PC는 Enter로 활성화, 모바일은 채팅 버블 아이콘 탭.
- **트리거**: Enter / 모바일 탭 send 아이콘.
- **표시**: 별도 채팅 로그 패널. 머리 위 말풍선 없음 (입체감보다 정보 패널 결).
- **시사점**: MMORPG 결로 채팅이 게임플레이와 분리됨. 안식처 컨셉에 부적합.

### 1.4 Final Fantasy XIV

- **위치**: 자유 위치 이동·분할 가능한 채팅 로그 윈도우 (좌하단 기본).
- **트리거**: Enter로 입력 모드 진입 → Enter 전송.
- **표시**: 설정에서 "Enable chat bubbles" 토글 시 머리 위 말풍선 추가.
- **시사점**: 채팅 로그 + 말풍선 병행. 우리 프로젝트의 "우측 드로어 + 머리 위 인라인" 결정과 정합.

### 1.5 VRChat

- **위치**: 머리 위 chatbox (Above) 또는 정면 부유 (Forward) — 사용자 선택.
- **트리거**: Y키로 chatbox 열림 → Enter 전송. 144자 제한, 가장 최근 메시지만 표시.
- **표시**: 머리 위 텍스트 (말풍선 X, plain text 결). typing indicator 점 애니메이션.
- **2026.2.1 업데이트**: leaky bucket rate limiter, typing indicator 안정화.
- **시사점**: "한 줄, 짧게, 즉시 사라짐" 결. 우리 6초 자동 사라짐 정책과 동일 철학.

### 1.6 Mozilla Hubs

- **위치**: 화면 하단 input bar.
- **트리거**: Enter 전송.
- **표시**: 화면 하단 채팅 로그 + 일정 시간 머리 위 말풍선.
- **시사점**: WebRTC + WebGL 결 우리와 가장 유사한 스택. 미니멀 input bar 패턴.

### 1.7 Fortnite Party Royale

- **위치**: 채팅보다 emote wheel (B키 / D-Pad 아래 / 모바일 아이콘) 중심.
- **트리거**: emote 휠로 6 slot quick chat. 텍스트 채팅은 별도 보이스/텍스트 채팅 시스템.
- **시사점**: 안식 모드에서 텍스트보다 비언어 표현 강조. 우리 마을 컨셉에 emote/감정표현 추가 검토 가치.

### 1.8 Among Us

- **위치**: 우측 상단 채팅 아이콘 토글 → 모달 텍스트 area.
- **트리거**: 파란 종이비행기 send 아이콘 버튼 / Enter.
- **표시**: 머리 위 표시 없음. 모달 내부 채팅 로그.
- **시사점**: "Free Chat"과 "Quick Chat" (템플릿) 이중화 — 어린 유저 보호 결. 우리도 ToS·연령대 고려 시 참고.

### 1.9 Roblox Bubble Chat

- **위치**: 머리 위 둥근 corner 말풍선. 2020 리뉴얼 시 애니메이션·커스텀 색상·폰트 결.
- **트리거**: `/` 키 → 하단 input → Enter.
- **시사점**: 머리 위 말풍선은 별도, 입력은 하단. 우리는 입력을 머리 위로 끌어올린 결.

---

## 2. 패턴 요약 표

| 게임 | 입력 위치 | 전송 트리거 | 버튼 존재 | 머리 위 표시 | 모바일 대응 |
|---|---|---|---|---|---|
| Animal Crossing | 가상 키보드 모달 | Enter | X | wobbly 말풍선 | 콘솔/모바일 가상 키보드 |
| Stardew Valley | 좌하단 1줄 | Enter | X | 모드 한정 | N/A (PC 위주) |
| Genshin | 좌하단 채팅바 | Enter / 탭 | 모바일만 send 아이콘 | X | 채팅 버블 아이콘 탭 |
| FFXIV | 자유 위치 윈도우 | Enter | X | 옵션 |  - |
| VRChat | 머리 위 chatbox | Enter | X | plain text | OSC/가상 키보드 |
| Mozilla Hubs | 하단 input bar | Enter | 있음 (작은 send) | 일정 시간 표시 | 가상 키보드 |
| Fortnite Party | emote wheel 중심 | wheel 클릭 | wheel UI | emote 애니 | 화면 모서리 아이콘 |
| Among Us | 우상단 모달 | 종이비행기 / Enter | 종이비행기 아이콘 | X | 아이콘 탭 |
| Roblox | 하단 input | Enter | X | 둥근 말풍선 | 가상 키보드 |

### 핵심 관찰

1. **"전송 버튼이 없는" 게임이 다수.** Animal Crossing, Stardew, VRChat, Roblox 모두 Enter only.
2. **버튼이 있을 때는 종이비행기 아이콘**이 표준 (Among Us, 일부 Hubs UI).
3. **머리 위 표시 + 하단 입력 분리**가 다수파. 우리처럼 **머리 위 인라인 입력**은 희소 (= 차별점).
4. **모바일**: 가상 키보드를 위해 입력창은 화면 하단에 두는 편. 머리 위 인라인은 모바일에서 가상 키보드와 충돌.

---

## 3. 본 프로젝트 입력 UI 개선 추천안

### 추천안 A — 버튼 제거, Enter only (미니멀)

```
        ┌─────────────────────────┐
        │ 안녕하세요_              │  ← 캐릭터 머리 위
        └─────────────────────────┘
                 ▼
              [캐릭터]
```

- **변경**: `[전송]` button 제거. Enter 전송, Escape 닫기. placeholder "Enter로 전송".
- **장점**: 가장 깨끗. Animal Crossing / Stardew / VRChat / Roblox 표준. 한국어 IME는 `isComposing` 가드로 안전.
- **단점**: 신규 유저가 "어떻게 보내지" 헷갈릴 수 있음 (placeholder로 해소). 모바일에서 가상 키보드 send 버튼 의존.
- **본 프로젝트 핏**: **높음.** "안식처" 톤에 가장 정합. 시각적 노이즈 최소.

### 추천안 B — 종이비행기 아이콘만 (input 내부 인라인)

```
        ┌─────────────────────────┐
        │ 안녕하세요_         [→] │  ← input 우측 끝, 종이비행기
        └─────────────────────────┘
                 ▼
              [캐릭터]
```

- **변경**: `[전송]` text button을 input 내부 우측 종이비행기 아이콘 button으로 교체. 텍스트 없을 땐 비활성(흐림).
- **장점**: Among Us / Mozilla Hubs 결 표준. 모바일 친화 (탭 영역 확보). 한 박스 안에 결합되어 "옆에 못생긴 버튼" 해소.
- **단점**: 아이콘 사이즈/색상이 톤과 안 맞으면 어색. 아이콘 디자인 품질 의존.
- **본 프로젝트 핏**: **높음.** 모바일까지 고려한다면 최선. 단 아이콘 색상은 warm tone (`#C9A87B` 정도) 결로.

### 추천안 C — Animal Crossing 결 wobbly 말풍선 input

```
       ╭─────────────────────────╮
      ╱  안녕하세요_              ╲   ← 둥근 wobbly 말풍선이 입력창
      ╲                          ╱
       ╰────────▼───────────────╯
              [캐릭터]
```

- **변경**: input을 사각형이 아닌 **말풍선 모양 SVG/CSS clip-path**로 래핑. 꼬리(▼)가 캐릭터를 가리킴. 버튼 없음 (Enter only).
- **장점**: 입력창과 말풍선이 시각적으로 일관 — "입력 = 말하기" 메타포 완성. 안식처 톤 끝판왕.
- **단점**: 구현 복잡도 ↑ (말풍선 + input 정렬, wobble 애니메이션). CanvasTexture 3D Sprite 결과 별도 HTML overlay 정렬 정밀도 필요.
- **본 프로젝트 핏**: **중간~높음.** 차별점 강력하지만 Step 1.7 범위 초과 가능. **Step 1.8 또는 별도 트랙 후보.**

### 추천안 D — 하단 도크 입력 + 머리 위 말풍선 분리 (Roblox/Hubs 결)

```
              [캐릭터]
                 ▲
        ┌─────────────────────────┐
        │ 안녕하세요              │  ← 머리 위 = 표시 only 말풍선
        └─────────────────────────┘

  ─────────────────────────────────
  ┌────────────────────────┐ ┌──┐
  │ 메시지 입력...          │ │→ │  ← 화면 하단 도크
  └────────────────────────┘ └──┘
```

- **변경**: 입력창을 머리 위에서 화면 하단으로 이동. 머리 위는 전송된 메시지만 말풍선으로 표시.
- **장점**: 모바일 가상 키보드와 충돌 없음. 입력 중에도 캐릭터/공간 가시성 유지. Roblox/Hubs 산업 표준.
- **단점**: **사용자가 이미 머리 위 인라인 결정 박았음.** 이 추천은 결정과 충돌.
- **본 프로젝트 핏**: **낮음 (현 결정 위반).** 다만 모바일 대응 시 fallback으로 검토 가치는 있음.

### 추천안 E — 추천안 A + 미세 typing indicator (VRChat 결)

```
        ┌─────────────────────────┐
        │ 안녕하세요_          • • • │  ← typing 중 점 애니메이션
        └─────────────────────────┘
                 ▼
              [캐릭터]
```

- **변경**: A안 + 다른 유저에게 "내가 타이핑 중" 신호 (3D Sprite로 `...` 표시). 전송 시 사라짐.
- **장점**: 멀티유저 안식처에서 "누가 말하려 한다"는 사회적 신호 — alone together 컨셉 강화.
- **단점**: 백엔드/WebSocket으로 typing event 전파 필요. Step 1.7 범위 초과.
- **본 프로젝트 핏**: **중간.** 좋은 아이디어지만 후속 Step 추천. 우선 A안 + 추후 typing indicator 확장.

### 추천안 비교 매트릭스

| 안 | 시각 정합 | 모바일 | 구현 난이도 | 차별점 | 머리 위 인라인 유지 | 핏 |
|---|---|---|---|---|---|---|
| A. Enter only | ★★★★★ | ★★★ | ★ | ★★ | O | **높음** |
| B. 종이비행기 인라인 | ★★★★ | ★★★★★ | ★★ | ★★★ | O | **높음** |
| C. Wobbly 말풍선 input | ★★★★★ | ★★★ | ★★★★ | ★★★★★ | O | 중간 |
| D. 하단 도크 | ★★★ | ★★★★★ | ★★ | ★ | **X** | 낮음 |
| E. A + typing | ★★★★★ | ★★★ | ★★★ | ★★★★ | O | 중간 |

### 최종 추천 결로 (사용자 결정용)

- **단기 (Step 1.7)**: **B안 (종이비행기 인라인)** 또는 **A안 (Enter only)**.
  - B를 추천. 데스크탑 우선 정책이지만 input 내부 아이콘 결 시각 완성도 ↑. "버튼이 못생긴 결" 문제도 박스 외부 분리 결을 해소.
  - 만약 정말 미니멀을 원하면 A.
- **중기 (Step 1.8 이후)**: **C안 (wobbly 말풍선)** — Animal Crossing 결 차별점 확보. 안식처 톤 끝판왕.
- **장기**: **E안 (typing indicator)** — alone together 컨셉 강화.

---

## 4. 한국어 IME 안전 처리 (모든 안 공통)

```ts
// 기존 ChatInput 패턴 그대로 재사용
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
    e.preventDefault();
    handleSend();
  }
};

// 추가 안전 장치: composition 상태 별도 추적
const [isComposing, setIsComposing] = useState(false);

<input
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={() => setIsComposing(false)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !isComposing && !e.nativeEvent.isComposing) {
      handleSend();
    }
  }}
/>
```

- **핵심**: `KeyboardEvent.isComposing` + `onCompositionStart/End` 이중 가드.
- 브라우저별 차이: Chrome은 isComposing 신뢰 가능, Firefox는 composition 이벤트 순서 차이 → 이중 가드 필요.
- 라이브러리 옵션: `use-chat-submit` React hook 결 IME-safe 구현 참고.

---

## 5. 모바일 결 채팅 입력 패턴

### 5.1 모바일 가상 키보드의 문제

- 가상 키보드가 올라오면 **화면 하단 50% 가림**. 머리 위 인라인 input은 그대로 둘 수 있으나, 캐릭터가 화면 하단에 있을 경우 키보드가 캐릭터+input 모두 가림.
- iOS Safari는 viewport resize 결 동작, Android Chrome은 overlay 결 동작 — 처리 분기 필요.

### 5.2 모바일 채팅 트리거 패턴

| 패턴 | 게임 | 설명 |
|---|---|---|
| 채팅 아이콘 탭 | Genshin, Among Us, Fortnite | 우상단/우하단 fab 아이콘. 탭 시 입력 모달 또는 도크 활성. |
| 캐릭터 직접 탭 | (드묾) | 자기 캐릭터 탭 → 입력 모드. 직관적이나 이동 결과 충돌. |
| 가상 키보드 자동 호출 | VRChat 모바일, IMVU | 입력 모드 진입 시 OS 키보드 자동 호출. |

### 5.3 본 프로젝트 모바일 결 권고

- **데스크탑 우선 정책**은 유지하되, 모바일 fallback은:
  1. 머리 위 인라인 input은 **모바일에서 자동으로 화면 하단 도크로 이동** (반응형 분기).
  2. 또는 모바일에서만 D안 (하단 도크) 적용.
  3. 우측 사이드 드로어 채팅 내역은 모바일에서 full-screen overlay로 전환.
- **viewport `interactive-widget=resizes-content`** 메타 태그 결 키보드 호출 시 viewport 안정화.

---

## 6. 출처

- [VRChat Chatbox Wiki](https://wiki.vrchat.com/wiki/Chatbox)
- [VRChat 2026.2.1 Release Notes](https://docs.vrchat.com/docs/vrchat-202621)
- [Animal Crossing UI Database](https://www.gameuidatabase.com/gameData.php?id=606)
- [Animal Crossing Wobbly Dialogue Bubble Demo (CodePen)](https://codepen.io/andymerskin/pen/NWqQydM)
- [Genshin Impact Chat Guide (Game8)](https://game8.co/games/Genshin-Impact/archives/314560)
- [Stardew Valley Multiplayer Speech Bubbles Mod](https://www.nexusmods.com/stardewvalley/mods/2192)
- [FFXIV Chat Bubble UI Guide](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_chatbubble.html)
- [Among Us Chat Wiki](https://among-us.fandom.com/wiki/Chat)
- [Mozilla Hubs Review (Ghost Howls)](https://skarredghost.com/2018/04/27/mozilla-hubs-review-a-completely-open-and-free-vr-social-for-the-web/)
- [Roblox Bubble Chat Wiki](https://roblox.fandom.com/wiki/Bubble_chat)
- [use-chat-submit (IME-safe React hook)](https://github.com/catnose99/use-chat-submit)
- [Korean IME composition isComposing guide](https://www.javaspring.net/blog/detecting-ime-input-before-enter-pressed-in-javascript/)
- [Chat UI Design Best Practices 2026 (UXPin)](https://www.uxpin.com/studio/blog/chat-user-interface-design/)
- [16 Chat UI Design Patterns 2026 (Bricxlabs)](https://bricxlabs.com/blogs/message-screen-ui-deisgn)
- [Latest Trends in VR/AR Text Input (Fleksy)](https://www.fleksy.com/blog/latest-trends-in-vr-and-ar-text-input-in-the-metaverse/)
- [Material Design Icon Buttons Accessibility](https://m3.material.io/components/icon-buttons/accessibility)

---

## 7. 마음의 고향 적용 의미

- **A/B안 즉시 채택**: "전송 버튼이 못생긴 결" 핵심 통증을 가장 빠르게 해소. 산업 표준 (Animal Crossing/VRChat/Roblox/Mozilla Hubs) 결로 검증된 패턴.
- **C안 장기 비전**: Animal Crossing 결 wobbly 말풍선은 우리가 추구하는 "안식처 톤" 정수. ZEP 메타버스 회귀 차단 가드레일 강화. Step 1.7 이후 별도 트랙으로 확장 가치.
- **모바일 fallback 계획**: 데스크탑 우선이지만 사용자가 모바일로 접근할 때 머리 위 인라인 → 하단 도크 반응형 분기 결 박아두면 향후 모바일 확장 시 무리 없음.
- **IME 가드**: 기존 ChatInput 결 `isComposing` 가드 그대로 재사용. 한국 유저 베이스 결 필수.
