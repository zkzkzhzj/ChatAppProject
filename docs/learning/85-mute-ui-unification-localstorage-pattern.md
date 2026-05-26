# 85. 음소거 UI 통합 + localStorage 영속 패턴 — 별도 토글을 안 만든 이유

> 작성 시점: 2026-05-21
> 맥락: 트랙 `village-3d-audio-improvements` Step 1 (PR #105). 마스터 음량 슬라이더 도입 시 "음소거 버튼을 따로 둘 것인가, 음량 0 결박 통합할 것인가" + "음량 설정을 어디 영속화할 것인가" 두 결정. spec D1 + D3. 단순 결정처럼 보이지만 — UI 단순화 vs 빠른 토글 UX, 디바이스별 선호 vs 디바이스 간 동기화 — 트레이드오프가 분명한 결.

---

## TL;DR

- **음량 0 = 자동 음소거 결박 통합 결박** (spec D1). 별도 토글 X. 상태 둘 결박 동기화 로직 X. **빈틈: 한 번에 음소거 UX 부담 (슬라이더 끝까지 끌어내려야 함, 모바일 결박 손가락 정확도).**
- **localStorage 결박 영속** (`audio.master.volume`). 디바이스별 환경 (헤드폰 vs 스피커) 결박 다르니 디바이스 로컬이 맞음. **빈틈: 시크릿 모드 / localStorage 비활성 결박 영속 X.**
- Discord 결박 별도 음소거 버튼 + 슬라이더 분리 — voice chat 결박 빠른 토글 중요한 도메인. 환경음 결박는 다른 UX 우선순위.
- 디바이스 간 동기화 요구 발생 시 (D3 재검토 트리거) User 도메인 결박 `audio_preference` 신설 — 그때 결박 가능.

---

## 배경 — 두 결정의 분기점

PR #105 결박 마스터 음량 슬라이더 박을 때 두 가지 분기:

1. **음소거 모델 (D1)** — "별도 음소거 버튼 둘 것인가? 아니면 음량 0 결박 통합?"
2. **영속 위치 (D3)** — "음량 설정을 어디에 저장? localStorage? sessionStorage? 서버?"

둘 다 "기능 구현" 수준 결박 보면 코드 몇 줄 차이지만, 사용자 경험 + 운영 + 미래 확장 결박 영향이 분명히 다른 결.

---

## D1. 음소거 = 음량 0 통합 vs 별도 토글

### 선택지 비교

| | (A) 음량 0 = 음소거 통합 | (B) 별도 음소거 버튼 + 슬라이더 |
|--|---|---|
| UI 컴포넌트 수 | 슬라이더 1개 | 버튼 1개 + 슬라이더 1개 |
| 상태 변수 | `master: number` 1개 | `master: number` + `muted: boolean` 2개 |
| 동기화 로직 | 없음 — 0 박으면 자동 무음 | `muted=true` 시 슬라이더 disable? grey out? 동기화 필요 |
| 음소거 → 복원 UX | 슬라이더 올리면 자동 복원 | 음소거 OFF 시 마지막 음량 기억해서 복원 (별도 state) |
| 빠른 음소거 | 슬라이더 끝까지 드래그 (느림) | 버튼 한 번 (빠름) |
| 모바일 결박 손가락 | 슬라이더 정확히 0 결박 끌어내리기 부담 | 버튼 탭 1번 — 정확도 부담 X |
| 상태 불일치 가능성 | 0 ✓ | "음량 50인데 음소거 ON" 같은 어색한 상태 가능 |
| 가독성 | 슬라이더 위치 결박 음량+음소거 동시 표현 | 버튼 ON/OFF + 슬라이더 위치 결박 둘 다 확인 |
| 코드 라인 | `setMasterVolume(v)` 1개 메서드 | `setMute(b)`, `setMasterVolume(v)`, `getEffectiveVolume()` 등 메서드 ↑ |
| 디자인 결박 안식처 결박 정합 | 컨트롤 1개 결박 미니멀 — D11 결박 정합 | 컨트롤 2개 결박 시각적 부담 ↑ |

### 빈틈 비교

**(A) 통합 결박 빈틈:**

- **한 번에 음소거 UX 부담.** 슬라이더 끝까지 드래그 결박 1~2초 걸림. 갑자기 가족 들어오는 상황 결박 "빨리 끄고 싶다" 결박 부담.
- **모바일 결박 손가락 정확도.** 슬라이더 트랙 결박 작으면 정확히 0 결박 못 맞춤 (1~2 결박 남으면 미세하게 들림 → 거슬림).
- **키보드 단축키 결박 자연스럽지 않음.** "M" 결박 음소거 단축키 박으려면 슬라이더 값을 0 결박 토글하는 로직 별도 박아야 함 (다만 spec Out scope 결박 단축키는 안 박음).

**(B) 별도 토글 결박 빈틈:**

- **상태 동기화 버그 위험.** "음소거 ON 결박 슬라이더는 50 — 사용자는 50 들리는 줄 알았는데 무음" 같은 혼란.
- **이전 음량 복원 로직.** 음소거 OFF 시 어디 결박 저장된 음량 결박 돌아갈지 — 새 state (`previousVolume`) 필요. 복잡도 ↑.
- **UI 시각적 부담.** 컨트롤 2개 = 안식처 미니멀 결박 D11 결박 위반 신호 가능.

### 이 프로젝트에서 고른 것 — (A) 통합

**이유:**

1. **D11 가드 정합.** 마음의 고향 결박 안식처 결박 — 컨트롤 미니멀이 우선. 슬라이더 1개 결박 충분하면 굳이 버튼 추가 X.
2. **상태 변수 1개 = 동기화 버그 0.** "음소거 ON 결박 슬라이더 50" 같은 어색한 상태 자체가 불가능.
3. **마음의 고향의 사용 패턴 결박 빠른 음소거 빈도 낮음.** Discord 같은 voice chat 결박는 회의 결박 빨리 끄고 켜는 결박 잦음. 환경음 결박는 한 번 셋업하고 계속 들으는 결박. 빠른 토글 우선순위 ↓.
4. **음소거 → 복원 로직 자동.** 슬라이더 0 결박 자동 무음. 다시 올리면 자동 복원. 별도 state X.

### 빈틈 결박 어떻게 보완

- **모바일 결박 손가락 정확도** — 슬라이더 결박 작은 값 (1~3) 결박 자동 snap to 0 결박 보강 가능 (스펙 Out 결박 일단 안 박음). 사용자 피드백 결박 부담 보고되면 검토 (D1 재검토 트리거).
- **빠른 음소거** — 키보드 단축키 (`M` 결박 0 토글) 결박 Out scope 결박 박음 — 필요해지면 별건.

### 재검토 트리거

- 사용자 피드백 결박 "한 번 탭 결박 음소거" 요구 다수 (≥ 5건).
- voice chat / WebRTC 도입 결박 빠른 토글 중요해지는 도메인 확장.
- 모바일 슬라이더 결박 0 결박 못 맞추는 결로 거슬림 보고.

---

## D3. localStorage 영속 vs sessionStorage vs 서버

### 선택지 비교

| | (A) localStorage | (B) sessionStorage | (C) 서버 영속 (User 도메인) | (D) Cookie |
|--|---|---|---|---|
| 영속 범위 | 디바이스·브라우저 결박 영구 | 탭 닫으면 사라짐 | 계정 결박 디바이스 간 동기화 | 디바이스·브라우저 결박 영구 (만료 설정 가능) |
| 게스트 지원 | O (인증 무관) | O | X (계정 필요) | O |
| 디바이스 간 동기화 | X | X | O | X |
| 백엔드 부담 | 0 | 0 | API 결박 read/write + DB 컬럼 | 0 (Cookie 자체) |
| 시크릿 모드 | localStorage 비활성 결박 영속 X | sessionStorage 만 동작 | 정상 | Cookie 비활성 결박 영속 X |
| 코드 복잡도 | 최소 (`localStorage.getItem/setItem`) | 최소 | API client + endpoint + 마이그레이션 | 약간 — cookie parsing |
| 데이터 크기 | 5~10MB 한도 | 5~10MB 한도 | 사실상 무제한 | 4KB 한도 + 매 요청 전송 |
| 보안 | XSS 결박 노출 가능 (다만 음량 결박는 민감 X) | XSS 결박 노출 (탭 결박만) | 서버 측 보호 가능 | HttpOnly 결박 XSS 차단 가능 |
| 디바이스별 환경 적응 | O — 헤드폰 결박 작게, 스피커 결박 크게 | 탭마다 다름 — 일관성 X | X — 어디서나 같은 음량 | O |
| 운영 결박 분석 | 클라이언트 데이터 결박 안 보임 | 안 보임 | DB 결박 직접 분석 가능 | 안 보임 |

### 빈틈 비교

**(A) localStorage 빈틈:**

- 시크릿 모드 / `localStorage` 비활성 (사용자 설정 결박) — 영속 X. 매번 기본값 결박 시작 — **사용자 입장 결박 거슬림.**
- 디바이스 간 동기화 X — 데스크탑 결박 셋업한 음량이 모바일 결박는 처음부터 다시. 단점이긴 한데 **헤드폰 vs 스피커 환경 차이 결박 오히려 자연스러울 수 있음.**
- 5~10MB 한도 — 음량 값 1개 결박 무시 가능.

**(B) sessionStorage 빈틈:**

- 탭 닫으면 사라짐 — 매 세션 결박 다시 셋업. UX 부담 명확.
- 같은 사용자가 새 탭 결박 마을 들어가면 또 다시 셋업.

**(C) 서버 영속 빈틈:**

- **게스트 미지원** — 마음의 고향 결박 게스트 진입 결박 핵심 (가벼운 만남 결박 회원가입 강요 X). 게스트는 어디 결박 영속?
- 백엔드 비용 — User 도메인 결박 `audio_preference` 필드 추가 + API + 마이그레이션. 음량 1개 결박 과한 비용.
- **헤드폰 vs 스피커 환경 차이 무시** — 같은 계정 결박 데스크탑 (스피커, 크게) ↔ 모바일 (헤드폰, 작게) 결박 같은 값 사용. 사용자가 매번 조절해야 함.

**(D) Cookie 빈틈:**

- 매 요청마다 서버 결박 전송 — 정적 자산 요청까지 포함되면 대역폭 낭비.
- 4KB 한도 — 음량 1개 결박 무시 가능하지만 다른 설정 추가 시 압박.

### 이 프로젝트에서 고른 것 — (A) localStorage

**이유:**

1. **디바이스별 환경 차이 = localStorage 의 본질적 장점.** 헤드폰 결박 작게, 스피커 결박 크게 — 환경에 맞춰 따로 셋업하는 게 자연스러움.
2. **게스트 결박 동작 보장.** 마음의 고향 결박 게스트 진입 결박 핵심 — 게스트도 음량 설정 영속 필요.
3. **백엔드 비용 0.** 음량 값 1개 결박 User 도메인 손대는 건 과함. YAGNI (Critical Rule #9).
4. **민감 정보 X.** XSS 결박 음량 값 노출되어도 위험 X.

**코드 패턴:**

```ts
// AmbientSoundManager.ts 또는 React 컴포넌트 결박
const STORAGE_KEY = 'audio.master.volume';

function loadMasterVolume(): number {
  if (typeof window === 'undefined') return 1.0;  // SSR 가드
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 1.0;
    const v = Number.parseFloat(raw);
    if (!Number.isFinite(v)) return 1.0;
    return Math.max(0, Math.min(1, v));  // clamp
  } catch {
    return 1.0;  // localStorage 비활성 결박 fallback
  }
}

function saveMasterVolume(v: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    // 시크릿 모드 / quota 초과 결박 silent fail — UX 영향 X
  }
}
```

**핵심 디테일:**

- **SSR 가드** — Next.js 결박 server-side 결박 `window` 없음. `typeof window === 'undefined'` 분기 필수.
- **try/catch** — localStorage 비활성 (사용자 설정·시크릿 모드·Safari ITP 등) 결박 throw. catch 결박 silent fail.
- **clamp** — 사용자가 devtools 결박 임의 값 박았을 때 (5.0 같은) 방어. 0~1 범위 강제.
- **Number.isFinite 가드** — `NaN`, `Infinity` 결박 fallback.

### 빈틈 결박 어떻게 보완

- **시크릿 모드** — localStorage throw 결박 catch 결박 silent fail. 기본값 (1.0) 결박 시작. 사용자가 매번 셋업해야 하지만 시크릿 모드 사용 빈도 결박 낮을 거라 무시 가능 [추정].
- **디바이스 간 동기화** — 현재 안 함. 사용자 피드백 결박 요구 발생 시 D3 재검토 트리거 발동 → User 도메인 결박 `audio_preference` 신설.

### 재검토 트리거

- 디바이스 간 동기화 요구 다수 (≥ 10건) — User 도메인 결박 `audio_preference` 컬럼 + API 신설.
- 음량 외 다른 설정 (UI 테마·언어·자동 음소거 시간 등) 결박 늘어나서 묶음 관리 필요 → 별도 `userPreferences` 객체 결박 묶기.
- localStorage 비활성 사용자 결박 운영 문의 다수 — 안내 UI 박을지 검토.

---

## 시야 확장 — 다른 프로젝트는 어떻게 푸나

### 1. Discord — 별도 음소거 토글 + 슬라이더 분리

- **모델**: 마이크 음소거 (별도 버튼) + 헤드폰 음소거 (별도 버튼) + 입력/출력 음량 슬라이더 각각.
- **이유**: voice chat 결박 빠른 토글이 핵심 UX. 회의 결박 마이크 빠르게 끄고 켜는 결박 잦음. 슬라이더 드래그 결박는 못 따라감.
- **마음의 고향과의 차이**: 마음의 고향 결박 환경음 — 한 번 셋업하고 계속 듣는 결박. 빠른 토글 우선순위 ↓.

### 2. Slack — 알림음 ON/OFF 토글 + 알림음 종류 선택

- 음량 슬라이더 X. 시스템 음량 결박 결정.
- **이유**: 알림음 1초 결박 짧고 빈도 낮음. 미세 조절 불필요.

### 3. YouTube — volume API + localStorage

- 슬라이더 + 음소거 토글 둘 다 있음. 음소거 시 슬라이더 grey out + 마지막 음량 기억.
- **이유**: 영상 결박 핵심 자산 — 음량 + 음소거 둘 다 자주 사용. 빠른 토글 가치 ↑.
- localStorage 결박 영속.

### 4. Spotify (웹) — 슬라이더 + 음소거 토글

- 음소거 토글 결박 슬라이더 0 결박 박는 게 아니라 마지막 음량 기억 결박 복원.
- 디바이스 간 동기화 X — localStorage 결박 디바이스별.

### 5. ZEP / Gather.town (메타버스) — 슬라이더만 (음소거 통합) + voice chat 결박는 별도 토글

- 환경음·BGM 슬라이더만. 음소거 통합.
- voice chat 결박는 별도 마이크 토글.
- **마음의 고향과 가장 가까운 패턴.** 환경음 슬라이더만 + voice chat 후속 트랙 시 별도 토글.

### 6. 게임 (Stardew Valley · Animal Crossing)

- 설정 메뉴 결박 음악·효과음·환경음 각각 슬라이더 (3~4개).
- 음소거 별도 토글 X — 0 결박 통합.
- **로컬 저장 (게임 save file)** — 디바이스간 동기화는 cloud save 결박 별도 (Steam·Nintendo Switch Online 등).

→ **결론: 환경음 슬라이더 도메인 결박 음소거 통합 + 로컬 영속이 표준 패턴.** voice chat / 알림음처럼 빠른 토글이 중요한 도메인 결박만 별도 버튼.

### 7. localStorage 결박 함정 종합

마음의 고향 결박 직접 부딪힌 건 아니지만 알고 가야 할 결박:

- **Safari ITP (Intelligent Tracking Prevention)** — 7일 결박 미사용 자산 결박 localStorage 자동 삭제. 다만 first-party (직접 방문) 결박는 영향 적음. 마음의 고향 결박 자기 도메인 결박 안전.
- **Quota 한도** — 도메인당 5~10MB. 음량 값 1개 결박 무관하지만 후속 트랙 결박 큰 데이터 (캐릭터 커스터마이징 결박 등) 저장 시 압박.
- **동기 API** — `localStorage.setItem()` 결박 block. 자주 호출하면 main thread block. 음량 슬라이더 결박는 사용자 드래그 결박만 호출되니 무관.
- **IndexedDB 결박 대안** — 비동기 + 한도 ↑. 다만 코드 복잡도 ↑. 음량 같은 작은 값 결박 과함.

### 8. 마음의 고향의 후속 트랙 결박 영향

- **캐릭터 커스터마이징·꾸미기 자산** — localStorage 결박 한도 압박 가능. IndexedDB 또는 서버 영속 결박 가야 함.
- **계정 도메인 확장 — `userPreferences` 묶음** — 음량 + UI 테마 + 언어 + 알림 설정 결박 한 객체 결박 묶어 서버 영속. 다만 게스트 결박 분기 필요.
- **WebRTC voice chat 도입 시** — 마이크 음소거 + 헤드폰 음소거 결박 별도 토글 박을 예정 (Discord 패턴). 환경음 슬라이더와 분리.

---

## 핵심 개념 정리

### 음소거 통합 패턴의 본질

> "한 변수 결박 두 상태를 표현할 수 있다면 변수를 늘리지 마라."

- 음량 변수 (0~1) 결박 "음량 + 음소거" 두 정보 자연스럽게 표현.
- 별도 toggle 변수 박으면 동기화 의무 발생.
- **함수형 결박 derived state 원칙과 같은 결박.** `isMuted = (volume === 0)` 결박 derived — 별도 state X.

### localStorage vs 서버 영속 — 결정 기준

> "이 값이 디바이스 환경에 종속적인가 아니면 사용자 정체성에 종속적인가?"

- **디바이스 환경 종속** (음량·UI 밝기·폰트 크기) → localStorage.
- **사용자 정체성 종속** (아바타·닉네임·알림 설정) → 서버.
- **둘 다 해당** (예: 언어 설정 — 디바이스마다 다를 수도, 계정 결박 통일도 가능) → 사용자가 선택할 수 있게 둠 (이 경우 서버 결박 default + localStorage 결박 override).

음량은 명백히 디바이스 환경 종속.

---

## 실전에서 주의할 점

1. **SSR 가드 잊지 말 것.** Next.js 결박 `localStorage` 직접 접근하면 hydration mismatch. `typeof window === 'undefined'` 또는 `useEffect` 결박 클라이언트 결박만 접근.
2. **try/catch 필수.** localStorage 비활성 (시크릿 모드 일부 환경·사용자 설정·Safari ITP) 결박 throw. silent fail 결박 UX 보호.
3. **clamp + 검증.** 사용자가 devtools 결박 임의 값 박을 수 있음. `0~1` 범위 강제 + `Number.isFinite` 가드.
4. **storage event 결박 다른 탭 동기화.** 같은 도메인 다른 탭 결박 음량 바꾸면 현재 탭 결박는 자동 반영 X. `window.addEventListener('storage', ...)` 결박 처리 가능 — 다만 마음의 고향 결박 한 탭 결박만 마을 결박 들어가는 결박 기본 가정 결박 안 박음. 후속 결박 필요 시 추가.
5. **음소거 통합 결박 키보드 단축키 안 자연스러움.** `M` 토글 결박 박으려면 "0 ↔ 마지막 음량" 결박 별도 state 필요해짐 — 결국 (B) 별도 토글과 비슷한 복잡도. 단축키 도입 시 모델 재검토.
6. **모바일 슬라이더 결박 정확도.** 0 결박 정확히 맞추는 결박 손가락 결박 부담. 임시 보완: 0~3 범위 결박 snap to 0 (스펙 Out 결박 일단 안 박음).

---

## 나중에 돌아보면

- **이 선택이 틀렸다고 느끼는 시점은?** 사용자 피드백 결박 "빠른 음소거 필요" 다수 도착할 때. 그땐 (B) 별도 토글 박는 게 맞음 — 다만 슬라이더와 동기화 복잡도 받아들여야 함.
- **스케일이 바뀌면?** 사용자 수 ↑ 결박 디바이스 간 동기화 요구 증가 — User 도메인 결박 `audio_preference` 신설 (D3 재검토 트리거).
- **도메인 확장하면?** voice chat (WebRTC) 도입 — 마이크/헤드폰 별도 토글 추가 (환경음 슬라이더는 그대로 통합 유지). UI 결박 영역 분리 (환경음 / voice 두 섹션).
- **iOS PWA 결박 결박 한다면?** PWA 결박 localStorage 결박 일부 환경 결박 제한 가능 [추정 — 검증 필요]. IndexedDB 결박 대체 검토.

---

## 더 공부할 거리

- **MDN — localStorage** — [공식 문서](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). 한도·동기 API·storage event 종합.
- **Safari ITP** — [WebKit blog ITP 시리즈](https://webkit.org/blog/category/privacy/). 7일 삭제 정책 + first-party 예외.
- **IndexedDB** — [MDN 가이드](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). localStorage 한도 압박 시 대안. 비동기 + 큰 데이터.
- **derived state 원칙 (React/함수형)** — [React docs — useMemo / computed state](https://react.dev/learn/you-might-not-need-an-effect). state 변수 늘리지 말고 계산 결박 도출.
- **Apple HIG — Settings** — [공식 가이드](https://developer.apple.com/design/human-interface-guidelines/settings). 사용자 설정 영속 결박 Apple 의 사상.
- **Discord audio settings UI** — Discord 결박 음소거/슬라이더 분리 패턴 실제 화면 결박 보기. voice chat 결박 어떻게 박는지 reference.
- **ZEP / Gather.town 환경음 UI** — 메타버스 결박 환경음 슬라이더 패턴 reference. 마음의 고향과 가장 가까운 도메인.

## 관련 노트

- [84. iOS WebKit Howler html5 vs Web Audio 트레이드오프](./84-ios-webkit-howler-html5-vs-web-audio.md) — 같은 트랙. Web Audio 전환 결정. 본 노트 + 84 결박 트랙 결박 전체 그림.
- [78. Next.js + Three.js + Howler dev 메모리 폭주 진단](./78-nextjs-three-howler-dev-memory-explosion-diagnosis.md) — `MASTER_VOLUME × maxVolume` vs `maxVolume` 단일 기준 결정 (78 결정 2). 본 노트 결박 master volume 곱 적용 위치와 연결.
- [38. 12-factor Config 이관](./38-env-var-config-migration.md) — 영속 위치 결정 결박 일반 원칙 (디바이스 종속 vs 환경 종속 vs 코드 종속).

---

## 사실·이유·대안·재검토 4축 요약

- **사실**: 마스터 음량 슬라이더 도입 시 (D1) 별도 음소거 토글 X 결박 음량 0 결박 통합 + (D3) localStorage (`audio.master.volume`) 결박 영속 결정.
- **이유**:
  - D1 — 상태 변수 1개 결박 동기화 버그 0 + D11 미니멀 정합 + 마음의 고향 사용 패턴 결박 빠른 토글 우선순위 낮음.
  - D3 — 디바이스별 환경 (헤드폰 vs 스피커) 결박 차이 자연스럽게 반영 + 게스트 결박 동작 보장 + 백엔드 비용 0 + 민감 정보 X.
- **대안**:
  - D1 — 별도 토글 (Discord 패턴) — 빠른 토글 가치 ↑ 도메인 결박. 거부 (환경음 결박 우선순위 낮음).
  - D3 — 서버 영속 (User 도메인 결박 `audio_preference`) — 디바이스 간 동기화. 거부 (게스트 미지원·헤드폰 vs 스피커 환경 무시·과한 비용).
  - D3 — sessionStorage — 탭마다 다름 결박 UX 부담. 거부.
  - D3 — Cookie — 매 요청 전송 결박 대역폭 낭비. 거부.
- **재검토 트리거**:
  - D1 — "한 번 탭 음소거" 요구 다수 / voice chat 도메인 확장 / 모바일 슬라이더 정확도 결박 문제 보고.
  - D3 — 디바이스 간 동기화 요구 다수 → User 도메인 `audio_preference` 신설 / 음량 외 설정 결박 묶음 관리 필요 → `userPreferences` 객체 / localStorage 비활성 사용자 운영 문의 다수.
