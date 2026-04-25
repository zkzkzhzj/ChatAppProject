# 49. React 입력 컴포넌트 IME 조합 처리 — 한글/일본어/중국어 입력의 함정

> 작성 시점: 2026-04-26
> 트랙: `ui-mvp-feedback` (첫 노트)
> 맥락: F-3 — macOS + 한글 IME 환경에서 채팅 입력 후 마지막 글자/단어가 다음 메시지에 중복 잔류해 두 번 전송되는 회귀 버그
> 관련 파일: `frontend/src/components/chat/ChatInput.tsx` · `frontend/src/components/chat/ChatInput.test.tsx`
> 관련 커밋: `f8248b2`

---

## 0. 한 줄 요약

**라틴 알파벳을 쓰지 않는 언어(한/중/일) 사용자가 React `onKeyDown` 으로 Enter 를 잡아 메시지를 보내는 폼을 쓰면, 거의 반드시 "마지막 음절이 두 번 보내지는" 버그를 만난다.** 원인은 IME 조합 중에도 React 가 keydown 이벤트를 그대로 흘려보내기 때문이고, 해결은 한 줄 — `e.nativeEvent.isComposing` 가드.

다만 이 한 줄 뒤에는 **DOM Composition Events 라이프사이클**, **macOS Apple IME 의 음절 확정 시점 특이성**, **React SyntheticEvent 의 native 위임 모델**, 그리고 **jsdom 의 IME 시뮬레이션 한계** 라는 네 개의 층이 있다. 이 노트는 그 네 층을 사람이 다시 읽었을 때 맥락이 바로 잡히도록 정리한 것.

---

## 1. 배경 — F-3 가 어떻게 발견됐는가

### 1.1 증상

MVP 피드백 단계에서 macOS 사용자가 보고한 시나리오:

```text
T+0:  사용자가 "안녕하세요" 를 한글 IME 로 입력
T+1:  Enter 를 누름 → "안녕하세요" 가 채팅창에 전송됨
T+2:  사용자가 다음 메시지 입력 시작 — 그런데 입력창에 "요" 한 글자가 이미 남아 있음
T+3:  사용자가 그것을 지우거나 의식하지 못한 채로 다음 단어를 이어 입력
T+4:  결과적으로 "요반갑습니다" 가 한 메시지로 전송되거나, "요" 만으로 한 메시지가 또 전송
```

즉 **마지막 음절이 입력창에 잔류** 해서, 다음 메시지에 섞여 들어가거나 혼자 한 번 더 전송되는 두 가지 변형이 모두 가능하다. Enter 한 번에 메시지 두 건이 발사되는 게 가장 사용자 체감이 큰 변형이었다.

### 1.2 왜 알파벳 사용자에겐 안 보이는가

영문 입력은 키 한 번 = 글자 한 개 = 즉시 input.value 반영. 조합 단계가 없다. 그래서 동일 코드가 영어로 테스트할 때는 100% 정상 동작한다. 백엔드 개발자가 자기 기계(주로 영문 위주의 키 입력)에서 검증하면 절대 안 잡힌다. **MVP 테스터가 한국어 사용자라서 잡혔다는 점 자체가 운**.

### 1.3 검증 한계 (반드시 명시)

이 노트의 모든 분석은 **개발자가 macOS 실기기를 보유하지 않은 상태**에서 작성됐다. 신뢰 근거는 다음 4축으로만 받친다.

1. **유닛 테스트**: `ChatInput.test.tsx` 의 3 시나리오(`vitest` + Testing Library + jsdom). `e.nativeEvent.isComposing=true` 인 KeyboardEvent dispatch 시 `sendVillageMessage` 가 호출되지 않음을 assert.
2. **표준 명세**: `KeyboardEvent.isComposing` 은 W3C UI Events 명세에 정의된 표준이며 Chrome/Safari/Firefox/Edge 모두 지원.
3. **선례**: MUI / Chakra UI / Mantine 등 주요 React 컴포넌트 라이브러리가 동일 패턴(`isComposing` 가드)을 채택. 이건 새로운 발명이 아니라 사실상 업계 표준.
4. **회귀 위험**: 수정은 early return 만 추가한 것이라, IME 가 아닌 입력 흐름엔 어떠한 동작 변화도 없음.

**한계**: macOS 실기기·Windows 한글 IME 실기기 모두 개발자 환경에서 직접 재현/검증 못 함. **머지 후 원 피드백 제공자에게 재검증 요청 필수** 라는 약속이 따라붙어야 한다. jsdom 은 IME 의 실제 라이프사이클(compositionstart → update → end + 그 사이의 keydown 시퀀스)을 시뮬레이션하지 못한다 — 이 점은 §6 에서 따로 다룬다.

---

## 2. IME 가 무엇이며 왜 React 입력의 적인가

### 2.1 IME = Input Method Editor

