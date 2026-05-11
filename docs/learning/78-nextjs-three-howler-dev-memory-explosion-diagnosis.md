# 78. Next.js + Three.js + Howler dev 서버 Node heap 폭주 진단기 — `.next` 캐시 손상이 진짜 범인이었다

> 작성 시점: 2026-05-11
> 맥락: 트랙 `village-3d` Step 2 (환경음 통합, `feat/village-3d-step2-ambient-sound`). dev 서버 띄울 때 Node 프로세스가 RAM 폭식해서 사용자 컴퓨터가 두 번 강제 종료된 사건의 진단·복구 절차 기록.

---

## TL;DR

사실 한 줄 요약:

- 가설 4개 세우고 그 중 D (lockfile 두 개) + H (Howler 호환성) 박는 fix 적용 → **여전히 폭주**.
- `.next` 디렉토리가 **254MB** (정상: 수십 MB) → **이전 Turbopack `internal error` 시점의 손상 캐시**가 진짜 범인.
- `rd /s /q frontend\.next` + dev 재기동 → 정상.
- 부수적으로 박힌 fix 4개도 의미는 있다 (실제로 leak 위험을 차단함). 다만 **이번 사건의 root cause는 아니었다.**

---

## 배경 — 무슨 일이 있었나

트랙 `village-3d`는 Phaser 2D → Three.js 3D 전환 결정 (learning 72) 후 처음으로 본질 가치 4축 중 "환경음" (D6 v 축)을 박은 step이다. 자산 흐름:

1. Step 1 — Three.js PoC. Scene 두 개 (Village/Library), 카메라 follow, 캐릭터 이동, fade 전환. 정상.
2. Step 2 — Howler.js 도입. 사운드 4개 (마을) + 1개 (도서관, 공유 자산 1개), 위치 기반 음량 모델 3종 (global / point / forest-edge).

Step 2 코드 작성 후 dev 서버를 띄우자 Node 프로세스가 **RAM을 무한 잡아먹어 시스템이 두 번 강제 종료**됐다. 브라우저는 열어보지도 못한 상태로 dev 서버 자체가 폭주.

사용자가 결정적 단서를 줬다:

> "Step 1 까지는 정상이었음. Step 2 (Howler 추가) 후부터 폭주."

이 시점에서 알 수 있는 것:

- **dev 서버 (Node) 측 문제**. 브라우저 leak이 아님 (브라우저를 열지도 못함).
- **Step 2의 변경분이 트리거**. Howler 도입, AmbientSoundManager, sound-config, mp3 자산 4개, SceneManager 통합 — 이 중 하나가 dev 시점에 폭주를 부른다.

---

## 진단 가설 4개 — 세운 순서대로

코드를 Read하고 가능한 원인 후보를 도출했다.

### A. Three.js Geometry/Material `dispose()` 누락 (브라우저 leak)

- 가설: React Strict Mode가 dev에서 useEffect를 mount/unmount/mount 결로 두 번 실행한다. 첫 SceneManager 인스턴스가 dispose되지 않으면 Geometry·Material이 GPU·JS heap에 누적.
- 반박: 이건 **브라우저** leak이다. Node 폭주를 설명 못 함. 다만 진짜 leak 위험은 있어서 fix는 박는 게 맞음.

### B. AmbientSoundManager unlock 리스너 cleanup 누락

- 가설: `window.addEventListener('click'/'keydown'/'touchstart', unlock)` 를 박은 뒤, unlock이 트리거되기 전에 unmount되면 리스너가 그대로 누적. Strict Mode dev에서 매 mount마다 3개씩 쌓임.
- 반박: 이것도 **브라우저** 측 leak. 그리고 작은 양 (리스너 몇 개) — Node 폭주 원인 아님.

### D. Turbopack workspace root 오인식 (두 lockfile)

- 가설: Next 16 + Turbopack은 lockfile을 보고 workspace root를 결정한다. 이 프로젝트는:
  - `ChatAppProject-ui/package-lock.json` (husky 전용, 루트)
  - `ChatAppProject-ui/frontend/package-lock.json` (실제 Next 앱)
  - Turbopack이 루트를 잘못 선택하면 의존성 그래프가 잘못된 범위까지 확장되어 재계산 폭주 가능.
- 신빙성: 높음. Next 16 출시 직후 비슷한 보고가 있었다 [추정].

### H. howler 라이브러리 + Turbopack 호환성

