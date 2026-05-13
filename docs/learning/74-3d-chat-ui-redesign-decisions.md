# 74 — 3D 채팅 UI 재설계: 말풍선·입력창·내역 패널·시간 4개 결정

> 트랙 `village-3d` Step 1.7 (채팅 UI 재설계). 옛 ChatOverlay (좌측 하단 사이드바) 폐기하고 채팅을 3D 마을 공간에 통합.
> spec `docs/specs/features/village-3d.md` §4 D12~D15 결정의 사고 과정 기록.
> 작성일: 2026-05-13

---

## 1. TL;DR

| 결정 | 채택 | 핵심 근거 |
|------|------|----------|
| D12 말풍선 렌더 | **3D Sprite (CanvasTexture)** | 카메라 자동 정렬 + 거리 따라 크기 축소 + 동기화 비용 X |
| D13 입력 위치 | **머리 위 인라인 HTML input** | "내가 말하는 위치 = 내 캐릭터" 직관, 말풍선과 시각 연속성 |
| D14 내역 패널 | **우측 사이드 드로우어** | 마을 단절감 최소 + 좌측 시각 요소와 겹침 회피 |
| D15 말풍선 시간 | **6초** | 한국어 20자 ≈ 3초 + 여유 3초 (4초 짧음·8초 누적) |

공통 원칙: 마을 공간감을 깨지 않는다 → 화면 가장자리 고정 UI 최소화, 모든 채팅 요소를 캐릭터·공간에 anchor.

## 2. 배경

옛 채팅 UI = 좌측 하단 ChatOverlay (사이드바 + 입력창 + 메시지 리스트). Phaser 2D 시절 화면 절반을 차지하던 모델. Three.js 3D 전환 후에도 그대로 두면:

- 3D 공간감 단절 — 사이드바가 마을 시야 가림
- "내가 어디에서 말하는가" 직관 단절 — 캐릭터는 마을 한가운데 있는데 입력창은 화면 구석
- 디스코드/카톡과 시각 차이 없음 — Alone Together 시각 차별점 약화

→ 채팅 UI를 마을 공간에 통합한다. 4개 결정 필요.

## 3. D12 — 말풍선 렌더 방식

### 3.1 선택지 비교

| 차원 | 3D Sprite (CanvasTexture) | HTML overlay (Vector3→screen) | 3D TextGeometry |
|------|---------------------------|-------------------------------|-----------------|
| 카메라 정렬 | Sprite 자동 (`always face camera`) | 매 프레임 좌표 변환 + DOM 위치 갱신 | mesh `lookAt(camera)` 명시 호출 |
| 거리 축소 | 자동 (perspective projection) | 수동 계산 (z 거리 기반 font-size 조절) | 자동 |
| Occlusion (다른 mesh 뒤 가려짐) | 자동 (depth buffer) | X (항상 위에 떠있음) | 자동 |
| 한국어 렌더링 품질 | Canvas2D — DPR · antialias 튜닝 필요 | DOM — 브라우저 네이티브 ◎ | TTF 변환 무거움, 한글 자모 분리 함정 |
| 동적 텍스트 변경 비용 | CanvasTexture 재생성 (cheap) | DOM textContent 변경 (cheap) | Geometry 재생성 (expensive) |
| 메모리 누수 위험 | `texture.dispose()` 의무 | DOM GC 자동 | Geometry/Material dispose 의무 |
| Three.js 자연감 | ◎ 같은 Scene 내 객체 | X 별도 레이어 | ◎ |
| 매 프레임 비용 | 0 (한번 만들면 GPU 캐싱) | DOM reflow 가능성 | 0 |

### 3.2 채택 — 3D Sprite (CanvasTexture)

핵심 이유:

1. **카메라와 자동 동기화** — `THREE.Sprite`는 항상 카메라를 향한다. HTML overlay는 매 프레임 `vector.project(camera)`로 좌표 변환 + DOM `transform: translate()` 갱신이 필요하다. 캐릭터 N명 × FPS 60 = 초당 N×60회 DOM 갱신.
2. **Occlusion 자연 처리** — 도서관 벽 뒤에 캐릭터가 있으면 말풍선도 가려진다. depth buffer로 공짜. HTML overlay는 별도 raycast 로직을 짜야 한다.
3. **3D 공간감 — Alone Together와 정합** — 말풍선이 마을 안에 떠있는 느낌 vs 화면 위에 떠있는 느낌. 사이드바 폐기 동기와 같은 맥락.

