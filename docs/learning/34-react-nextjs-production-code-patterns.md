# 34. React + Next.js App Router 프로덕션 코드 패턴 — 백엔드 개발자가 프론트를 제대로 쓰기 위한 핵심 정리

> 작성 시점: 2026-04-15
> 맥락: "마음의 고향" 프론트엔드(Next.js 16 + React 19 + Tailwind v4)를 작성하면서, 백엔드(Java/Spring) 경험만 있는 상태에서 실제 코드에서 발견된 안티패턴을 기반으로 올바른 패턴을 정리한다.

---

## 배경

백엔드 개발자가 React/Next.js 코드를 작성할 때, "동작은 하지만 프로덕션 코드가 아닌" 패턴을 쓰기 쉽다. Spring에서 `@Controller`에 비즈니스 로직을 다 넣는 것과 비슷한 실수를 React에서도 한다. 이 노트는 우리 프로젝트에서 실제로 겪은 문제를 중심으로, Next.js App Router 환경에서의 올바른 패턴을 정리한다.

---

## 1. 우리 코드에서 발견된 문제와 수정

### 문제 1: metadata를 `'use client'` 컴포넌트에서 `<head>` 태그로 직접 작성

**Before (안티패턴)**
```tsx
'use client';

export default function Page() {
  return (
    <>
      <head>
        <title>마음의 고향</title>
        <meta name="description" content="..." />
      </head>
      {/* ... */}
    </>
  );
}
```

**After (현재 코드 — layout.tsx)**
```tsx
// Server Component (기본값이므로 'use client' 없음)
export const metadata: Metadata = {
  title: '마음의 고향 — 대화가 그리운 사람을 위한 마을',
  description: '누군가의 온기가 필요할 때...',
  openGraph: { title: '마음의 고향', type: 'website' },
};
```

**왜 이게 중요한가:**
- Next.js가 `metadata` export를 읽어서 `<head>`를 자동 생성한다. 중복 태그 방지, 스트리밍 SSR과의 호환, 정적 분석이 모두 이 메커니즘에 의존한다.
- `<head>` 태그를 직접 쓰면 Next.js의 메타데이터 병합 로직을 우회하게 되어, 하위 페이지에서 `metadata`를 override할 때 충돌이 생긴다.
- `'use client'` 컴포넌트에서는 `metadata` export 자체가 작동하지 않는다. 이건 Server Component 전용 기능이다.

---

### 문제 2: Google Fonts를 `<link>` 태그로 로드

**Before (안티패턴)**
```tsx
<link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap" rel="stylesheet" />
```

**After (현재 코드 — layout.tsx)**
```tsx
import { Gowun_Dodum, IBM_Plex_Sans_KR } from 'next/font/google';

const gowunDodum = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
```

**왜 이게 중요한가:**
- `next/font`는 빌드 타임에 폰트 파일을 다운로드해서 셀프호스팅한다. Google Fonts CDN으로 가는 네트워크 요청이 0개가 된다.
- FOIT(Flash of Invisible Text)를 방지한다. `display: 'swap'`과 조합하면 시스템 폰트로 먼저 보여주고, 폰트 로드 후 교체한다.
- 한글 폰트는 파일 크기가 크지만, `next/font`가 자동으로 유니코드 레인지별로 슬라이싱한다. 필요한 글리프만 로드해서 초기 로딩을 줄인다.
- `variable` 옵션으로 CSS 변수를 만들면, Tailwind의 `@theme`에서 `--font-display`로 참조할 수 있다.

---

### 문제 3: 인라인 style과 Tailwind 혼용

**Before (안티패턴)**
```tsx
<div style={{ backgroundColor: '#d4e8d0' }} className="rounded-2xl px-3 py-2">
```

**After (현재 코드)**
```css
/* globals.css */
@theme inline {
  --color-bubble-npc: var(--color-bubble-npc);  /* #d4e8d0 */
}
```
```tsx
<div className="bg-bubble-npc rounded-2xl px-3 py-2">
```