- 가설: howler는 UMD 패턴 + Audio context dynamic feature detection을 쓴다. ES module 전용 분석을 가정하는 Turbopack이 모듈 그래프 분석에서 무한 재컴파일 루프에 빠질 가능성.
- 신빙성: 중간. 정확한 메커니즘은 모름. `transpilePackages` 로 미리 변환·캐싱하면 우회 가능 [추정].

### 가설 좁히기

사용자의 시점 단서 ("Step 2 후부터") 결로:

- A, B는 브라우저 leak — Node 폭주를 설명 못 함. **제외**.
- D + H가 가장 유력. Step 2에서 howler가 추가됐고, 의존성 그래프가 변경된 게 사실.

---

## 1차 fix 4개 — 적용했지만 폭주 안 멈췄다

| 가설 | 적용한 fix | 파일 |
|------|-----------|------|
| A | `SceneManager.disposeScene()` 추가 — Mesh traverse 결로 geometry·material dispose | `frontend/src/three/SceneManager.ts` |
| B | `AmbientSoundManager.detachUnlockListeners()` 를 destroy에서도 호출 (멱등) | `frontend/src/three/audio/AmbientSoundManager.ts` |
| D | `next.config.ts` 의 `turbopack.root: path.resolve(__dirname)` 명시 | `frontend/next.config.ts` |
| H | `next.config.ts` 의 `transpilePackages: ['howler']` | `frontend/next.config.ts` |

박은 후 dev 검증 → **여전히 폭주**.

이 시점에서 멈춰서 생각함:

- 가설이 다 틀렸나? 그렇다고 보기엔 fix들 자체는 유의미하다 (실제 leak 위험 차단).
- 다른 원인이 더 있나? 환경 상태를 의심해야 할 시점.

---

## 2차 진단 — 환경 상태를 보기 시작

dev 서버 폭주는 코드만의 문제가 아닐 수 있다. **빌드 캐시·node_modules 같은 환경 상태**도 의심해야 한다.

`frontend/.next` 디렉토리 크기 확인:

```
frontend/.next  →  254 MB
```

정상 dev 캐시는 **수십 MB**다 (Turbopack 캐시 + HMR 매니페스트 + 빌드 산출물). 254MB는 명백한 이상치.

이전에 dev 서버를 띄우다가 Turbopack `internal error` 메시지가 한 번 떴던 기억이 있음. 그때 캐시가 손상된 채로 디스크에 남았고, 이후 매 dev 기동마다:

1. Turbopack이 `.next` 캐시를 읽음
2. corrupt entry를 만남
3. 재처리 시도 → 실패 → 재시도 → ... → heap 폭주

**진짜 root cause = `.next` 캐시 손상.**

복구:

```powershell
rd /s /q frontend\.next
```

dev 재기동 → 정상 동작. Node heap 안정.

---

## 가설별 root cause 매핑

| 가설 | 실제 root cause 였나? | fix는 유의미했나? |
|------|---------------------|------------------|
| A. Three.js dispose 누락 | X | O — Strict Mode dev에서 GPU leak 위험 실재 |
| B. unlock 리스너 cleanup | X | O — leak 규모는 작지만 정합성 측면 |
| D. Turbopack workspace root | X (이번엔) | O — 두 lockfile 패턴에서 미래의 폭주 차단 |
| H. howler + Turbopack | X (이번엔) | △ — `transpilePackages` 가 정말 필요한지는 [추정]. 박아둬도 손해는 없음 |
| **C. `.next` 캐시 손상** | **O** | **O — `rd /s /q` 한 줄로 즉시 회복** |

가설 단계에서 C가 빠져있던 이유: "코드 변경이 트리거" 라는 사용자 단서에 끌려갔다. 시점 단서는 강력하지만, **환경 상태 후보 (캐시·node_modules·OS 자원)** 도 동시에 봐야 했다.

---

## 트레이드오프·결정 5개

### 결정 1 — Howler `html5: true` vs `html5: false` (Web Audio API)

코드에 `html5: true` 박혀있다. 주석:

```ts
// HTML5 Audio — Web Audio API 디코더가 일부 mp3 인코딩에 까다로워서
// "Decoding audio data failed" 발생. Step 2 글로벌 음량 결로는 충분.
html5: true,
```