키보드 자판은 26개 알파벳 + 숫자 + 기호 정도밖에 못 친다. 그런데 한국어는 음절이 1만개 이상, 일본어 한자는 5천개 이상, 중국어 상용 한자는 3천개 이상이다. **물리 키 입력 → 사용자가 의도한 글자** 로 변환하는 OS 수준 소프트웨어가 필요한데 이게 IME 다.

```text
[키보드 입력]   →   [IME]   →   [어플리케이션이 보는 글자]
   "dks"            한글 IME       "안"
   "dks "           (조합 종료)    "안 " (확정)
   "ehgkse"         (조합 진행)    "도하느" (잠정)
   "gkrhd"          (조합 종료)    "학교" (확정)
```

핵심은 **물리 키와 글자가 1:1 이 아니라는 점**, 그리고 **확정 전의 "잠정 음절"이라는 상태가 존재한다는 점**.

### 2.2 음절 라이프사이클 — 사용자가 보는 것 vs `input.value`

```text
사용자 키 입력:    d    k    s
사용자 화면:       ㄷ   다   단
input.value:      ㄷ   다   단      ← 여기까지는 일치
                                     (확정 안 된 상태로도 input 에 표시됨)

스페이스 또는 다음 자음/특수키:  ↓  음절 확정
input.value:      안                ← 이 시점부터 "확정된 글자"
```

문제는 **"단" 처럼 보이는 사이의 시간**. 사용자 화면엔 글자가 보이고 `input.value` 에도 들어가 있지만, IME 는 아직 "이게 최종이 아닐 수도 있어" 상태다. 이걸 **composition (조합) 상태** 라고 부른다.

### 2.3 DOM 표준의 Composition Events

W3C UI Events 명세는 IME 조합을 추적하기 위해 3개 이벤트를 정의한다.

```text
compositionstart    조합 시작 (첫 키)
compositionupdate   조합 진행 중 (각 키마다)
compositionend      조합 확정 (스페이스/Enter/다음 음절 시작 등)
```

타임라인 예 (한글 "안" 입력):

```text
시각  키          이벤트 시퀀스
T+0   d  press   keydown → compositionstart → compositionupdate → input → keyup
T+1   k  press   keydown → compositionupdate → input → keyup
T+2   s  press   keydown → compositionupdate → input → keyup
T+3   space      keydown → compositionend → input → keyup
                         ↑ 여기서 "안" 확정
```

**중요**: `compositionend` 가 발생하기 전까지 모든 keydown 의 `event.isComposing === true`. 조합이 끝난 keydown(예: T+3 의 스페이스) 의 `isComposing` 은 브라우저마다 미묘하게 다른데, 모던 브라우저들은 **그 마지막 keydown 도 `isComposing === true`** 로 본다 (조합 종료를 트리거한 키 자체는 아직 조합의 일부로 간주).

### 2.4 React `onKeyDown` 이 IME 조합 중에도 발사되는 이유

React 의 `SyntheticEvent` 는 native event 를 거의 그대로 래핑한다. **React 는 IME 조합을 별도로 처리하지 않는다.** 이건 의도된 설계로, "브라우저가 발사하는 모든 keydown 을 그대로 노출하는 것이 더 일관되다" 는 결정. (참고: React 는 `onCompositionStart`, `onCompositionUpdate`, `onCompositionEnd` 도 따로 노출한다. 즉 둘 다 쓰라는 뜻이지, IME 를 자동으로 가려준다는 뜻이 아니다.)

따라서 개발자가 명시적으로 가드를 두지 않으면:

```tsx
// 버그가 있는 코드
<input onKeyDown={(e) => {
  if (e.key === 'Enter') sendMessage();   // 조합 중 Enter 도 여기로 들어옴
}} />
```

한글 사용자가 "안녕" 입력 후 Enter 를 누를 때:

```text
"녕" 의 마지막 자음 'ㅇ' 키를 IME 가 받아 조합을 진행 중인 와중에
사용자가 Enter 를 누르면, 브라우저는

  1. (Enter keydown) — 이 시점 isComposing=true (조합 종료를 위한 키)
     → React onKeyDown 발사 → "안녕" 으로 sendMessage 호출
  2. compositionend 발생 → input.value 가 "안녕" 으로 확정 (이미 보내지긴 했지만)
  3. Enter 의 효과로 또 한 번 keydown 이 들어오는 OS/브라우저 조합도 있음
     (이건 환경 의존적이고, 정확한 트리거는 Apple IME 가 가장 까다로움)
```

이 두 단계 사이에서 setDraft('') 가 끼면 "마지막 음절이 미처 확정되기 전에 input 이 비워지고, 확정된 음절이 다시 input 에 들어가는" 잔류 현상이 생긴다. F-3 의 "요" 잔류는 이 변형.

---

## 3. macOS 한글 IME 가 특히 잘 터지는 이유

### 3.1 IME 구현체별 음절 확정 시점 차이