### 3.3 CanvasTexture 한국어 렌더링 주의점

```text
1. DPR (Device Pixel Ratio) 반영
   canvas.width = baseWidth * window.devicePixelRatio
   canvas.height = baseHeight * window.devicePixelRatio
   ctx.scale(DPR, DPR)
   → 안 하면 레티나 디스플레이에서 흐릿함

2. font 설정
   ctx.font = '500 16px "Pretendard", "Noto Sans KR", sans-serif'
   ctx.textBaseline = 'middle'
   ctx.textAlign = 'center'
   → 한글 font fallback 명시해야 자모 분리 함정 회피

3. antialias
   ctx.imageSmoothingEnabled = true
   texture.minFilter = THREE.LinearFilter
   texture.magFilter = THREE.LinearFilter
   → mipmap을 그대로 두면 멀어질 때 blur 강함

4. dispose 의무 — 말풍선 fade out 완료 시
   sprite.material.map.dispose()
   sprite.material.dispose()
   scene.remove(sprite)
   → 안 하면 매 발화마다 GPU 메모리 누적
```

### 3.4 빈틈

- **CanvasTexture 메모리 누적** — fade out 끝나면 dispose 의무. React useEffect cleanup 또는 명시적 lifecycle 메서드.
- **글자 흐림** — 적정 baseWidth (예: 256 또는 512) × DPR 곱이 텍스트 길이에 비해 작으면 흐림. 긴 메시지는 width 동적 계산 필요.
- **여러 줄 줄바꿈** — Canvas2D `fillText`는 자동 줄바꿈 없음. `measureText().width`로 직접 wrap 알고리즘을 짜야 함.

## 4. D13 — 입력창 위치

### 4.1 선택지 비교

| 차원 | 머리 위 인라인 HTML input | 하단 중앙 고정 (Discord 패턴) | 사이드 패널 (옛 ChatOverlay) |
|------|-------------------------|--------------------------|-----------------------------|
| "내가 어디서 말하는가" 직관 | ◎ 캐릭터에 anchor | △ 분리됨 | X 화면 구석 |
| 말풍선과 시각 연속성 | ◎ 같은 위치에서 자연 결합 | X 입력 위치 ≠ 말풍선 위치 | X |
| 마을 시야 가림 | 작음 (input 1줄) | 작음 (하단 띠) | 큼 (사이드바) |
| IME 동작 | DOM input 자연 | DOM input 자연 | DOM input 자연 |
| Vector3→screen 매 프레임 비용 | 객체 1개라 미미 | 0 (고정 위치) | 0 |
| 화면 가장자리로 가면 | 잘림 → clamp 또는 닫기 처리 | 무관 | 무관 |
| 모바일 호환 | 약함 (작은 input + 가상 키보드 충돌) | ◎ | △ |

### 4.2 채택 — 머리 위 인라인 HTML input

핵심 이유:

1. **말풍선과 시각 연속성** — 입력 → Enter → 같은 위치에 말풍선이 뜬다. "입력하던 글이 말풍선이 된다".
2. **마을 공간감 유지** — 화면 가장자리 고정 UI 추가 안 함.
3. **데스크탑 only와 정합** — spec D11 / CLAUDE.md §2 — 모바일 가상 키보드 충돌은 out of scope.

### 4.3 IME · 포커스 충돌 처리

3D 마을에는 WASD 이동 키 핸들러가 항상 떠있다. 채팅 입력 시 상태 머신이 필요하다:

```text
[normal mode]
  WASD → 캐릭터 이동
  Enter → [chat mode] 전환, input 포커스
  그 외 → 무시

[chat mode]
  Esc → [normal mode] 전환, input 닫기, 캔버스에 다시 포커스
  Enter (input 비어있음) → [normal mode] 전환
  Enter (입력 있음) → 메시지 전송 + [normal mode] 전환
  그 외 키 → input으로 흘려보냄 (WASD 이동 X)
  IME 조합 중 (isComposing) → Enter 전송 보류 (learning 49와 동일)
```

핵심 함정:

- **`isComposing` 가드** — macOS 한글 입력 시 Enter가 IME confirm과 메시지 전송으로 동시 발생. `event.nativeEvent.isComposing` 체크해서 confirm 단계를 무시. learning 49와 동일 패턴.
- **포커스 leak** — chat mode에서 input에 포커스를 줬는데 사용자가 캔버스를 클릭하면 입력이 끊긴다. canvas blur 이벤트로 chat mode를 닫거나 입력을 강제 유지.
- **`keydown` vs `keypress` vs `input`** — IME 조합 중 keydown은 발생, input은 confirm 후만 발생. 메시지 전송은 keydown + isComposing 체크 조합.

### 4.4 Vector3→screen 매 프레임 비용

```ts
// 매 프레임 호출됨
const vector = character.position.clone()
vector.y += 1.5 // 머리 위
vector.project(camera)
const x = (vector.x * 0.5 + 0.5) * canvasWidth
const y = (vector.y * -0.5 + 0.5) * canvasHeight
inputEl.style.transform = `translate(${x}px, ${y}px)`
```

객체 1개 (자기 캐릭터)라 60fps에서도 미미. Step 3 (캐릭터 3D 모델) 추가 후 RemotePlayer × N으로 늘어나면, 그 시점 dirty flag (캐릭터가 안 움직이면 갱신 안 함) 도입 검토.

### 4.5 빈틈

- 화면 가장자리로 캐릭터가 가면 input 잘림 — clamp (input을 화면 안에 가둠) 또는 자동 닫기. 첫 시안은 자동 닫기로 단순화.
- 입력 중 카메라가 이동하면 input도 같이 따라감 — 정상 동작. 단 사용자가 어지러움을 느낀다는 신호가 있으면 입력 중 카메라 lerp 멈춤 검토.

## 5. D14 — 내역 패널 위치

### 5.1 선택지 비교

| 차원 | 우측 사이드 드로우어 | 모달 중앙 | 하단 슬라이드 업 | 자동 표시 X |
|------|---------------------|----------|-----------------|------------|
| 마을 단절감 | 작음 (반쪽만 가림, 토글) | 큼 (마을 정지·차단) | 작음 (하단만) | 0 |
| 입력창과 겹침 | X (좌우 다름) | X (다른 레이어) | O (둘 다 하단) | — |
| 좌측 시각 요소와 겹침 | X (우측 배치) | — | — | — |
| 놓친 대화 추적 | ◎ 토글로 다시 보기 | ◎ | ◎ | X 사라지면 끝 |
| 채팅 흐름 파악 | ◎ | ◎ | ◎ | X |
| 모바일 화면 폭 | 좁으면 잘림 | 적합 | 적합 | 무관 |

### 5.2 채택 — 우측 사이드 드로우어

핵심 이유:

1. **좌측 시각 요소와 겹침 회피** — 마을 입구·도서관 시각 요소가 좌측에 배치돼있음. ChatOverlay 옛 위치 (좌측 하단) 재사용은 시각 충돌.
2. **마을 단절감 최소** — 모달 중앙 vs 사이드 드로우어 → 사이드는 마을 절반이 살아있다. 모달은 마을 자체를 가린다.
3. **입력창과 레이어 분리** — 입력창 = 캐릭터 anchor (중앙). 드로우어 = 화면 우측 가장자리. 시각 겹침 X.

### 5.3 빈틈

- 모바일 화면 폭 ≥ 1024px 가정 (spec D14 명시) — 모바일은 별도 트랙.
- 드로우어가 닫혀있을 때 미확인 메시지 표시 (배지 카운트) — Step 1.7 첫 시안은 배지 X, 추후 추가.

## 6. D15 — 말풍선 시간 6초

### 6.1 한국어 평균 읽기 속도 근거

| 자료 | 읽기 속도 |
|------|----------|
| 한국 출판학 연구 (성인 평균) | 약 350~400 wpm (단어) ≈ 한국어 1글자 ≈ 0.15초 |
| 카카오 i 자막 가이드 | 1초당 4~6자 권장 |
| 넷플릭스 한국어 자막 규정 | 1초당 7자 미만 |
| 보수적 추정 (평균 + 컨텍스트 전환) | 1초당 5~6자 |

마을 채팅 평균 메시지 길이를 20자로 가정 (디스코드/카톡 평균 참고).

- 20자 ÷ 5자/초 = 4초 읽기
- + 시야에서 발견 1초 (눈으로 말풍선 인지)
- + 컨텍스트 전환 1초
- → **6초**

### 6.2 대안 비교