| | `html5: true` | `html5: false` (Web Audio) |
|--|---|---|
| 호환성 | 어떤 mp3든 거의 다 재생 (브라우저 native `<audio>` 사용) | 일부 mp3 인코딩에서 `decodeAudioData` 실패 |
| 동시 재생 | audio pool 제약 (default 10) | 무제한 (Web Audio graph) |
| 위치 기반 효과 | volume 조절만 가능 | panner, filter, 3D positional audio 가능 |
| 메모리 | 객체당 native audio 1개 | buffer 공유 가능 |
| 모바일 unlock | 더 까다로움 (한 번에 1개씩) | 한 번 unlock으로 끝 |

**왜 `html5: true` 박았나**:
- 사용자 자산 (Freesound·Pixabay에서 가져온 mp3) 중 일부가 Web Audio decoder에서 실패한 경험.
- Step 2의 위치 모델은 volume 조절만으로 충분. panner 같은 고급 효과는 후속 step에서.

**대안 검토**:
- mp3를 ogg나 wav로 재인코딩 → 자산 큐레이션 복잡도 증가. 시간 대비 이득 작음.
- `html5: false`로 가다가 실패 자산은 개별 swap → 분기 복잡.

**재검토 트리거**:
- 동시 재생 사운드 수가 10개 넘어가면 (지금은 4+1=5).
- 3D positional audio가 필요해지면 (예: 캐릭터 방향에 따른 좌우 패닝).

**부수 발견 — audio pool exhausted**:

dev 콘솔에 `HTML5 Audio pool exhausted` 경고가 떴다. `html5: true`의 함정. Howler html5 모드 default pool size = 10. React Strict Mode dev에서 useEffect 두 번 실행되며 Howl 4개 × 2 = 8개 시도. 일부 사운드 (gentle-wind·forest-birds) 가 audio 객체를 못 잡아 **무음**.

해결:

```ts
constructor() {
  Howler.html5PoolSize = 30;  // 생성자 첫 줄, Howl 인스턴스 만들기 전
  // ...
}
```

이건 Strict Mode dev 환경의 특수 사정에 대응한 우회. prod 빌드에서는 mount 한 번이라 pool 10으로도 충분 [추정]. 30은 안전 마진.

### 결정 2 — `MASTER_VOLUME` × `maxVolume` vs `maxVolume` 단일 기준

spec D11 가드레일: "음량 ≤ 0.3" (안식처 결, EDM·시끄러운 BGM 위반 신호).

처음 박은 코드:

```ts
MASTER_VOLUME = 0.5;
maxVolume (gentle-wind) = 0.22;
실효 = 0.5 × 0.22 = 0.11  → 너무 작음
```

사용자 결정 ("C3"): `MASTER_VOLUME = 1.0` + `maxVolume` 자체를 D11 가드레일로 박음.

| | (A) MASTER × maxVolume | (B) maxVolume 단일 기준 |
|--|---|---|
| 글로벌 조절 | 쉬움 — MASTER만 바꾸면 됨 | 각 zone 개별 조정 필요 |
| 가드레일 강제 | MASTER가 너무 작으면 zone별 의도가 흐려짐 | 각 사운드의 의도된 음량이 그대로 실효 |
| 미래 mute 토글 | MASTER=0 박으면 됨 | `Howler.mute(true)` 사용 |
| 가드레일 명확성 | "MASTER × max ≤ 0.3" 두 변수 — 흐림 | "max ≤ 0.3" 한 변수 — 명확 |

**선택: (B).** spec D11이 강제하는 건 "유저가 듣는 실효 음량 ≤ 0.3" 이다. 두 변수 곱으로 강제하면 한쪽이 흐려지면 의도가 깨진다. 단일 기준으로 두면 코드 리뷰에서 `maxVolume` 값만 보면 D11 위반 여부 즉시 판정 가능.

mute 토글은 `Howler.mute()` API로 충분히 커버됨.

### 결정 3 — Turbopack workspace root 두 lockfile 패턴

| | (A) 루트 lockfile 제거 | (B) `turbopack.root` 명시 |
|--|---|---|
| 시간 | husky 재셋업 필요 (루트 package.json 의존) | 한 줄 추가 |
| 위험 | husky pre-commit이 안 돌 가능성 | 다른 dev 환경에서도 명시 결로 안정 |
| 가독성 | 루트가 깨끗 | next.config.ts에 의도 주석 박힘 |

**선택: (B).** husky는 monorepo 패턴에서 루트 package.json + lockfile을 요구한다 (남이 clone하면 `npm i` 한 번으로 hook 설치되도록). 이걸 깨면 다른 곳에서 부작용 발생. `turbopack.root: path.resolve(__dirname)` 한 줄로 깔끔히 해결.