**왜 이게 중요한가:**
- 인라인 style은 Tailwind의 퍼지(tree-shaking)와 독립적이라 일관성이 깨진다. 어떤 색은 클래스로, 어떤 색은 인라인으로 — 나중에 테마를 바꿀 때 두 군데를 다 고쳐야 한다.
- Tailwind v4의 `@theme` 디렉티브에 디자인 토큰을 등록하면, `bg-cream`, `text-bark` 같은 시맨틱한 유틸리티 클래스가 자동 생성된다.
- **예외:** `style={{ width: chatWidth }}` 같은 **런타임에 계산되는 동적 값**은 인라인 style이 맞다. Tailwind 클래스는 빌드타임에 결정되므로 `width: 423px` 같은 값은 클래스로 표현할 수 없다.

---

### 문제 4: 리사이즈 로직이 컴포넌트 안에 80줄

**Before (안티패턴)**
```tsx
export default function ChatOverlay() {
  const [height, setHeight] = useState(240);
  const isResizing = useRef(false);
  
  const onMouseDown = (e) => {
    isResizing.current = true;
    const startY = e.clientY;
    const startHeight = height;
    const onMouseMove = (ev) => { /* ... */ };
    const onMouseUp = () => { /* ... */ };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  // ... X축도 비슷하게 반복 ...
}
```

**After (현재 코드)**
```tsx
// hooks/useResize.ts — 한 훅이 한 가지 일만 한다
export function useResize(axis: ResizeAxis, { min, max, initial }: UseResizeOptions)
  : [number, (e: React.MouseEvent) => void] { /* ... */ }

// ChatOverlay.tsx — 깔끔
const [chatHeight, startResizeY] = useResize('y', CHAT_HEIGHT);
const [chatWidth, startResizeX] = useResize('x', CHAT_WIDTH);
```

**왜 이게 중요한가:**
- 컴포넌트의 역할은 "무엇을 보여줄지"이다. "마우스 좌표를 추적해서 높이를 계산하는 것"은 컴포넌트의 관심사가 아니다.
- 커스텀 훅으로 분리하면 X축/Y축 리사이즈를 같은 로직으로 재사용할 수 있다. 위 코드에서 `useResize('y', ...)`, `useResize('x', ...)`로 두 번 호출한 것이 그 예시다.
- Spring으로 비유하면, Service 레이어를 분리하지 않고 Controller에 비즈니스 로직을 다 넣는 것과 같은 문제다.

---

### 문제 5: 중첩 try/catch

**Before (안티패턴)**
```tsx
try {
  await register(email, password);
} catch {
  try {
    await login(email, password);
  } catch {
    setError('실패');
  }
}
```

**After (현재 코드 — LoginPrompt.tsx)**
```tsx
async function authenticate(email: string, password: string): Promise<string> {
  try {
    const { data } = await apiClient.post('/api/v1/auth/register', { email, password });
    return data.accessToken;
  } catch {
    // 회원가입 실패(이미 가입됨 등) → 로그인 시도
  }
  const { data } = await apiClient.post('/api/v1/auth/login', { email, password });
  return data.accessToken;
}

// 사용하는 쪽은 단일 try/catch
try {
  const token = await authenticate(email, password);
  localStorage.setItem('accessToken', token);
} catch {
  setError('로그인에 실패했습니다.');
}
```

**왜 이게 중요한가:**
- 중첩 try/catch는 읽기 어렵고, 어디서 에러가 발생했는지 추적이 힘들다.
- "회원가입 시도 → 실패하면 로그인"이라는 **비즈니스 로직**을 헬퍼 함수로 캡슐화하면, 호출하는 쪽은 "인증"이라는 추상화만 알면 된다.
- 함수 이름(`authenticate`)이 의도를 드러낸다. 코드만 봐도 "아, 회원가입/로그인을 한 번에 처리하는구나"를 알 수 있다.

---

## 2. Next.js App Router 핵심 원칙

### Server Component가 기본이다