| IME | 마지막 음절 자동 확정 시점 |
|---|---|
| Windows MS-IME (한글) | 자판 입력만으로는 거의 자동 확정 안 됨. 스페이스/엔터에서만 확정. **Enter keydown 시 isComposing=true 일 가능성이 가장 높은 환경 중 하나.** |
| macOS Apple 한글 (2벌식) | Windows 와 비슷하게 마지막 음절은 보류. 그러나 **Enter 키 처리에 자체 동작이 있음** — Apple IME 가 Enter 를 "조합 확정" 으로 해석하면서 동시에 OS 레벨에서 또 한 번 keydown 을 디스패치하는 케이스가 보고됨. |
| macOS Google 한국어 입력기 | 자체 구현. Apple 보다 표준에 더 가까운 동작이지만 환경마다 다름 |
| Windows Google 한국어 입력기 | 자체 구현. MS-IME 보다 표준에 가까움 |

**핵심 차이**: macOS Apple IME 는 Enter 를 "조합 확정 키"이자 "전송 키" 로 두 번 해석할 수 있는 구조. 이게 F-3 의 "두 번 전송" 변형이 macOS 에서 더 자주 보고되는 이유로 [추정] 된다 (정확한 OS 내부 디스패치 순서는 Apple 비공개).

### 3.2 정확한 이벤트 시퀀스 — F-3 가 발생하는 순간

가장 흔한 시나리오 (macOS Apple IME, "안녕" 후 Enter):

```text
1. 사용자 'ㅇ', 'ㅏ', 'ㄴ', 'ㄴ', 'ㅕ', 'ㅇ' 입력
   → input.value = "안녕"
   → 마지막 'ㅇ' 의 조합이 아직 "보류" 상태
   → IME 내부적으로 "녕" 은 아직 잠정

2. 사용자 Enter 누름
   → keydown(Enter, isComposing=true)  ← React onKeyDown 호출됨
   → React onKeyDown:
        e.key === 'Enter' && !e.shiftKey 매치
        e.preventDefault()
        sendMessage("안녕")  ← 여기서 메시지 발사
        setDraft('')         ← input 비움 (의도)

3. compositionend 이벤트 (Apple IME 가 Enter 를 받아 조합 확정)
   → "녕" 이 OS 차원에서 확정됨
   → 그런데 input 은 이미 비워졌고, Apple IME 는 "확정된 음절을 input 에 다시 주입"
   → input.value = "녕" (또는 "요" 같은 마지막 음절)

4. 추가 변형: OS 가 confirmation 후 Enter 를 또 한 번 디스패치
   → 또 React onKeyDown(Enter, isComposing=false) 호출
   → "녕" 만 들어 있는 input 으로 sendMessage("녕")
   → 결과: "안녕" + "녕" 이 별도 메시지로 두 번 전송
```

이 시퀀스가 "두 번 전송" / "마지막 음절 잔류" 두 변형을 모두 설명한다. 어느 변형이 발생할지는 OS 버전·키보드 입력 속도·IME 종류에 따라 다름.

### 3.3 핵심 통찰

**가장 안전한 룰**: `keydown.isComposing === true` 인 모든 keydown 에서는 절대 비즈니스 로직(전송, 검색, navigation)을 실행하지 않는다. 이 한 줄이 위 시퀀스의 1단계를 차단해서 전체 버그 사슬을 끊는다.

---

## 4. 해결 옵션 비교

### 4.1 세 가지 후보

| | A. `e.nativeEvent.isComposing` | B. `compositionstart`/`compositionend` + ref | C. `e.keyCode === 229` |
|--|---|---|---|
| 핵심 개념 | KeyboardEvent 의 표준 속성을 직접 읽음. native event 를 한 번 캐스팅 | `onCompositionStart` 에서 ref 를 true 로, `onCompositionEnd` 에서 false 로 설정. `onKeyDown` 에서 ref 검사 | IME 조합 중 keydown 의 keyCode 가 229 인 것을 이용. 레거시 IE/Safari 호환용 |
| 코드 분량 | 1줄 | 5~10줄 + ref 선언 + 3개 핸들러 | 1줄 |
| 표준성 | W3C UI Events Level 3 표준 | W3C 표준이지만 React 에서는 SyntheticEvent → native ref 추적 보일러플레이트 | 비표준 (deprecated). HTML Living Standard 에서 keyCode 자체가 deprecated |
| 브라우저 지원 | 모든 모던 브라우저 (Chrome 60+, Firefox 31+, Safari 10.1+, Edge) | 모든 모던 브라우저 | 모든 브라우저 (단, 새 브라우저들은 keyCode 채워주긴 하지만 deprecated) |
| 정확도 | macOS Apple IME 의 모든 변형에서 검증된 표준 경로 | 가장 견고. ref 기반이라 React 라이프사이클과 독립적 | 같은 keyCode 229 가 다른 의미로 쓰이는 환경이 있음 (특정 IME 의 비조합 키도 229 보고) |
| ESLint 친화성 | OK | OK | `@typescript-eslint/no-deprecated` 가 keyCode 사용을 경고로 표시 |
| 적합한 상황 | 90% 의 일반 폼 입력 | 입력의 정확성이 비즈니스 임계인 경우 (검색 자동완성·실시간 명령 등) | 레거시 브라우저 호환이 필수인 경우 (이제 거의 없음) |
| 실제 사용 사례 | MUI `Autocomplete`, Chakra UI `Input`, Mantine, Ant Design 다수 컴포넌트 | Slate.js, Lexical 같은 리치 텍스트 에디터의 내부 구현 | 5~10년 전 jQuery 시대 패턴. 지금은 폴백으로만 |