```ts
turbopack: {
  root: path.resolve(__dirname),
},
```

**일반화**: monorepo가 아니라도 husky·lint-staged 결로 루트에 lockfile이 생기는 패턴은 흔하다. Next 16+ 도입 시 미리 박아두면 좋다.

### 결정 4 — React Strict Mode dev mount/unmount 두 번 실행 패턴

이번 사건의 가설 A·B·H 모두 이 패턴에서 파생한다.

**Strict Mode dev 동작** (React 18+):
- useEffect는 mount → cleanup → mount 결로 두 번 실행됨.
- prod에서는 한 번만.
- 의도: side effect cleanup이 멱등한지 검증하는 dev tool.

**이 패턴이 폭주를 부르는 라이브러리들**:

| 라이브러리 | leak 패턴 | 방어 |
|----------|-----------|------|
| Three.js | Geometry·Material·Texture·WebGLRenderer GPU 자원 | dispose() traverse + renderer.dispose() |
| Phaser | game instance, canvas, AudioContext | game.destroy(true, true) |
| Howler | audio pool, unlock listener, Howl 인스턴스 | unload() + window listener cleanup |
| WebRTC | RTCPeerConnection ICE candidates | pc.close() + 모든 트랙 stop() |
| Map libraries (Leaflet 등) | DOM 잔여, tile cache | map.remove() |
| WebSocket 직접 사용 | open socket | close() + onclose 분기 |

**일반화 휴리스틱**: dev에서 native 자원·외부 시스템 핸들을 잡는 라이브러리를 쓸 때, **cleanup이 정확히 mount-cleanup-mount 사이클을 견디는지** 검증한다. cleanup이 멱등이고 완전해야 한다.

**Strict Mode 끄는 선택지는?** 권장하지 않음. 끄면 prod에서 우연히 동작하던 leak이 운영에서 터진다.

### 결정 5 — `.next` 캐시 손상 복구 절차

이번 사건에서 가장 비싼 lesson. dev 서버 폭주 시 코드 fix 시도하기 전에 다음을 먼저 박는다:

```
1. rd /s /q frontend\.next       (Turbopack/Webpack 캐시)
2. rd /s /q frontend\node_modules\.cache  (있다면)
3. dev 재기동
```

**왜 이게 먼저인가**:
- 코드는 git diff로 검증 가능. 캐시는 손상 시 silent하다.
- 캐시 삭제는 30초 비용. 코드 fix는 30분+ 비용.
- 손상 캐시 사이클은 매 기동마다 같은 폭주를 재생산한다 → 가설 검증을 방해.

**Turbopack `internal error` 메시지 = 즉시 캐시 삭제**:
이 메시지가 한 번이라도 떴으면 캐시가 corrupt 됐다고 봐야 한다. Turbopack은 incremental compilation을 위해 RocksDB 결로 캐시를 디스크에 영구화한다 [추정]. 한 번 깨진 entry는 다음 기동에서도 그대로 읽힌다.

---

## 일반화된 진단 휴리스틱 — 이 노트의 진짜 가치

dev 서버 Node heap 폭주 시 의심 순서 (위에서 아래로):

1. **`.next` (또는 `.turbo`, `node_modules/.cache`) 크기 확인**
   - 100MB+ 면 손상 의심, 즉시 삭제 후 재기동.
   - 정상 dev 캐시 = 수십 MB.

2. **lockfile 위치 확인**
   - 프로젝트 루트와 frontend/ 양쪽에 lockfile이 있으면 workspace root 명시.
   - Vite·Webpack도 비슷한 함정 있음 [추정].

3. **콘솔 `internal error` 메시지**
   - Turbopack/SWC 자체 폭주 신호. 캐시 삭제가 첫 답.

4. **시점 단서 추적**
   - "X 작업 후 시작" → 그 변경의 의존성 추가에 집중.
   - 단, **환경 상태 (캐시·OS 자원)** 도 동시 후보로 둘 것. 이번 사건에서 놓친 부분.

5. **React Strict Mode dev × 모듈 dispose 누락**
   - Three.js·WebGL·Audio·Map·WebRTC·WebSocket 라이브러리 결박 시 cleanup 점검.
   - cleanup이 멱등하고 완전한지 검증.

6. **OS 자원**
   - 다른 dev 서버·Docker·VS Code TS server가 RAM 잡고 있는지.
   - 가용 RAM이 4GB 미만이면 Turbopack이 swap 결로 떨어지며 폭주처럼 보일 수 있음.