Next.js App Router에서 모든 컴포넌트는 기본적으로 Server Component다. `'use client'`를 명시적으로 선언해야 Client Component가 된다.

```
Server Component (기본)
├── DB 직접 조회 가능
├── 파일시스템 접근 가능
├── metadata export 가능
├── 번들 크기에 포함되지 않음
└── useState, useEffect 사용 불가

Client Component ('use client' 선언)
├── 이벤트 핸들러 (onClick 등)
├── 상태 관리 (useState, useReducer)
├── 브라우저 API (localStorage, window)
├── 라이프사이클 (useEffect)
└── 번들에 포함됨 → 크기 관리 필요
```

**실전 원칙: 'use client' 경계를 가능한 한 아래로 밀어내라.**

우리 코드에서도 `page.tsx`는 Server Component이고, `ChatOverlay`만 `'use client'`다. 만약 `page.tsx`에 `'use client'`를 붙이면, 그 아래 모든 import가 Client Component 번들에 포함된다.

```
page.tsx (Server) ← 여기는 'use client' 없음
├── GameLoader.tsx (Client) ← Phaser는 브라우저 API 필요
└── ChatOverlay.tsx (Client) ← 상태 + 이벤트 핸들러 필요
```

### metadata export는 Server Component 전용

```tsx
// layout.tsx 또는 page.tsx (Server Component)
export const metadata: Metadata = {
  title: '페이지 제목',
  description: '설명',
};
```

- 하위 페이지의 `metadata`가 상위를 자동 병합(override)한다.
- 동적 메타데이터가 필요하면 `generateMetadata()` async 함수를 쓴다.

### next/font — 폰트는 빌드타임에 해결한다

```tsx
import { Gowun_Dodum } from 'next/font/google';

const font = Gowun_Dodum({
  weight: '400',
  subsets: ['latin'],    // 한글은 자동 슬라이싱
  variable: '--font-display',
  display: 'swap',
});

// html 태그에 className으로 적용
<html className={font.variable}>
```

- CLS(Cumulative Layout Shift) 방지: 폰트 로드 전후로 레이아웃이 밀리는 현상을 줄인다.
- 프라이버시: Google 서버로 사용자 요청이 가지 않는다.

### 'use cache' — Next.js 16의 명시적 캐싱

Next.js 15까지는 `fetch()`가 기본적으로 캐싱되었다. 16에서는 이 동작이 뒤집어져서, 캐싱이 필요하면 명시적으로 `'use cache'` 디렉티브를 선언해야 한다.

```tsx
'use cache';

export default async function CachedPage() {
  const data = await fetch('/api/data');  // 이제 캐싱됨
  return <div>{/* ... */}</div>;
}
```

이건 React의 `'use client'`와 비슷한 패턴이다. **명시적 opt-in이 암묵적 default보다 예측 가능하다**는 철학.

---

## 3. Tailwind v4 디자인 토큰 관리

### tailwind.config.js는 없다

Tailwind v4는 설정 파일 대신 CSS 파일에서 직접 테마를 정의한다. `@theme` 디렉티브가 그 역할을 한다.

```css
/* globals.css */
@import 'tailwindcss';

:root {
  --color-cream: #faf6f0;
  --color-bark: #5c4a3a;
  --color-leaf: #6a9c5b;
}

@theme inline {
  --color-cream: var(--color-cream);
  --color-bark: var(--color-bark);
  --color-leaf: var(--color-leaf);
  --font-sans: var(--font-body), 'Apple SD Gothic Neo', sans-serif;
}
```

이렇게 등록하면 `bg-cream`, `text-bark`, `border-leaf` 같은 유틸리티 클래스가 자동으로 사용 가능해진다.

### 인라인 style을 쓰는 것과 쓰지 않는 것의 기준

| 상황 | 사용할 것 |
|------|----------|
| 디자인 시스템의 고정 색상/간격 | `@theme` 토큰 → Tailwind 클래스 (`bg-cream`) |
| 런타임 동적 값 (드래그 리사이즈 등) | `style={{ width: chatWidth }}` |
| 서버에서 내려오는 사용자 커스텀 값 | CSS 변수 + `style={{ '--user-color': color }}` |