### 4.2 채택 — A 안

```ts
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  e.stopPropagation();

  // IME 조합 중인 키 입력은 무시한다 (F-3 macOS 한글 IME 마지막 음절 중복 입력 방지).
  // 모던 브라우저는 `e.nativeEvent.isComposing` 으로 충분하다.
  const native = e.nativeEvent as { isComposing?: boolean };
  if (native.isComposing) {
    return;
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    // 전송 로직
  }
};
```

**선택 사유:**

1. **간결함** — 한 줄. 추가 ref·추가 핸들러·추가 라이프사이클 관리 없음.
2. **표준 경로** — W3C UI Events Level 3 명세 정의. 모던 브라우저 모두 지원.
3. **선례 일치** — MUI/Chakra/Mantine 등이 동일 패턴. "이런 거 우리만 발명한 거 아닌가?" 의심을 차단.
4. **deprecated 경고 회피** — C 안의 `keyCode === 229` 는 `@typescript-eslint/no-deprecated` 룰이 경고로 잡음. 우리 프로젝트 ESLint 설정([learning/20](./20-frontend-eslint-convention.md))이 이 룰을 켜둠.
5. **회귀 표면 최소** — `if (isComposing) return;` 만 추가. 비-IME 입력 흐름엔 어떠한 동작 변화도 없음.

### 4.3 B 안을 안 쓴 이유 (그리고 언제 다시 검토할 것인가)

B 안은 "가장 견고" 라고 표에 적었다. 그건 사실이다. ref 기반은:

- React StrictMode 의 이중 렌더링에 영향 안 받음
- SyntheticEvent 풀링 (구 React) 영향 안 받음
- 일부 IME 가 `isComposing` 을 정확히 보고하지 않는 엣지 케이스에서도 동작

그런데 **현재 우리 ChatInput 의 입력 정확성이 비즈니스 임계는 아니다**. 채팅창에 "녕" 한 글자 잔류해도 사용자가 의식적으로 지울 수 있는 영역이고, 가드 한 줄로 그 가능성 자체를 차단할 수 있다.

**B 안으로 갈아야 할 시점:**

- 검색 자동완성처럼 매 keystroke 가 API 콜인 컴포넌트
- 실시간 슬래시 명령 파서
- 키보드 단축키가 빈번한 에디터형 컴포넌트
- 다양한 IME 환경에서 `isComposing` 누락이 실측됐을 때

지금은 그 단계가 아니다.

### 4.4 왜 C 안을 절대 안 쓰는가

```ts
// 안 쓸 코드
if (e.keyCode === 229) return;
```

- `keyCode` 자체가 HTML Living Standard 에서 deprecated. ESLint 가 경고.
- 모던 브라우저들이 호환을 위해 채워주긴 하지만 정확도 떨어짐. macOS Safari 일부 버전에서 IME 조합 중 Enter 의 keyCode 가 229 가 아닌 13 으로 보고된 사례 있음 ([추정]: 명세 외 동작이라 브라우저별 미세 차이).
- A 안과 동시에 쓸 이유도 없음 (`isComposing` 이 더 정확).

---

## 5. handleChange 가드 — 이쪽도 빠뜨리면 안 되는 이유

`handleKeyDown` 만 막으면 끝나는 게 아니다. F-3 수정에는 `handleChange` 에도 가드가 들어갔다.

```ts
const handleChange = useCallback(
  (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDraft(value);

    // IME 조합 중에는 멘션 매칭을 스킵한다 — 미확정 음절로 매칭하면 부정확.
    // 조합 종료 후 다음 onChange 에서 정상 매칭됨.
    const native = e.nativeEvent as { isComposing?: boolean };
    if (native.isComposing) {
      return;
    }

    // @ 멘션 감지 로직 ...
  },
  [mentionables],
);
```

### 5.1 왜 setDraft 는 호출하면서 그 아래 로직만 막는가

**핵심**: input 의 controlled value 자체는 IME 조합 중에도 갱신해야 한다. 그래야 사용자가 보는 화면과 React state 가 일치한다. 막아야 하는 건 "이 잠정 값으로 비즈니스 로직(멘션 매칭, 자동완성, 검색 콜) 을 트리거하는 것".