---

## 부수 발견 — 같이 박힌 것들

### 1. `THREE.PCFSoftShadowMap` deprecated (three r184)

```ts
// 변경 전
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// 변경 후
this.renderer.shadowMap.type = THREE.PCFShadowMap;
```

r184 release note 확인 권장 [추정 — 정확한 deprecation 버전은 검증 필요]. 일단 console deprecation warning은 사라짐.

### 2. `pendingTarget` 타입 좁히기

Step 1부터 박혀있던 type error:

```ts
// 변경 전
private pendingTarget: Active = 'village';  // Active = 'village' | 'library' | 'transitioning'
// 변경 후
private pendingTarget: 'village' | 'library' = 'village';
```

`pendingTarget`은 startTransition 호출 시점에 'village' | 'library' 만 들어간다. 'transitioning' 은 `active` 만 가지는 상태. 타입을 좁히면 `this.active = this.pendingTarget` 시점에 'transitioning' 이 새는 가능성을 컴파일러가 차단.

**시야 확장**: 이 type error가 Step 1부터 박혀있었는데 발견 안 된 이유 = **CI에서 `tsc --noEmit` 이 안 돌고 있다**. ESLint는 type-checked rule 켜져있지만 (learning 20) 전체 타입 일관성은 다른 문제. CI에 `tsc` 추가 검토 필요 (별도 트랙 후보).

---

## 더 공부할 거리

- **Turbopack incremental compilation 모델**: 캐시가 디스크에 어떻게 영구화되는지, corrupt entry 회복 메커니즘이 있는지. 공식 문서: https://turbo.build/pack/docs
- **React Strict Mode 의 이중 실행 정책**: React 18 RFC, Reactconf 발표. `useEffect` cleanup 검증 도구로서의 의도.
- **Howler.js Web Audio vs HTML5 Audio 내부 구조**: pool 메커니즘, unlock 정책, 모바일 autoplay 정책. 코드: https://github.com/goldfire/howler.js
- **Three.js dispose 패턴 전체**: BufferGeometry·Material·Texture·RenderTarget 결로 각 자원 종류별 cleanup. https://threejs.org/manual/#en/cleanup
- **Node.js heap snapshot 분석**: `--inspect` + Chrome DevTools 결로 dev 서버 heap 직접 보기. 이번엔 캐시 삭제로 끝났지만 다음에 또 비슷한 폭주 시 사용 검토.
- **Monorepo lockfile 패턴 (npm workspaces / pnpm)**: husky 루트 lockfile 패턴이 정말 표준인지, 더 깔끔한 대안이 있는지.

## 관련 노트

- [72. Phaser 2D → Three.js 3D 전환 결정](./72-phaser-to-threejs-pivot-decision.md) — 본 트랙의 시작점
- [05. npm 공급망 공격 (axios 1.14.1)](./05-supply-chain-attack-axios.md) — 의존성 도입 시 신중함의 또 다른 사례
- [20. 프론트엔드 ESLint 컨벤션](./20-frontend-eslint-convention.md) — `tsc` CI 도입이 필요해진 맥락

---

## 사실·이유·대안·재검토 4축 요약

- **사실**: Step 2에서 dev 서버 2회 강종. 1차 가설 4개 fix 적용 후에도 폭주. `.next` 254MB 발견 → 삭제 → 정상.
- **이유**: 코드 변경 (가설 D·H) 보다 **환경 상태 손상** 이 root cause였다. Turbopack `internal error` 시점의 corrupt 캐시가 디스크에 영구화되어 매 기동마다 재현.
- **대안**:
  - Strict Mode 끄기 → leak이 prod에서 터질 위험. 거부.
  - Webpack으로 회귀 → 다른 함정 가능성. 거부.
  - `.next` 자동 정리 스크립트 (`predev` hook) → 매번 캐시 날리면 incremental 이점 상실. 거부.
- **재검토 트리거**:
  - Turbopack `internal error` 가 또 발생하면 패턴화된 회복 절차 (스크립트)로 박을지 검토.
  - howler 동시 재생 10개 넘으면 Web Audio API 전환 검토 (audio pool 우회).
  - 환경음 외에 BGM·UI sound 추가되면 사운드 매니저 분리 검토.
  - `tsc --noEmit` CI 추가 (Step 1부터 박혀있던 type error 재발 방지).