**원칙:** "빌드타임에 알 수 있는 값은 클래스, 런타임에만 알 수 있는 값은 style"

---

## 4. 커스텀 훅 패턴

### 한 훅 = 한 관심사 (SRP)

Spring의 Service 클래스처럼, 훅도 단일 책임을 가져야 한다.

```
// 나쁜 예 — 하나의 훅이 너무 많은 일을 한다
useChat() → 메시지 구독 + 리사이즈 + 입력 포커스 + 로그인 상태

// 좋은 예 — 각 훅이 한 가지 관심사
useStomp()        → WebSocket 연결 + 메시지 구독
useResize('y')    → Y축 드래그 리사이즈
useChatStore()    → 채팅 상태 관리 (Zustand)
```

### 반환값 컨벤션

```tsx
// 반환값 2개 이하 → 배열 (순서로 구분, 이름 자유롭게 지정 가능)
const [value, startResize] = useResize('y', options);

// 반환값 3개 이상 → 객체 (이름으로 구분)
const { messages, sendMessage, connectionStatus } = useChat();
```

배열 반환은 React의 `useState`가 `[state, setState]`를 반환하는 것과 같은 컨벤션이다. 호출하는 쪽에서 이름을 자유롭게 지을 수 있다는 장점이 있다.

### 작은 훅 조합으로 큰 훅 구성

```tsx
// 작은 훅들
function useStompConnection() { /* 연결 관리 */ }
function useMessageSubscription() { /* 메시지 구독 */ }

// 조합 훅
function useStomp() {
  useStompConnection();
  useMessageSubscription();
}
```

이건 함수 합성(composition)의 React 버전이다. 상속이 아니라 조합으로 기능을 확장한다.

---

## 5. 함수형 프로그래밍 원칙 — React에서 왜 중요한가

React는 근본적으로 함수형 프로그래밍 패러다임 위에 만들어졌다. 백엔드에서 OOP에 익숙하다면, 이 사고방식의 전환이 필요하다.

### 불변성 (Immutability)

```tsx
// 나쁜 예 — state를 직접 변경
messages.push(newMessage);
setMessages(messages);  // React가 변경을 감지하지 못한다!

// 좋은 예 — 새 배열을 만들어서 교체
setMessages([...messages, newMessage]);
// 또는
setMessages(prev => [...prev, newMessage]);
```

**왜:** React는 참조 비교(`===`)로 리렌더링 여부를 결정한다. 같은 배열 참조에 값만 추가하면 "변경 없음"으로 판단해서 화면이 안 바뀐다. Java의 `List.copyOf()` 패턴과 비슷하게 생각하면 된다.

### 컴포넌트는 순수 함수다

```
같은 props → 항상 같은 JSX

function ChatBubble({ message }: ChatBubbleProps) {
  // message가 같으면 항상 같은 UI를 반환해야 한다
  // 전역 변수를 읽거나, 랜덤 값을 쓰면 순수하지 않다
}
```

사이드 이펙트(API 호출, 타이머, DOM 조작)는 `useEffect` 안에 격리한다. 렌더링 함수 본문에서 직접 실행하지 않는다.

### 합성 (Composition)

```tsx
// 데이터 변환 파이프라인
const visibleMessages = messages
  .filter(m => !m.deleted)
  .sort((a, b) => a.timestamp - b.timestamp)
  .slice(-50);
```

Spring의 Stream API와 거의 동일한 패턴이다. 배열 메서드 체이닝이 React 코드에서 매우 자주 등장한다.

### 커링 (Currying) — 이벤트 핸들러에서 유용

```tsx
// 커링: 인자를 부분 적용하여 새 함수를 반환
const handleClick = (id: string) => (e: React.MouseEvent) => {
  console.log(id, e.target);
};

// 사용
<button onClick={handleClick('item-1')}>아이템 1</button>
<button onClick={handleClick('item-2')}>아이템 2</button>
```

