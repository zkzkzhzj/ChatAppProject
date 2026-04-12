# 20. 프론트엔드 ESLint 컨벤션 선택 — Airbnb 사망 이후의 대안

## 배경

Next.js 16 + TypeScript + React 19 프로젝트에서 ESLint 설정을 강화해야 했다. Next.js 기본값(`eslint-config-next`)만으로는 코드 스타일과 타입 안전성 규칙이 부족하다. 특히 `any` 타입 허용, `Promise` 미처리, non-null assertion 남용 같은 패턴을 잡아내지 못한다.

기존에는 Airbnb 컨벤션이 사실상 표준이었지만, ESLint 9의 flat config 전환 이후 상황이 달라졌다.

## ESLint 컨벤션 선택

### 후보 비교

| 방식 | 장점 | 단점 |
|------|------|------|
| A. eslint-config-airbnb | 가장 유명한 JS/TS 컨벤션. 커뮤니티 레퍼런스 풍부 | ESLint 9 flat config 미지원. `eslint-config-airbnb-typescript`는 2025-05 아카이브됨. 대안인 `eslint-config-airbnb-extended`는 커뮤니티 규모 작고 검증 부족 |
| **B. typescript-eslint/strictTypeChecked (선택)** | `recommended`보다 강한 규칙셋. 타입 시스템 기반 규칙으로 런타임 버그를 컴파일 타임에 차단 | `parserOptions.projectService: true` 필수. lint 속도가 약간 느려짐 |
| C. Biome | ESLint + Prettier 대체를 목표로 하는 Rust 기반 도구. 빠름 | 생태계가 아직 작고, Next.js 공식 지원이 부족. 플러그인 확장이 제한적 |

### 선택: B (typescript-eslint/strictTypeChecked)

**이유:**
1. `eslint-config-next/typescript`가 이미 `recommended`를 포함하므로, `strictTypeChecked`를 추가하면 **겹치지 않고 strict 규칙만 추가된다.**
2. Airbnb가 제공하던 핵심 가치(안전한 코드 작성)를 타입 시스템 레벨에서 더 정확하게 대체한다.
3. TypeScript 공식 팀이 유지보수하므로 장기 지원이 보장된다.

**주요 규칙:**
- `no-floating-promises` — 처리되지 않은 Promise를 잡는다. `await`, `.catch()`, `.then()`, 또는 `void` 처리 필수.
- `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-return` — `any` 타입이 전파되는 것을 차단한다.
- `prefer-nullish-coalescing` — `||` 대신 `??` 사용을 강제한다. `0`, `""`, `false`가 falsy로 처리되는 버그를 예방.
- `no-confusing-void-expression` — `void`를 반환하는 표현식이 값으로 사용되는 것을 방지한다.

## Import 정렬 선택

| | eslint-plugin-import | eslint-plugin-import-x | eslint-plugin-simple-import-sort |
|---|---|---|---|
| 의존성 | 117개 | 16개 | 0개 |
| ESLint 9 | 미지원 → 호환 레이어 필요 | 네이티브 | 네이티브 |
| autofix | 부분 | 부분 | 완전 |
| 기능 범위 | 전체 (순환참조 탐지 등) | 전체 | 정렬만 |

### 선택: simple-import-sort

**이유:** 정렬만 필요했다. 순환참조 탐지 같은 고급 기능은 현재 규모에서 불필요하고, 의존성 0개가 결정적이었다. autofix가 완전히 동작하므로 저장 시 자동 정렬된다.

**그룹 순서:**
```
react          → import React from "react"
next           → import Link from "next/link"
외부(@?\w)     → import axios from "axios"
내부(@/)       → import { api } from "@/lib/api"
상대(./)       → import { Button } from "./Button"
스타일(.css)   → import "./globals.css"
```

## Prettier 컨벤션

현재 설정은 Airbnb 컨벤션 기반에 Prettier 3.x 기본값을 조합한 형태다.