```text
사용자 입력: "ㅁ"     → setDraft("ㅁ"), 멘션 매칭 스킵
사용자 입력: "마"     → setDraft("마"), 멘션 매칭 스킵
사용자 입력: "마ㅇ"   → setDraft("마ㅇ"), 멘션 매칭 스킵 (조합 진행 중)
사용자 입력: "마을"   → setDraft("마을"), 조합 종료 → 멘션 매칭 실행
```

만약 모든 단계에서 멘션 매칭을 돌리면 "ㅁ" → "마" → "마ㅇ" 단계마다 부정확한 매칭이 일어나서 드롭다운이 깜빡거리거나 잘못된 후보가 떴다 사라진다. 사용자 입장에서 "타이핑 중에 무언가가 자꾸 번쩍인다" 는 체감 버그.

### 5.2 setDraft 자체를 막으면 어떻게 되는가

이건 더 큰 버그다. controlled input 은 React state 가 진실이라서, `setDraft` 를 막으면 사용자가 친 글자가 화면에 안 나타난다. **IME 조합 중 보이는 잠정 음절은 OS 가 input 에 직접 그리는 게 아니라, input 의 value 를 IME 가 갱신 → input 이 onChange 를 발사 → React 가 state 갱신 → React 가 input 의 value 를 다시 그리는 사이클** 이다 (controlled input 의 정의). 이 사이클이 끊어지면 글자가 안 보인다.

요약: **value 갱신은 통과시키고, 비즈니스 로직만 차단** 한다.

---

## 6. 테스트로 회귀 방지 — jsdom 의 한계와 현실적 전략

### 6.1 우리 테스트가 검증하는 것

`ChatInput.test.tsx` 의 3 시나리오:

```ts
it('IME 조합 중에는 Enter 가 전송을 발사하지 않는다 (F-3 핵심)', () => {
  fireEvent.change(input, { target: { value: '안녕' } });
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
  expect(mockSendVillageMessage).not.toHaveBeenCalled();
});

it('조합이 끝난 뒤 Enter 는 정상 전송된다', () => {
  fireEvent.change(input, { target: { value: '안녕하세요' } });
  fireEvent.keyDown(input, { key: 'Enter', isComposing: false });
  expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
});

it('영문 입력 후 Enter 는 기존 동작대로 한 번만 전송한다', () => {
  fireEvent.change(input, { target: { value: 'hello world' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
});
```

이 세 테스트는 **"코드의 가드 분기가 의도대로 동작한다"** 는 것을 검증한다. 충분한가? 부분적으로만 충분하다.

### 6.2 jsdom 이 시뮬레이션 못 하는 것

jsdom 은 DOM API 를 JavaScript 로 구현한 것이지, 실제 브라우저가 아니다. 특히 IME 관련해서 다음을 시뮬레이션 못 한다:

1. **실제 OS IME 와의 상호작용** — `compositionstart`/`compositionupdate`/`compositionend` 이벤트가 실제 OS IME 의 음절 확정 시점에 맞춰 발사되지 않음. `fireEvent` 로 임의 발사할 뿐.
2. **isComposing 의 자동 채움** — 실제 브라우저에선 IME 조합 중 keydown 의 `isComposing` 이 자동으로 true. jsdom 에선 우리가 옵션으로 주입해야 함 (`{ isComposing: true }`).
3. **OS 별 차이** — macOS Apple IME 가 Enter 후 추가로 keydown 을 한 번 더 디스패치하는 동작은 jsdom 에서 재현 불가.
4. **focus·blur 와 IME 의 상호작용** — 일부 환경은 input blur 가 강제 compositionend 를 트리거함. jsdom 은 이 동작 없음.

### 6.3 그래서 우리 테스트가 증명하는 것 vs 증명 못 하는 것

**증명하는 것:**

- "isComposing=true 인 keydown 이 들어오면 sendVillageMessage 는 호출되지 않는다" — 코드 분기 검증. 회귀 방지에 충분.
- "isComposing=false 인 keydown 은 정상 처리된다" — 비-IME 입력의 회귀 없음.

**증명 못 하는 것:**

- "macOS Apple IME 가 실제로 isComposing=true 로 keydown 을 보낸다" — 이건 W3C 명세 + 브라우저 구현체에 의존. 우리 코드의 책임 영역이 아님.
- "Apple IME 가 Enter 후 두 번째 keydown 을 보내도 두 번째도 isComposing 가 적절히 세팅된다" — 같은 이유.

### 6.4 현실적 검증 전략 — 3축 보완

```text
표준 패턴 (선례 일치)
   ├─ MUI/Chakra/Mantine 등 주요 라이브러리가 같은 패턴 사용
   └─ 우리만의 발명이 아님. 이게 안 통하면 React 생태계 전체가 안 통함

유닛 테스트 (코드 분기 검증)
   ├─ vitest + Testing Library (jsdom)
   └─ "가드가 켜졌을 때 비즈니스 로직이 호출되지 않음" 만 검증

사용자 실기 검증 (회귀 확인)
   ├─ macOS + 한글 IME 보유자 (원 피드백 제공자)
   └─ 머지 후 시나리오 재현 요청 — 핵심
```