리스트에서 각 아이템마다 다른 인자를 넘겨야 할 때 유용하다. 매번 `() => handleClick('item-1')`로 래핑하는 것보다 깔끔하다.

---

## 6. 에러 처리 패턴

### Error Boundary — 렌더링 에러

App Router에서는 `error.tsx` 파일을 만들면 자동으로 Error Boundary가 된다.

```
app/
├── layout.tsx
├── page.tsx
├── error.tsx      ← 이 페이지의 렌더링 에러를 잡는다
└── global-error.tsx  ← layout 수준 에러를 잡는다
```

Java의 `@ExceptionHandler`와 비슷한 역할이다. 각 라우트 세그먼트마다 에러 경계를 설정할 수 있다.

### Result 패턴 — 중첩 try/catch 대안

```tsx
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// 사용하는 쪽 — try/catch 없이 분기 처리
const result = await fetchUser('123');
if (!result.ok) {
  showError(result.error);
  return;
}
const user = result.data;  // TypeScript가 타입을 좁혀준다
```

이건 Rust의 `Result<T, E>`나 Kotlin의 `Result<T>`와 같은 패턴이다. 에러를 예외가 아닌 값으로 다루면 흐름이 선형적이 되어 읽기 쉽다.

### Suspense + ErrorBoundary — 선언적 데이터 페칭

```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Skeleton />}>
    <UserProfile id={userId} />  {/* 내부에서 async 데이터 로드 */}
  </Suspense>
</ErrorBoundary>
```

명령형("데이터 로딩 중이면 스피너 보여주고, 에러면 에러 메시지...")이 아니라, 선언형("로딩 상태는 이것, 에러 상태는 이것")으로 처리한다.

---

## 7. 컴포넌트 설계 가이드

### 분리 기준

| 신호 | 의미 |
|------|------|
| 한 문장으로 역할을 설명 못 한다 | 분리해야 한다 |
| 200줄 이상 | 분리를 고려해야 한다 |
| Props가 10개 이상 | 너무 많은 책임을 지고 있다 |
| 같은 JSX 블록이 반복된다 | 추출할 컴포넌트가 있다 |
| 조건부 렌더링이 3단 이상 중첩 | 각 분기를 별도 컴포넌트로 |

### 우리 프로젝트의 컴포넌트 구조 예시

```
ChatOverlay (컨테이너 — 레이아웃 + 상태 조율)
├── ChatMessageList (메시지 목록 표시)
│   └── ChatBubble (개별 메시지 — 순수한 표시 컴포넌트)
├── ChatInput (입력 + 전송)
└── LoginPrompt (로그인 모달)
```

각 컴포넌트의 역할을 한 문장으로:
- **ChatOverlay**: 채팅 영역의 레이아웃과 리사이즈를 관리한다.
- **ChatMessageList**: 메시지 배열을 받아서 스크롤 가능한 목록으로 보여준다.
- **ChatBubble**: 하나의 메시지를 발신자 유형에 따라 스타일링해서 보여준다.
- **ChatInput**: 텍스트 입력과 전송을 처리한다.
- **LoginPrompt**: 미인증 사용자에게 로그인 UI를 보여준다.

### Compound Component 패턴 — 남용하지 말 것

```tsx
// Compound Component — 사용 패턴이 다양할 때만
<Tabs>
  <Tabs.List>
    <Tabs.Tab>탭 1</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel>내용 1</Tabs.Panel>
</Tabs>
```

이 패턴은 라이브러리 수준의 범용 컴포넌트를 만들 때 유용하다. 프로젝트 내부 컴포넌트에서는 대부분 과한 추상화다. "이 컴포넌트를 3가지 이상 다른 방식으로 조합해서 쓸 일이 있는가?"를 먼저 물어보라.

---

## 실전에서 주의할 점

1. **'use client' 전염**: Client Component가 import하는 모든 것은 클라이언트 번들에 들어간다. 무거운 라이브러리(날짜, 마크다운 파서 등)를 Client Component에서 import하면 번들이 급격히 커진다.