**Airbnb 원본과의 차이:**
- `printWidth: 100` (Airbnb는 80) — 현대 모니터 해상도를 고려하면 80은 너무 좁다.
- `endOfLine: "lf"` (Airbnb는 `auto`) — Windows 환경에서 CRLF가 섞이는 것을 방지.

Next.js 공식은 Prettier 설정을 제공하지 않는다. 개발자 재량이므로 팀 컨벤션으로 고정한다.

## React 19 ESLint 변경사항

React 19에서 `eslint-plugin-react-hooks`에 React Compiler 규칙이 추가되었다. `useMemo`, `useCallback`의 불필요한 사용을 탐지하고, Compiler가 자동 최적화할 수 있는 패턴을 안내한다.

`eslint-config-next`가 이미 이 플러그인을 포함하므로 별도 설치는 불필요하다.

## 실전에서 주의할 점

### parserOptions.projectService 설정

`strictTypeChecked`는 타입 정보를 기반으로 lint하므로 `parserOptions.projectService: true`가 필수다. 이 설정이 없으면 타입 기반 규칙이 전부 무시된다.

주의: `tsconfig.json`의 `include`에 lint 대상 파일이 포함되어야 한다. `tsconfig.json`에서 제외된 파일은 "not part of any TypeScript project" 에러가 난다.

### no-misused-promises와 React 이벤트 핸들러

```tsx
// 이 패턴이 위반으로 잡힌다
<button onClick={async () => { await submitForm(); }}>전송</button>
```

React의 `onClick`은 `void`를 반환하는 함수를 기대하지만, `async` 함수는 `Promise<void>`를 반환한다. `checksVoidReturn.attributes: false`로 JSX 속성에서의 검사를 비활성화해야 한다.

### non-null assertion(!) 제거

```typescript
// Before — strictTypeChecked가 잡는다
const keyboard = this.input.keyboard!;
keyboard.createCursorKeys();

// After — null guard 패턴
const keyboard = this.input.keyboard;
if (!keyboard) return;
keyboard.createCursorKeys();
```

non-null assertion은 "나는 이게 null이 아님을 안다"는 개발자의 주장이지만, 런타임에서 보장되지 않는다. null guard로 바꾸면 실제로 null인 경우에도 안전하다.

### any 타입 에러 처리

```typescript
// Before — any 타입이 전파된다
} catch (error) {
  if (error.response) {
    return error.response.data;
  }
}

// After — 타입 가드 사용
} catch (error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data;
  }
}
```

`catch`의 `error`는 `unknown`으로 받고, 타입 가드로 좁혀야 한다. `any`로 받으면 `no-unsafe-member-access`가 잡는다.

### nullish coalescing assignment (??=)

```typescript
// Before
if (!stompClient) stompClient = createClient();

// After
stompClient ??= createClient();
```

`??=`는 값이 `null` 또는 `undefined`일 때만 할당한다. `||=`와 달리 `0`, `""`, `false`를 유효한 값으로 취급한다.

## 교훈

1. **Airbnb 컨벤션은 ESLint 9 시대에서 더 이상 선택지가 아니다.** 아카이브된 패키지에 의존하면 보안 패치도 받지 못한다. `typescript-eslint/strictTypeChecked`가 타입 안전성 측면에서 더 강력한 대안이다.
2. **Import 정렬 도구는 기능 범위를 따져야 한다.** 정렬만 필요하면 의존성 0개인 `simple-import-sort`가 최선이다. "혹시 나중에 쓸까" 싶어서 117개 의존성을 끌어오지 않는다.
3. **strictTypeChecked 도입 시 React 이벤트 핸들러 패턴과 충돌한다.** `no-misused-promises`의 `checksVoidReturn.attributes: false`는 사실상 필수 설정이다. 이걸 모르면 모든 `async onClick`에서 위반이 나와서 "이 규칙 쓸 수 없다"고 오해한다.
4. **non-null assertion을 null guard로 바꾸는 건 귀찮지만, 런타임 NPE를 컴파일 타임에 차단하는 확실한 방법이다.** `!`를 쓸 때마다 "이게 정말 null이 아닌가?"를 질문하는 습관을 들인다.