| 시간 | 장점 | 단점 |
|------|------|------|
| 4초 | 화면 깔끔 | 긴 문장 (40자+) 못 읽음, 시선 분리됨 |
| 6초 (채택) | 평균 20자에 여유, 누적 적당 | 매우 긴 문장 (60자+) 부족 |
| 8초 | 긴 문장 OK | 화면 누적 ↑ (N명 동시 발화 시 시야 가림) |
| 동적 (글자수 기반) | 정확 | 구현 복잡, 사용자 입장 일관성 X (메시지마다 시간 다름) |

→ **고정 6초** 채택. 첫 시안 단순함 우선. 매우 긴 문장은 메시지 길이 제한 (별도 결정) 또는 줄바꿈으로 처리.

### 6.3 연속 발화 시 교체 vs 누적

선택: **교체** (한 캐릭터 = 한 말풍선).

근거:

- 메모리 효율 — CanvasTexture N개 누적 시 dispose 부담.
- 화면 정리 — 한 캐릭터 머리 위에 말풍선 N개가 쌓이면 시야가 어지러움.
- 사용자 직관 — "그 사람의 마지막 말"이 보인다. 디스코드도 같은 패턴.

빈틈: 빠르게 두 줄 연속 발화 시 첫 줄을 못 읽는다. → 내역 패널 (D14)로 보완.

## 7. 디스코드·카톡 패턴과의 차이 — 왜 일반 패턴을 거부했는가

### 7.1 디스코드/카톡 패턴

- 입력창 = 하단 중앙 고정
- 메시지 = 시간순 리스트 (위로 쌓임)
- 발화 위치 무관 — 채팅방이 곧 공간

→ **공간감 X 시간 흐름 중심** 패턴. "누가 언제 무엇을 말했는가"만 중요.

### 7.2 마음의 고향 — Alone Together와 정합

- 마을 = 공간 (Three.js 3D)
- 캐릭터 = 위치 (Vector3)
- 발화 = 그 위치에서 일어남
- "강요 없는 동행" — 말 안 해도 됨, 말풍선이 떠도 즉시 응답 의무 X

→ **공간감 중심**. 누가 어디서 말하는가가 중요. "그 사람이 도서관 쪽으로 가서 말한다" vs "그 사람이 캠프파이어 옆에서 말한다"의 시각 차이가 의미를 가진다.

### 7.3 결정 패턴 차이

| 결정 | 디스코드/카톡 | 마음의 고향 (본 트랙) | 이유 |
|------|--------------|---------------------|------|
| 말풍선 | X (리스트만) | ◎ 3D Sprite | 공간 발화 |
| 입력창 위치 | 하단 고정 | 캐릭터 머리 위 | 발화 위치 = 입력 위치 |
| 내역 | 메인 뷰 | 드로우어 (보조) | 마을이 메인 |
| 시간 표시 | 모든 메시지 timestamp | 말풍선엔 X, 드로우어엔 O | 마을의 시간 흐름 약화 |
| 응답 의무 | "읽음"·"답장" | 없음 | Alone Together |

## 8. 시야 확장 — 다른 3D·공간 채팅 사례

| 서비스 | 채팅 UI 패턴 | 마음의 고향과 비교 |
|--------|------------|--------------------|
| **VRChat** | 3D 말풍선 + 음성 우선 + 채팅 X | 음성 X (spec D11 가드레일) — 텍스트만 |
| **Mozilla Hubs** | 음성 우선 + 텍스트 사이드 패널 + 머리 위 이름표 | 텍스트 우선 — 반대 결정 |
| **Fortnite** | 음성 우선 + 텍스트 채팅 사이드 + 이모트 표현 | 안식처와 충돌 (전투 게임) |
| **Among Us** | 회의 모달로 일괄 (공간 정지) | 공간 정지 거부 (Alone Together 강요 X) |
| **Animal Crossing** | 머리 위 말풍선 (CanvasTexture와 유사) + 채팅 내역 X | ◎ 본 결정과 가장 정합 |
| **Stardew Valley (멀티)** | 머리 위 말풍선 + 채팅 사이드 | ◎ D14 드로우어와 유사 |

→ 본 결정은 **Animal Crossing + Stardew 결합**에 가장 가깝다. ZEP/VRChat (활동 메타버스) 거부 의도와 정합.

## 9. 실전에서 주의할 점

### 9.1 CanvasTexture dispose 누락