2. **useEffect 남용**: "마운트 시 데이터 로드"를 `useEffect`로 하는 건 React 18 이전 패턴이다. App Router에서는 Server Component에서 직접 `fetch`하거나, `use()` 훅 + Suspense를 쓰는 것이 권장된다.

3. **Zustand selector 최적화**: `useChatStore((s) => s.isInputFocused)` 같이 필요한 값만 선택해야 한다. `useChatStore()` 전체를 가져오면 store의 아무 값이 바뀔 때마다 리렌더링된다.

4. **`window` / `localStorage` 접근**: Server Component에서 브라우저 API에 접근하면 에러가 난다. `useSyncExternalStore`로 SSR-safe하게 접근하는 패턴이 우리 코드(`ChatInput.tsx`)에 이미 적용되어 있다.

5. **TypeScript를 제대로 쓸 것**: `any` 타입은 TypeScript의 의미를 없앤다. 우리 코드에서 `ChatMessage` 타입을 정의하고, `resolveSender` 함수의 반환 타입이 자동 추론되는 것이 좋은 예시다.

---

## 나중에 돌아보면

- **프로젝트 규모가 커지면** 파일 기반 라우팅만으로 부족해지고, route groups(`(group)`)와 parallel routes를 적극 활용해야 한다.
- **컴포넌트 수가 50개를 넘기면** 디자인 시스템(Storybook)이 필요해진다. 지금은 과한 투자지만, UI 컴포넌트가 늘어나면 고려할 시점이다.
- **상태 관리가 복잡해지면** Zustand 하나로 버티다가 server state(TanStack Query)와 client state(Zustand)를 명확히 분리해야 하는 시점이 온다. "서버에서 온 데이터"와 "UI에서만 쓰는 상태"를 같은 store에 넣으면 캐시 무효화가 지옥이 된다.
- **실시간 기능이 늘어나면** WebSocket 메시지 타입별로 핸들러를 분리하고, 메시지 스키마 검증(zod 등)이 필요해진다.

---

## 더 공부할 거리

### 공식 문서 (최우선)
- [Next.js 공식 문서](https://nextjs.org/docs) — App Router, Server Components, Caching
- [React 공식 문서 (한글)](https://ko.react.dev) — 특히 "Escape Hatches" 섹션이 useEffect 남용을 방지해줌
- [Tailwind v4 Theme](https://tailwindcss.com/docs/theme) — `@theme` 디렉티브, CSS-first 설정
- [Next.js 16 블로그](https://nextjs.org/blog/next-16) — `'use cache'`, Turbopack 기본 적용

### 패턴 / 아키텍처
- [patterns.dev](https://www.patterns.dev/react) — React 디자인 패턴 시각적 가이드
- [React 19 블로그](https://react.dev/blog/2024/12/05/react-19) — Actions, useOptimistic, use()
- [Bulletproof React](https://github.com/alan2207/bulletproof-react) — 프로덕션 React 프로젝트 구조 예시

### 깊이 파고들기
- [Kent C. Dodds 블로그](https://kentcdodds.com/blog) — "AHA Programming", 커스텀 훅 패턴, 테스팅
- [Dan Abramov (overreacted.io)](https://overreacted.io) — React 멘탈 모델의 핵심. 특히 "A Complete Guide to useEffect"
- [Josh W. Comeau 블로그](https://www.joshwcomeau.com) — CSS + React 시각적 설명이 뛰어남

### 관련 학습노트
- [26. Phaser HTML 키보드 포커스 충돌](./26-phaser-html-keyboard-focus-conflict.md) — 게임 엔진과 React 입력이 충돌하는 문제
- [20. Frontend ESLint 컨벤션](./20-frontend-eslint-convention.md) — 프론트엔드 린팅 설정
- [32. 웹 2D 게임 엔진 비교](./32-web-2d-game-engine-comparison.md) — Phaser 선택 배경