이 3축이 모두 통과해야 "F-3 해결" 이라고 말할 수 있다. 1번과 2번은 머지 시점에 만족, 3번은 머지 후 후속 검증.

### 6.5 e2e 테스트로 가지 않는 이유

Playwright 같은 e2e 테스트로 실제 브라우저를 띄워서 검증할 수 있긴 하다. 그런데:

- Playwright 도 IME 자체를 직접 시뮬레이션 못 함 (`page.keyboard.type` 은 알파벳 입력만). IME 입력은 OS API 호출이 필요한데 자동화 도구가 거기까진 못 들어감.
- 결국 사람의 실기기 손가락 검증이 끝판왕.
- e2e 인프라 추가 비용 vs 사용자 1명 재검증 비용 → 후자가 압도적으로 싸다.

따라서 **MVP 단계에선 e2e 안 도입, 사용자 재검증으로 보완** 이 합리적 결정. 사용자 수가 많아져서 회귀 위험이 커지면 그때 e2e 검토.

---

## 7. 핵심 개념 정리

### 7.1 한 장 다이어그램 — IME 입력의 전체 사이클

```text
┌────────────────────────────────────────────────────────────────────┐
│  사용자 키 입력                                                       │
│      ↓                                                              │
│  OS IME 가 가로챔                                                     │
│      │                                                              │
│      ├─ 조합 시작:  compositionstart 이벤트 발사                       │
│      │                                                              │
│      ├─ 조합 진행:  compositionupdate (각 키마다)                     │
│      │             keydown (isComposing=true)                       │
│      │             input (잠정 음절이 input.value 에 반영)             │
│      │                                                              │
│      └─ 조합 종료:  compositionend                                   │
│                    keydown (조합 종료 키, isComposing=true 까지가 표준) │
│                    input (확정 음절이 value 로)                        │
│                                                                     │
│      ↓                                                              │
│  React onChange / onKeyDown 핸들러                                   │
│      │                                                              │
│      └─ 우리가 가드 추가하지 않으면 모든 단계의 keydown 이 그대로 통과    │
│                                                                     │
│  [가드 추가 후]                                                       │
│      if (e.nativeEvent.isComposing) return;                         │
│      → 조합 중 keydown 차단                                            │
│      → 조합 종료 후 keydown 만 비즈니스 로직 실행                        │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 React SyntheticEvent vs nativeEvent

```text
브라우저 native event
     │
     │  React 가 합성·풀링·정규화
     ▼
React SyntheticEvent
     │
     ├─ e.key, e.shiftKey 등 React 표준화 속성
     └─ e.nativeEvent  ← 원본 native event 직접 접근
                         (TypeScript 타입은 KeyboardEvent (DOM) 으로 좁힘 가능)
```

`isComposing` 은 React SyntheticEvent 에 직접 노출되지 않는 속성이라 `e.nativeEvent` 로 접근해야 한다. TypeScript 에서는 다음과 같이 캐스팅 (안전하게 좁힘):

```ts
const native = e.nativeEvent as { isComposing?: boolean };
if (native.isComposing) return;
```

DOM `KeyboardEvent` 타입을 직접 임포트해서 캐스팅해도 된다. 우리는 인덱스 시그니처 캐스팅으로 가장 가벼운 좁힘을 선택했다.

> **참고**: React 17+ 에선 SyntheticEvent 풀링이 제거되어 `e.nativeEvent` 가 비동기 콜백 안에서도 안전하다. 16 이하라면 `e.persist()` 가 필요했지만 우리는 18 이라 신경 쓸 필요 없음.

### 7.3 controlled input + IME — value 갱신은 항상 통과

```tsx
// 정확한 패턴
<input
  value={draft}
  onChange={(e) => {
    setDraft(e.target.value);                      // ★ 항상 통과
    if ((e.nativeEvent as { isComposing?: boolean }).isComposing) {
      return;                                       // 비즈니스 로직만 스킵
    }
    runMentionMatching(e.target.value);
  }}
  onKeyDown={(e) => {
    if ((e.nativeEvent as { isComposing?: boolean }).isComposing) {
      return;                                       // ★ 키 액션 스킵
    }
    if (e.key === 'Enter') sendMessage();
  }}