매 발화마다 새 texture를 만들고 dispose 안 하면 GPU 메모리 누적 → 수십 분 후 fps drop. React useEffect cleanup 또는 명시적 lifecycle 메서드를 박을 것.

### 9.2 한국어 폰트 fallback

`ctx.font = '16px sans-serif'`만 쓰면 OS마다 한글이 다르게 렌더링된다. Pretendard / Noto Sans KR fallback을 명시.

### 9.3 IME isComposing 가드

learning 49와 같은 패턴. macOS 한글 입력 시 Enter가 두 번 발생 (IME confirm + 전송). isComposing 체크 누락 시 "안녕하세영"처럼 중복 전송된다.

### 9.4 chat mode ↔ normal mode 전환 시 leak

input blur, canvas focus, escape, 메시지 전송 등 4개 이상의 진입·이탈 경로. 한 곳에서만 mode 변경 — single source of truth (Zustand store 1개)로 관리.

### 9.5 RemotePlayer 말풍선 동기화

WebSocket으로 다른 유저 메시지 도착 → 그 유저의 캐릭터 위에 말풍선. 캐릭터 ID로 anchor. step 1.5 (멀티유저 위치 동기화) 통합 시점에 주의.

## 10. 나중에 돌아보면

이 결정이 틀렸다고 느낄 시점:

- 사용자 검증에서 "글자 흐림" / "입력 답답함" / "말풍선 너무 빨리 사라짐" 신호 누적 → D12/D13/D15 재검토 트리거.
- Step 3 (캐릭터 3D 모델) 후 RemotePlayer N명 말풍선 동시 표시 시 fps drop → D12 dispose 강화 또는 HTML overlay fallback.
- 모바일 트랙 시작 → D13 머리 위 input이 모바일에 부적합 (가상 키보드가 발화 위치를 가림) → 하단 고정으로 fallback 또는 모바일 별도 UI.

스케일이 바뀌면:

- 마을당 동시 발화 N명 ≥ 20 시 — 말풍선이 시야를 가림 → 일부 캐릭터만 보이는 LOD (가까운 것만).
- 메시지 길이 평균이 늘어남 (예: 도서관 깊은 대화) → 동적 시간 (글자수 비례) 검토.

## 11. 더 공부할 거리

- **Three.js Sprite vs Billboard 패턴** — [Three.js Sprite docs](https://threejs.org/docs/#api/en/objects/Sprite)
- **CanvasTexture 최적화 가이드** — [Three.js CanvasTexture](https://threejs.org/docs/#api/en/textures/CanvasTexture)
- **React + Three.js 결합 — R3F `<Html>` 컴포넌트** — drei 라이브러리로 HTML overlay 자동화 (본 트랙은 R3F 사용 X라서 미적용, 후속 검토).
- **IME 조합 처리 심화** — learning 49 `react-input-ime-handling.md` ⭐ 본 결정 D13 필독.
- **WebGL DPR 최적화** — 모든 캔버스의 DPR 함정. Retina에서 흐림 막는 법.
- **공간 채팅 UX 사례** — Animal Crossing / Stardew Valley / Mozilla Hubs UX teardown.
- **자막·읽기 속도 연구** — 넷플릭스 한국어 자막 규정, 카카오 i 자막 가이드로 시간 결정 근거 보강.

## 12. 참조

- spec: [`docs/specs/features/village-3d.md`](../specs/features/village-3d.md) §4 D12~D15
- learning [49 — React 입력 IME 조합 처리](./49-react-input-ime-handling.md) ⭐ D13 필독
- learning [72 — Phaser 2D → Three.js 3D 전환](./72-phaser-to-threejs-pivot-decision.md) (본 트랙 정정 사유)
- learning [78 — Next.js + Three.js + Howler dev 메모리 폭주 진단](./78-nextjs-three-howler-dev-memory-explosion-diagnosis.md) (Step 2, dispose 일반화)
- 외부 자료:
  - [Three.js Sprite](https://threejs.org/docs/#api/en/objects/Sprite)
  - [Three.js CanvasTexture](https://threejs.org/docs/#api/en/textures/CanvasTexture)
  - [drei `<Html>` 컴포넌트](https://github.com/pmndrs/drei#html) (R3F)
  - Mozilla Hubs UX docs / VRChat 채팅 패턴 / Animal Crossing 말풍선 패턴
