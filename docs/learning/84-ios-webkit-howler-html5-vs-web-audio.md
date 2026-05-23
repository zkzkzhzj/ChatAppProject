# 84. iOS WebKit 결박 Howler html5 vs Web Audio 트레이드오프 — `<audio>` element 의 volume API 가 iOS 에서 작동 안 한다

> 작성 시점: 2026-05-21
> 맥락: 트랙 `village-3d-audio-improvements` Step 1+2 (PR #106). 마스터 음량 슬라이더(Step 1, PR #105) 도입 후 iOS Chrome 결로 슬라이더·위치 기반 음량이 **둘 다 안 먹는** 결함 발견. 진단해보니 Howler.js `html5: true` 모드 (= `<audio>` element 사용) 가 iOS WebKit 의 read-only volume API 와 충돌. Web Audio API (`html5: false`) 로 전환해 해결.

---

## TL;DR

- **iOS WebKit (Safari · iOS Chrome · iOS Edge · iOS Firefox 모두 동일 엔진) 결로 `HTMLMediaElement.volume` 이 read-only.** JS 결로 셋해도 무시되고 항상 `1.0`. **Apple 의 의도적 정책** — "음량은 하드웨어 버튼으로만".
- Howler.js 의 `html5: true` 는 내부적으로 `<audio>` element 결로 재생 → iOS 결로 volume API 무시 → 슬라이더·위치 기반 음량 둘 다 안 먹음.
- `html5: false` (= Web Audio API + GainNode) 로 전환 → iOS 도 정상 동작. **트레이드오프는 메모리·디코딩 부담 ↑.**
- learning 78 에서 `html5: true` 를 박은 이유 ("일부 mp3 디코딩 실패 회피") 는 **데스크탑 관점**이었다. 모바일 운영 검증 단계 결로 전제가 뒤집힘.

---

## 배경 — 무슨 일이 있었나

트랙 `village-3d` Step 2 (learning 78) 결로 환경음 도입 시 `html5: true` 박았다. 이유:

> "HTML5 Audio — Web Audio API 디코더가 일부 mp3 인코딩에 까다로워서 'Decoding audio data failed' 발생. Step 2 글로벌 음량 결로는 충분."

그 후 트랙 `village-3d-audio-improvements` Step 1 (PR #105) 결로 마스터 음량 슬라이더를 박았다. 데스크탑·Android Chrome 결로 정상 동작 확인. 운영 검증 단계 결로 사용자가 iOS Chrome 결로 테스트:

> "슬라이더를 0 으로 내려도 환경음이 계속 들림. 캠프파이어 가까이 가도 소리 안 변함."

`AmbientSoundManager.update()` 의 `howl.volume(...)` 호출이 무시되는 것처럼 보임. 코드 로직 자체는 멀쩡 — `master * target * fade` 곱이 정상적으로 흘러가는데, 실제 들리는 음량만 변하지 않음.

여기서 iOS WebKit 의 audio volume API 제약을 찾기 시작했다.

---

## 진짜 원인 — `HTMLMediaElement.volume` 이 iOS 결로 read-only

### Apple 의 공식 정책

[Apple WebKit 공식 문서](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html):

> *"On iOS devices, the audio level is always under the user's physical control. The `volume` property is not settable in JavaScript. Reading the `volume` property always returns 1."*

요약:

- iOS 결로 `audio.volume = 0.5` 박으면 **무시되고** 그대로 1.0 유지.
- `audio.volume` 읽으면 항상 1.0 (실제 시스템 음량 아님).
- `audio.muted = true` 는 동작. 다만 0~1 사이 미세 조절 불가능.

### 왜 이렇게 막았나 — Apple HIG 의 의도

[Apple Human Interface Guidelines — Sound](https://developer.apple.com/design/human-interface-guidelines/playing-audio):

> *"Respect users' audio settings. Don't surprise people with sudden, loud sounds; let users control volume only through system controls."*

- 사용자 의도: 시스템 음량 일관성 유지. 어떤 앱이든 시스템 음량 슬라이더 결로만 조절 가능.
- 광고·악의적 사이트가 시스템 음량과 무관하게 큰 소리 재생하는 결로 사용자 놀라게 하는 결 방지.
- 데스크탑 Safari 는 volume API 가 동작 — **모바일만 제한**.

### Howler.js 에서 의 흐름

Howler 는 두 가지 모드를 지원:

```
html5: true   →  내부적으로 new Audio() 결로 <audio> element 생성
                 → iOS 결로 volume API 무시 → 음량 조절 불가
html5: false  →  Web Audio API (AudioContext + AudioBufferSourceNode + GainNode)
                 → GainNode.gain.value 결로 직접 신호 곱 조절
                 → iOS 도 정상 동작 (시스템 음량 자체는 못 건드림, 다만 앱 내 음량은 자유)
```

즉 **Web Audio 는 시스템 음량과 별개 결로 자기 graph 안에서 GainNode 결로 신호를 직접 곱한다.** iOS 의 제약은 `HTMLMediaElement` 에만 적용되고, Web Audio AudioContext 는 제약 밖.

---

## 선택지 비교

| | (A) `html5: true` 유지 | (B) `html5: false` (Web Audio) | (C) UA 분기 (iOS만 Web Audio) | (D) 자산 m4a/AAC 재인코딩 | (E) 라이브러리 교체 (Tone.js) |
|--|---|---|---|---|---|
| iOS 음량 조절 | X | O | O | X (Howler html5 그대로면 iOS read-only) | O |
| 데스크탑 음량 조절 | O | O | O | O | O |
| 메모리 | 적음 (streaming) | 많음 (AudioBuffer 결로 전체 PCM 디코드 결박) | iOS 만 ↑ | (A)와 동일 | 많음 (Web Audio 기반) |
| 디코딩 실패 위험 | 거의 없음 (브라우저 native 디코더) | 일부 mp3 인코딩 결로 `decodeAudioData` 실패 가능 | iOS 만 위험 | 거의 없음 (m4a 는 호환성 좋음) | (B)와 비슷 |
| 동시 재생 | audio pool 제약 (default 10) | 무제한 (graph) | (A)+(B) 혼합 — 운영 복잡 | (A)와 동일 | 무제한 |
| 코드 복잡도 | 가장 단순 | 단순 (옵션 한 줄) | UA detection + 두 path 유지 | 자산 파이프라인 손대야 함 | 대규모 변경, 학습 비용 |
| 모바일 unlock | 까다로움 (한 번에 1개씩) | 한 번 unlock 으로 끝 | iOS 만 쉬움 | (A)와 동일 | (B)와 비슷 |
| 3D positional audio | 불가 (volume 조절만) | 가능 (PannerNode 결로) | iOS 만 가능 — 데스크탑 못 함 | 불가 | 가능 |
| 운영 위험 | 모바일 운영 결로 결함 (이번 사건) | 디코딩 실패 자산 1~2개 가능 | 두 path 결로 버그 발생 시 reproduce 어려움 | 자산 추가 시마다 변환 노동 | 라이브러리 의존성 추가 |

### 빈틈

- **(A) html5: true**: 데스크탑만 보면 가장 우월해 보임. 모바일 운영 검증 안 거치면 못 발견. **이번 사건의 진단 지연이 이 함정**.
- **(B) html5: false**: 데스크탑에서 잘 돌던 자산이 모바일에서 디코딩 실패할 수도 있음. `onloaderror` 핸들러 필수 (spec D5).
- **(C) UA 분기**: 이론적으론 깔끔하지만 운영 결로 두 path 유지 = 버그 reproduce 어려움. Android Chrome 은 어디로 갈지 등 경계 정의도 모호.
- **(D) 재인코딩**: 자산 추가할 때마다 변환 노동. Sprout Lands 같은 무료 자산 결로 가져올 때 mp3 가 흔하다 — 매번 변환은 부담.
- **(E) Tone.js**: 음악 합성용 라이브러리. 환경음 재생만 하기엔 오버킬. learning 78 결로 Howler 도입한 이유 (단순 재생 + unlock 자동 처리) 가 무력화.

---

## 이 프로젝트에서 고른 것

**선택: (B) `html5: false` (Web Audio API) 전환.**

### 코드 변경 (`frontend/src/three/audio/AmbientSoundManager.ts`)

```ts
const howl = new Howl({
  src: [def.src],
  loop: true,
  volume: 0,
  html5: false,  // ← Web Audio API. iOS volume read-only 우회 (spec D4 / learning 84)
  preload: true,
  onloaderror: (_id, error) => {
    console.warn(`[AmbientSound] '${def.id}' 자산 로드 실패 (무음 진행):`, error);
  },
  onplayerror: (_id, error) => {
    // Web Audio autoplay 정책 결로 첫 play 실패 가능 (iOS Safari/Chrome).
    // unlock 결로 사용자 interaction 후 재시도 — 일단 console.warn 결로 graceful.
    console.warn(`[AmbientSound] '${def.id}' 재생 실패 (graceful):`, error);
  },
});
```

부수 변경:

- `Howler.html5PoolSize = 30` 라인 제거 — Web Audio 모드 결로 무의미 (`<audio>` pool 자체가 안 쓰임).
- `onplayerror` 핸들러 신규 추가 — Web Audio autoplay 정책 (사용자 제스처 전 play 실패) 결박.

### 이유

1. **트랙 목표 달성에 직결.** 슬라이더가 iOS 결로 작동 안 하면 트랙 자체 무의미. (C) UA 분기는 운영 부담 큼.
2. **디코딩 실패는 onloaderror 결로 graceful.** 단일 자산 실패 결로 전체 무음 X (spec D5). 실제 디코딩 실패 자산 발생하면 그때 재인코딩 (Out of scope — 별건).
3. **메모리 부담은 마음의 고향 자산 규모 결로 무시 가능.** 환경음 4~5개 × 평균 1MB → 디코딩된 PCM 결박 약 50MB. learning 78 의 dev 메모리 폭주는 `.next` 캐시 손상이 진짜 원인이지 Howler 가 아니었음.
4. **미래 확장 — 3D positional audio.** PannerNode 결로 캐릭터 방향 따라 좌우 패닝 가능. Web Audio 결로 가야 결국 도달 가능한 결.

### 재검토 트리거

- 자산 디코딩 실패율 > 30% (현재 0% — 5개 자산 모두 정상 디코드).
- Web Audio AudioContext 결로 dev/prod 메모리 폭주 — `learning 78` 의 진단 휴리스틱 결박 적용.
- 동시 재생 자산이 20개 넘어가면 AudioBuffer 메모리 비용 재검토.

---

## Web Audio · HTMLMediaElement · iOS 정책 — 핵심 개념 정리

### 1. HTMLMediaElement (`<audio>`, `<video>`)

브라우저 native 컴포넌트. 스트리밍 재생 (디스크 결로 다 못 받아도 재생 시작) + native UI (브라우저 결로 제공하는 컨트롤 막대). 메모리 효율 좋음.

API:

```js
const audio = new Audio('sound.mp3');
audio.volume = 0.5;  // ← iOS 결로 무시
audio.play();
```

### 2. Web Audio API

`AudioContext` 기반의 신호 처리 graph. 노드 단위 결로 audio 신호를 연결·가공·믹스.

```js
const ctx = new AudioContext();
const source = ctx.createBufferSource();
const gain = ctx.createGain();
source.connect(gain).connect(ctx.destination);
gain.gain.value = 0.5;  // ← iOS 도 정상 동작
```

특징:

- **전체 PCM 결박 디코드해서 AudioBuffer 메모리 결박 결박.** 스트리밍 X. 디코딩 부담 ↑.
- GainNode·PannerNode·BiquadFilterNode 등 결로 자유로운 신호 가공.
- AudioContext state: `suspended` (생성 직후 / 사용자 제스처 전) → `running` (제스처 후 resume). Howler 가 unlock 자동 처리.

### 3. iOS WebKit 의 제약 매트릭스

| 제약 | HTMLMediaElement | Web Audio |
|------|-----------------|-----------|
| volume 조절 | X (read-only) | O (GainNode) |
| autoplay (사용자 제스처 전) | X | X (둘 다 막힘) |
| 동시 재생 수 | 제한 있음 (구체 수치 모름) | 사실상 무제한 |
| Background tab 재생 | X (제한적) | X (제한적) |
| 시스템 음량 (하드웨어 버튼) | 항상 우선 | 항상 우선 |

**중요 — autoplay 정책은 둘 다 적용.** 그러니 "Web Audio 로 가면 unlock 안 해도 된다" 는 오해. Howler 가 unlock 리스너 (click/keydown/touchstart) 결박 자동 처리해주는 결로 신경 안 써도 되는 거지, 정책 자체는 살아있음.

---

## 시야 확장 — 모바일 audio 운영의 함정 지도

### 1. Apple HIG 의 사상

Apple 결로 모바일 audio 정책이 데스크탑보다 깐깐한 이유:

- **시스템 음량 일관성** — Maps · YouTube · 알람 음량이 같은 슬라이더 결로 통제. 앱마다 자기 음량 슬라이더 가지면 사용자 혼란.
- **광고·악의적 사이트 방어** — 자동 재생 + 큰 소리 결박 사용자 놀라게 하는 패턴 차단.
- **배터리 보호** — background audio 제한 결로 백그라운드 결박 무한 재생 방지.

이게 마음의 고향 결로 의미하는 것: **모바일에서 "전체적인 분위기 음량 컨트롤" 은 사용자 의도와 충돌.** 아예 못 박는 건 아니지만 (Web Audio 결로 가능), Apple 의 사용자 경험 철학과 결이 다르다는 인식 필요.

### 2. Android Chrome 은 다르다

Android Chrome (Blink 엔진) 결로 `HTMLMediaElement.volume` 정상 동작. 즉:

- 운영 결로 iOS 만 결함 — Android 결로 같은 코드 결박 잘 됨.
- **모바일 테스트 = iOS 결로 해야 함**. Android 만 보면 함정 못 봄.
- 데스크탑 Chrome 결박도 volume API 정상 — 데스크탑 Safari (Mac) 도 정상. **iOS 만 예외**.

### 3. 데스크탑 Safari vs iOS Safari

같은 회사 (Apple), 같은 엔진 (WebKit) 인데 정책이 다름. 데스크탑 Safari 는 volume API 가 동작. iOS Safari 만 막힘. 이유:

- 데스크탑 결로 시스템 음량 슬라이더가 더 쉽게 접근 가능 (메뉴바 결박).
- 모바일 결로는 하드웨어 버튼 결로만 — 이 일관성 강제.

### 4. iOS Chrome 의 진실

iOS App Store 정책 결박 **모든 iOS 브라우저는 WebKit 엔진 사용 강제**. Chrome · Firefox · Edge · Brave 모두 iOS 결로는 Safari 와 같은 엔진. 따라서:

- iOS Chrome 결로 안 되면 iOS Safari 결로도 안 됨 (반대도 성립).
- 운영 결로 "iOS Chrome 만 테스트" 결박 iOS 전체 커버 가능.
- 2026 년 시점 EU 결박 DMA (Digital Markets Act) 결로 Apple 이 다른 엔진 허용 시작했지만 — 실질 변화는 미미 [추정, 검증 필요].

### 5. Web Audio context 의 `suspended` 상태

iOS 결박 첫 AudioContext 생성 시 state = `suspended`. 사용자 제스처 결로 `resume()` 해야 비로소 `running`. Howler 의 `Howler.autoUnlock` 결박 자동 처리.

진단 결박:

```js
console.log(Howler.ctx.state);  // 'suspended' 면 unlock 안 된 상태
```

unlock 안 된 상태 결로 `howl.play()` 호출하면 `onplayerror` 트리거. 그래서 onplayerror 핸들러 박은 것.

### 6. 다른 프로젝트는 어떻게 푸나

- **Discord (웹)** — Web Audio + WebRTC 결박. 음량 슬라이더 ON. 음성 채팅 결박 GainNode 필수라 다른 선택지 없음.
- **YouTube (iOS Safari)** — `<video>` element + native 컨트롤. JS 결박 volume 안 건드림. 시스템 음량 결박 우선.
- **Spotify (웹)** — Web Audio. 자체 슬라이더 있음.
- **게임 (Phaser/Three.js + Howler)** — Howler 의 default 결박 Web Audio 우선, 실패 시 html5 fallback. 마음의 고향처럼 `html5: true` 명시 박은 사례는 드물다.

→ **결론: 음량 슬라이더 박는 웹 앱은 거의 다 Web Audio 가 표준.** 우리가 learning 78 결로 `html5: true` 박은 건 데스크탑 dev 환경 결박 디코딩 실패 트라우마 결로 선택한 우회 — 모바일 운영 결박 다시 뒤집힌 결.

### 7. 무음 모드 (silent mode) 감지

iPhone 좌측 silent switch 결박 무음 모드 → 시스템 알림음 X. **다만 미디어 음량 (영상·음악) 은 영향 없음.** 즉 Web Audio 결박 환경음은 silent mode 결박 무관하게 재생됨.

이게 사용자 입장 결박 함정일 수 있음 — "조용히 하고 싶어서 silent 모드 켰는데 환경음이 들림". 마음의 고향 결박 슬라이더 결로 사용자가 직접 끄게 한 결정 (spec D1) 이 이 함정을 일부 보완.

### 8. PWA 결박 background audio

마음의 고향 결박 PWA 결박할 계획 있다면 (현재 [추정 — 미정]), background audio 정책 결박 추가 함정 발생:

- iOS PWA 결박 background audio 거의 불가능.
- Android PWA 결박 manifest 결박 일부 가능.
- 환경음 결박 background 결박 들려야 할 이유 없음 — 사용자가 마을을 떠나 다른 앱 보는 상황. 일시정지가 자연스러움.

---

## 실전에서 주의할 점

1. **모바일 운영 검증은 iOS 결박 필수.** Android Chrome + 데스크탑 Chrome 만 보면 이번 사건처럼 함정 못 봄. 운영 체크리스트 결박 "iOS Chrome (또는 Safari) 1회" 박을 것.
2. **audio context state 확인 습관.** 운영 결박 음량 안 변하는 결함 보고 시 `Howler.ctx.state` 결박 먼저 봄. `suspended` 면 unlock 문제.
3. **`onloaderror` · `onplayerror` 둘 다 필수.** Web Audio 결박 갔으면 디코딩 실패 + autoplay 실패 두 갈래. graceful fallback 없으면 단일 자산 결박 전체 무음 위험.
4. **Howler 버전 의존성.** Howler 의 default 모드 정책이 버전마다 바뀜 (구버전 결박 Web Audio default, 일부 환경 결박 html5 fallback). 명시적 `html5: false` 박아둬야 의도 보장.
5. **시스템 음량과 슬라이더의 관계.** Web Audio 결박 갔어도 시스템 음량 (하드웨어 버튼) 결박 절대 못 건드림. 사용자가 시스템 음량 0 결박 박았으면 슬라이더 100% 박아도 무음. UI 결박 "시스템 음량 확인" 안내 결박 필요할 수 있음 (지금은 X — 사용자 학습 비용 결박 가벼움).

---

## 나중에 돌아보면

- **이 선택이 틀렸다고 느끼는 시점은?** 자산 디코딩 실패율이 30% 넘어서 onloaderror 결박 graceful 하기 어려워질 때. 그때 (D) 자산 재인코딩 파이프라인 박는 게 더 나음.
- **스케일이 바뀌면?** 동시 재생 자산 20개 넘어가면 AudioBuffer 메모리 비용 ↑. 그땐 hybrid (BGM·SFX 결박 Web Audio, 배경 ambient 결박 html5 streaming 결박) 검토.
- **iOS 정책이 바뀌면?** Apple 이 향후 iOS 결박 volume API 풀어줄 수도 [추정 — 가능성 낮음. Apple HIG 사상 결박 일관성]. 풀리면 html5 모드 결박 메모리 이점 결박 돌아갈 수 있음.

---

## 더 공부할 거리

- **Web Audio API spec** — [W3C](https://www.w3.org/TR/webaudio/). AudioContext lifecycle · GainNode · PannerNode · BiquadFilterNode 종합.
- **iOS WebKit audio 정책 종합** — [Apple WebKit blog](https://webkit.org/blog/) 결박 audio 태그 검색. 정책 변경 history 추적.
- **Howler.js 내부 코드** — [howler.js GitHub](https://github.com/goldfire/howler.js). `src/howler.core.js` 결박 html5 모드 vs Web Audio 모드 분기 직접 보기.
- **mp3 vs ogg vs m4a vs Opus** — 모바일 호환성·디코딩 비용·라이센스 결박 트레이드오프. [Mozilla audio codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs).
- **Apple HIG — Playing Audio** — [공식 가이드](https://developer.apple.com/design/human-interface-guidelines/playing-audio). 모바일 UX 결박 audio 설계 철학.
- **Web Audio 결박 3D positional audio** — PannerNode 결박 distance model · panning model. Three.js 의 `AudioListener` + `PositionalAudio` 결박 Web Audio wrapping. 미래 트랙 (D6 v 축 보강) 결박 검토.
- **DMA · iOS 브라우저 엔진 다양화** — 2026 년 EU 결박 정책 변화. 실질 영향 추적 필요.

## 관련 노트

- [78. Next.js + Three.js + Howler dev 서버 Node heap 폭주 진단기](./78-nextjs-three-howler-dev-memory-explosion-diagnosis.md) — `html5: true` 박은 원래 결정의 맥락. 본 노트의 정정 대상.
- [85. 음소거 UI 통합 + localStorage 영속 패턴](./85-mute-ui-unification-localstorage-pattern.md) — 같은 트랙. 슬라이더 UI 설계 결정.
- [50. 모바일 터치 이동](./50-mobile-touch-movement.md) — 모바일 운영 검증 결박 누락이 함정 부른 또 다른 사례.

---

## 사실·이유·대안·재검토 4축 요약

- **사실**: iOS Chrome 결로 마스터 음량 슬라이더 + 위치 기반 음량 둘 다 안 먹음 발견. Howler `html5: true` (`<audio>` element) 가 iOS WebKit 의 read-only `HTMLMediaElement.volume` 결박 충돌. `html5: false` (Web Audio + GainNode) 결박 전환해서 해결.
- **이유**: Apple 의 의도적 모바일 audio 정책 — 시스템 음량 일관성 우선. Web Audio AudioContext 는 제약 밖 결박 GainNode 결박 직접 신호 곱. 메모리 부담은 마음의 고향 자산 규모 결박 무시 가능.
- **대안**:
  - `html5: true` 유지 + iOS 결박 슬라이더 비활성화 — 트랙 목표 못 함. 거부.
  - UA 분기 결박 iOS 만 Web Audio — 두 path 결박 운영 복잡. 거부.
  - 자산 m4a 재인코딩 — 자산 추가마다 변환 노동. 거부 (필요시 별건).
  - 라이브러리 교체 (Tone.js) — 학습 비용·과한 의존성. 거부.
- **재검토 트리거**:
  - 디코딩 실패율 > 30% → 자산 재인코딩 파이프라인 박을 시점.
  - Web Audio AudioContext 메모리 폭주 → learning 78 진단 휴리스틱 결박 적용.
  - 동시 재생 자산 20개 넘어가면 hybrid 모드 검토.
  - iOS 정책 변화 (DMA · Apple 자체) → html5 모드 부활 가능성 재검토.