/>
```

**룰 두 줄로 압축:**

1. `onChange`: setState 는 항상 통과. 그 외 비즈니스 로직만 IME 조합 중 차단.
2. `onKeyDown`: IME 조합 중에는 모든 키 액션 차단.

---

## 8. 실전에서 주의할 점

### 8.1 가드를 빠뜨리기 쉬운 위치

- **검색 자동완성** — `onChange` 마다 디바운스 후 API 콜. 디바운스 안에서 isComposing 검사가 빠지면 잠정 음절로 검색 발사.
- **슬래시 명령 파서** — `/help` 같은 명령. 한글 입력 → "ㅎ" → 매칭 시도 → 깜빡임.
- **단축키 (Cmd+K, Ctrl+/)** — 입력창 안의 단축키. IME 조합 종료 키와 충돌 가능.
- **자동 저장 (autosave on blur)** — IME 조합 도중 blur 가 강제 compositionend 를 트리거하는 환경. 저장 시점에 isComposing 검증 필요.

### 8.2 textarea 의 Enter 와 Shift+Enter

ChatInput 은 `<input>` 이지만, 향후 멀티라인 채팅창으로 바뀌면 `<textarea>` + "Enter 전송, Shift+Enter 줄바꿈" 패턴이 일반적. 이 경우에도 동일한 가드가 필요.

```tsx
if ((e.nativeEvent as { isComposing?: boolean }).isComposing) return;
if (e.key === 'Enter' && !e.shiftKey) {
  e.preventDefault();
  sendMessage();
}
```

추가로 textarea 는 IME 조합 중 Enter 가 "줄바꿈"을 OS 차원에서 트리거하는 경우가 있어, `e.preventDefault()` 도 함께 묶어야 함.

### 8.3 paste·drop·cut 이벤트와의 관계

paste 는 IME 와 무관. composition 이벤트 발사 안 함. 따로 가드 필요 없음. 다만 paste 후 자동 처리 로직이 있다면 paste 이벤트 자체에서 처리.

### 8.4 모바일 가상 키보드

iOS/Android 가상 키보드에서 한글 입력은 **거의 모든 자판이 IME 를 거친다.** 이 가드가 모바일에서 더 자주 작동한다는 뜻. ChatInput 이 향후 모바일로 확장될 때 같은 코드가 그대로 동작 — 그게 표준 경로의 장점.

### 8.5 macOS 에서 한자 변환 (option+e 등 dead key) 도 composition 인가

dead key (악센트 입력 같은) 는 환경에 따라 다름. macOS 일부 버전은 dead key 도 compositionstart 를 발사. 우리는 이 경로의 사용자가 거의 없으므로 별도 처리 안 함. 만약 보고가 들어오면 같은 가드로 자동 해결될 가능성 높음.

---

## 9. 나중에 돌아보면

### 9.1 이 선택이 틀렸다고 느낄 시점

- **`isComposing` 이 false 로 잘못 보고되는 IME 환경 보고** 가 들어오면 B 안(composition events + ref) 으로 갈아엎어야 함. 현재는 그런 보고 없음.
- **검색 자동완성이나 실시간 명령 파서 같은 컴포넌트** 가 추가됐는데 같은 패턴으로만 가드를 둔 경우 — 그 컴포넌트는 정확도가 더 임계라서 B 안 검토.
- **React 가 SyntheticEvent 모델을 크게 바꾼 메이저 버전** — 가능성 낮지만 이론적으로는 영향 가능.

### 9.2 스케일이 바뀌면

| 스케일 | 추천 |
|---|---|
| 단일 ChatInput, 일반 채팅 | A 안 (현재 우리 것). 충분. |
| 채팅 + 검색 자동완성 + 슬래시 명령 다수 | 공통 훅 `useImeAwareKeydown` 추출. 가드 한 곳에 모음. |
| 리치 텍스트 에디터 | B 안 + composition 이벤트 직접 활용. 잠정 음절도 비즈니스 로직에 활용해야 함 (예: 실시간 협업 커서). |
| 다국어 IME 광범위 지원 (인도어·아랍어 등) | A 안 + 추가 IME 별 회귀 테스트. 인도어·아랍어 IME 의 isComposing 보고 정확도는 검증 안 됨 [추정]. |

### 9.3 다음번에 새 입력 컴포넌트를 만든다면

1. `<input>`/`<textarea>` 만들 때 키보드 핸들러 첫 줄에 isComposing 가드 자동 삽입 (스니펫 등록).
2. ESLint 커스텀 룰 또는 lint 플러그인으로 "Enter 키 핸들러에 isComposing 가드 없으면 경고" 가능 [추정]. 우리가 직접 만들기엔 ROI 가 낮음.
3. 컨벤션 문서(`docs/conventions/coding.md` 또는 프론트엔드용)에 한 줄 추가 — "한글/일본어/중국어 사용자가 쓰는 입력 컴포넌트의 onKeyDown/onChange 는 isComposing 가드 필수".

---

## 10. 더 공부할 거리

### 10.1 직접 관련 (이 프로젝트)

- [learning/26 — Phaser vs HTML UI 키보드 포커스 충돌](./26-phaser-html-keyboard-focus-conflict.md) — 게임 엔진 + 입력 컴포넌트 공존 시 키 이벤트가 어디로 가야 하는가
- [learning/34 — React + Next.js 프로덕션 코드 패턴](./34-react-nextjs-production-code-patterns.md) — 백엔드 출신이 React 입력을 다룰 때 자주 놓치는 것들
- [learning/20 — 프론트엔드 ESLint 컨벤션](./20-frontend-eslint-convention.md) — `@typescript-eslint/no-deprecated` 룰이 keyCode 를 잡아내는 이유

### 10.2 표준·공식 문서

- [MDN — KeyboardEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing) — 한 줄 정의 + 호환성 매트릭스
- [W3C UI Events Level 3 — Composition Events](https://www.w3.org/TR/uievents/#events-compositionevents) — compositionstart/update/end 정확한 명세
- [HTML Living Standard — IME](https://html.spec.whatwg.org/multipage/interaction.html#input-modalities%3A-the-keyboard) — input modalities 섹션
- [React 공식 — Composition Events](https://react.dev/reference/react-dom/components/common#compositionevent-handler) — onCompositionStart/Update/End 핸들러

### 10.3 라이브러리 구현 사례 (실제 코드 보기)

- [MUI Autocomplete 의 isComposing 처리](https://github.com/mui/material-ui/blob/master/packages/mui-base/src/useAutocomplete/useAutocomplete.js) — 키보드 네비게이션에서 동일 패턴
- [Chakra UI Input 컴포넌트](https://github.com/chakra-ui/chakra-ui) — onKeyDown 가드
- [Slack 의 Lexical 에디터](https://lexical.dev/) — 리치 텍스트의 IME 처리 (B 안 경로)
- [Slate.js IME 핸들링 docs](https://docs.slatejs.org/concepts/03-locations) — 리치 텍스트 + IME 의 경계 문제

### 10.4 IME 동작 자체를 더 깊이

- [Mozilla Hacks — IME 와 web (구버전이지만 개념 정리에 좋음)](https://hacks.mozilla.org/2017/05/internationalize-your-keyboard-controls/)
- [Google Developers — Better keyboard accessibility with IME](https://web.dev/articles/) — IME 와 접근성
- [Apple Human Interface Guidelines — Input Methods](https://developer.apple.com/design/human-interface-guidelines/inputs) — Apple IME 의 디자인 의도 (Enter 가 "확정+전송" 두 의미를 갖는 배경)

### 10.5 대규모 서비스의 IME 회귀 사례 모음

- GitHub Issues 에서 "isComposing" 또는 "IME" 키워드로 검색하면 React/Vue/Svelte 모두에서 비슷한 회귀 보고가 수십 건. 이 문제는 모든 SPA 프레임워크의 공통 함정.
- Twitter/X 는 한때 한글 트윗에서 같은 버그가 보고됐고, 비슷한 가드로 해결됨 ([추정] — 정확한 PR 추적 어려움).
- Discord 의 채팅 입력 컴포넌트도 동일 가드 패턴 사용 (DevTools 로 직접 확인 가능).

---

## 부록 A. 디버깅 시 쓸 만한 스니펫

브라우저 콘솔에서 IME 라이프사이클을 직접 관찰하고 싶을 때:

```js
const input = document.querySelector('input[placeholder*="NPC"]');
['keydown','keyup','input','compositionstart','compositionupdate','compositionend','change']
  .forEach(t => input.addEventListener(t, (e) => {
    console.log(t, {
      key: e.key,
      isComposing: e.isComposing,
      data: e.data,
      value: input.value,
    });
  }));
```

이걸 붙여놓고 한글 "안녕" 후 Enter 를 치면 §3.2 의 시퀀스가 콘솔에 그대로 찍힌다. macOS 실기기를 보유한 검증자가 있다면 이 출력을 캡처해 보내달라고 요청하면 사후 분석 가능.

---

## 부록 B. F-3 수정의 전체 diff (참고용)

```diff
 const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
   e.stopPropagation();

+  // IME 조합 중인 키 입력은 무시한다 (F-3 macOS 한글 IME 마지막 음절 중복 입력 방지).
+  // 모던 브라우저는 `e.nativeEvent.isComposing` 으로 충분하다.
+  const native = e.nativeEvent as { isComposing?: boolean };
+  if (native.isComposing) {
+    return;
+  }
+
   if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault();
     ...
   }
 };

 const handleChange = useCallback(
   (e: ChangeEvent<HTMLInputElement>) => {
     const value = e.target.value;
     setDraft(value);

+    // IME 조합 중에는 멘션 매칭을 스킵한다 — 미확정 음절로 매칭하면 부정확.
+    const native = e.nativeEvent as { isComposing?: boolean };
+    if (native.isComposing) {
+      return;
+    }
+
     // @ 감지 ...
   },
   [mentionables],
 );
```

코드 추가량 **10 줄**. 영향 범위 **0** (IME 조합이 아닌 모든 입력은 동작 변화 없음). 회귀 테스트 **3 시나리오**. 검증 한계 **macOS 실기기 부재로 사용자 재검증 필수**.

---

> 이 노트는 F-3 트랙의 첫 학습 기록이다. 후속 피드백(F-1 모바일 터치 등) 에서 별도 노트(50번 이후) 로 이어진다.
