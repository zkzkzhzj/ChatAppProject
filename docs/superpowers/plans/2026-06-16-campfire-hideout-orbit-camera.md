# Campfire Hideout Orbit Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중앙 모닥불을 대화 아지트 랜드마크로 강화하고, 마우스로 캐릭터 주변을 360도 둘러볼 수 있는 orbit-follow 카메라를 추가한다.

**Architecture:** 기존 Three.js 경계 안에서 처리한다. `InputState`는 키보드/조이스틱/포인터 카메라 입력을 소유하고, `SceneManager`는 매 프레임 카메라 입력을 읽어 활성 scene에 전달한다. `VillageScene`은 캐릭터 위치와 orbit 상태를 받아 카메라 위치를 계산하고, `villageDecor`는 결정적 배치로 모닥불 주변 아지트 오브젝트를 추가한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js r184, Vitest, jsdom.

---

## 파일 구조

- Modify: `frontend/src/three/constants.ts`
  - `CAMERA`에 orbit yaw/pitch/distance/sensitivity 상수를 추가한다.
- Modify: `frontend/src/three/input.ts`
  - primary pointer drag 상태와 orbit delta 누적값을 관리한다.
  - input/textarea 위 포인터 이벤트는 무시한다.
- Modify: `frontend/src/three/input.test.ts`
  - pointer drag 시작/이동/종료, 입력 요소 무시, destroy 후 이벤트 무시를 검증한다.
- Modify: `frontend/src/three/SceneManager.ts`
  - renderer canvas를 `InputState`에 전달한다.
  - 매 프레임 `consumeCameraOrbitDelta()`를 읽어 scene 카메라 업데이트에 전달한다.
- Modify: `frontend/src/three/scenes/VillageScene.ts`
  - orbit yaw/pitch 상태를 보관하고, 캐릭터 기준 spherical camera 위치를 계산한다.
  - library scene 전환과 remote player 흐름은 건드리지 않는다.
- Modify: `frontend/src/three/scenes/villageDecor.ts`
  - 모닥불 주변 원형 흙길, 좌석 보강, 낮은 랜턴, 작은 소품, 빛 입자를 추가한다.
- Modify: `frontend/src/three/scenes/villageDecor.test.ts`
  - 데코가 결정적으로 생성되는지, 모닥불 아지트 오브젝트가 존재하는지 검증한다.

주의:

- 현재 작업트리에 기존 비주얼 패스 변경과 GLB 삭제 스테이징이 있다. 이 계획을 실행할 때는 각 커밋마다 `git diff --cached --name-status`를 확인하고, 계획에 적힌 파일만 stage한다.
- 편지함 중복 문구 제거와 영상방 기능은 이 계획 범위가 아니다.

---

### Task 1: Pointer Orbit Input

**Files:**

- Modify: `frontend/src/three/input.ts`
- Modify: `frontend/src/three/input.test.ts`

- [ ] **Step 1: 실패하는 pointer orbit 테스트 추가**

`frontend/src/three/input.test.ts`에 다음 describe 블록을 추가한다.

```ts
describe('camera orbit pointer input', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    input.bindCameraElement(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
  });

  it('primary pointer drag delta를 누적한 뒤 consume 시 0으로 초기화한다', () => {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 0,
        isPrimary: true,
      }),
    );
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }));

    expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 30, pitch: -15 });
    expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
  });

  it('secondary pointer와 입력 요소 위 pointerdown은 orbit drag를 시작하지 않는다', () => {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 2,
        isPrimary: true,
      }),
    );
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }));
    expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = new PointerEvent('pointerdown', {
      pointerId: 2,
      clientX: 100,
      clientY: 100,
      button: 0,
      isPrimary: true,
    });
    Object.defineProperty(event, 'target', { value: textarea });
    canvas.dispatchEvent(event);
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 130, clientY: 85 }));
    expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
    document.body.removeChild(textarea);
  });

  it('pointerup 이후 move는 orbit delta를 만들지 않는다', () => {
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        button: 0,
        isPrimary: true,
      }),
    );
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 85 }));

    expect(input.consumeCameraOrbitDelta()).toEqual({ yaw: 0, pitch: 0 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```powershell
npm.cmd run test:run -- input.test.ts
```

Expected: `bindCameraElement` 또는 `consumeCameraOrbitDelta`가 없어서 실패한다.

- [ ] **Step 3: `InputState`에 pointer orbit 상태 구현**

`frontend/src/three/input.ts`의 `InputState`에 다음 필드와 메서드를 추가한다.

```ts
private cameraElement: HTMLElement | null = null;
private orbitPointerId: number | null = null;
private orbitLastX = 0;
private orbitLastY = 0;
private orbitYawDelta = 0;
private orbitPitchDelta = 0;

bindCameraElement(element: HTMLElement): void {
  if (this.cameraElement === element) return;
  if (this.cameraElement) {
    this.cameraElement.removeEventListener('pointerdown', this.onPointerDown);
  }
  this.cameraElement = element;
  this.cameraElement.addEventListener('pointerdown', this.onPointerDown);
}

consumeCameraOrbitDelta(): { yaw: number; pitch: number } {
  const delta = { yaw: this.orbitYawDelta, pitch: this.orbitPitchDelta };
  this.orbitYawDelta = 0;
  this.orbitPitchDelta = 0;
  return delta;
}
```

같은 클래스에 포인터 핸들러를 추가한다.

```ts
private onPointerDown = (e: PointerEvent): void => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (!e.isPrimary || e.button !== 0) return;

  this.orbitPointerId = e.pointerId;
  this.orbitLastX = e.clientX;
  this.orbitLastY = e.clientY;
  window.addEventListener('pointermove', this.onPointerMove);
  window.addEventListener('pointerup', this.onPointerUp);
  window.addEventListener('pointercancel', this.onPointerUp);
};

private onPointerMove = (e: PointerEvent): void => {
  if (this.orbitPointerId !== e.pointerId) return;

  this.orbitYawDelta += e.clientX - this.orbitLastX;
  this.orbitPitchDelta += e.clientY - this.orbitLastY;
  this.orbitLastX = e.clientX;
  this.orbitLastY = e.clientY;
};

private onPointerUp = (e: PointerEvent): void => {
  if (this.orbitPointerId !== e.pointerId) return;

  this.orbitPointerId = null;
  window.removeEventListener('pointermove', this.onPointerMove);
  window.removeEventListener('pointerup', this.onPointerUp);
  window.removeEventListener('pointercancel', this.onPointerUp);
};
```

`release()`에 포인터 상태 해제를 추가한다.

```ts
this.orbitPointerId = null;
this.orbitYawDelta = 0;
this.orbitPitchDelta = 0;
window.removeEventListener('pointermove', this.onPointerMove);
window.removeEventListener('pointerup', this.onPointerUp);
window.removeEventListener('pointercancel', this.onPointerUp);
```

`destroy()`에는 camera element listener 제거를 추가한다.

```ts
if (this.cameraElement) {
  this.cameraElement.removeEventListener('pointerdown', this.onPointerDown);
  this.cameraElement = null;
}
window.removeEventListener('pointermove', this.onPointerMove);
window.removeEventListener('pointerup', this.onPointerUp);
window.removeEventListener('pointercancel', this.onPointerUp);
```

- [ ] **Step 4: pointer orbit 테스트 통과 확인**

Run:

```powershell
npm.cmd run test:run -- input.test.ts
```

Expected: `input.test.ts` 전체 PASS.

- [ ] **Step 5: 커밋**

Stage 전에 확인:

```powershell
git diff --cached --name-status
```

Stage and commit:

```powershell
git add frontend\src\three\input.ts frontend\src\three\input.test.ts
git commit -m "Add camera orbit pointer input"
```

---

### Task 2: Orbit-Follow Camera

**Files:**

- Modify: `frontend/src/three/constants.ts`
- Modify: `frontend/src/three/SceneManager.ts`
- Modify: `frontend/src/three/scenes/VillageScene.ts`

- [ ] **Step 1: 카메라 상수 추가**

`frontend/src/three/constants.ts`의 `CAMERA`를 다음 형태로 확장한다.

```ts
export const CAMERA = {
  FOLLOW_LERP: 0.08,
  FOV: 50,
  HEIGHT_OFFSET: 8,
  DISTANCE: 12,
  ORBIT_ENABLED: true,
  ORBIT_YAW_SENSITIVITY: 0.006,
  ORBIT_PITCH_SENSITIVITY: 0.004,
  ORBIT_MIN_PITCH: -0.85,
  ORBIT_MAX_PITCH: 0.25,
  ORBIT_INITIAL_YAW: 0,
  ORBIT_INITIAL_PITCH: -0.55,
} as const;
```

- [ ] **Step 2: `VillageScene.updateCamera` 시그니처 변경**

`frontend/src/three/scenes/VillageScene.ts`에서 카메라 orbit 상태 필드를 추가한다.

```ts
private cameraYaw = CAMERA.ORBIT_INITIAL_YAW;
private cameraPitch = CAMERA.ORBIT_INITIAL_PITCH;
```

`updateCamera`를 다음 형태로 바꾼다.

```ts
updateCamera(
  camera: THREE.PerspectiveCamera,
  orbitDelta: { yaw: number; pitch: number } = { yaw: 0, pitch: 0 },
): void {
  const target = this.character.position;

  if (CAMERA.ORBIT_ENABLED) {
    this.cameraYaw -= orbitDelta.yaw * CAMERA.ORBIT_YAW_SENSITIVITY;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - orbitDelta.pitch * CAMERA.ORBIT_PITCH_SENSITIVITY,
      CAMERA.ORBIT_MIN_PITCH,
      CAMERA.ORBIT_MAX_PITCH,
    );

    const horizontalDistance = Math.cos(this.cameraPitch) * CAMERA.DISTANCE;
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.cameraYaw) * horizontalDistance,
      target.y + CAMERA.HEIGHT_OFFSET + Math.sin(this.cameraPitch) * CAMERA.DISTANCE,
      target.z + Math.cos(this.cameraYaw) * horizontalDistance,
    );
    camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
    camera.lookAt(target.x, target.y + 1, target.z);
    return;
  }

  const desired = new THREE.Vector3(
    target.x,
    target.y + CAMERA.HEIGHT_OFFSET,
    target.z + CAMERA.DISTANCE,
  );
  camera.position.lerp(desired, CAMERA.FOLLOW_LERP);
  camera.lookAt(target.x, target.y + 1, target.z);
}
```

- [ ] **Step 3: `SceneManager`에서 canvas 입력 연결**

`frontend/src/three/SceneManager.ts` 생성자에서 `this.input = new InputState();` 직후 다음 줄을 추가한다.

```ts
this.input.bindCameraElement(this.renderer.domElement);
```

tick의 카메라 업데이트 구간을 다음처럼 바꾼다.

```ts
const orbitDelta = this.input.consumeCameraOrbitDelta();
sceneObj.updateCamera(this.camera, orbitDelta);
```

기존 `sceneObj.updateCamera(this.camera);` 호출은 제거한다.

- [ ] **Step 4: TypeScript 오류 확인**

Run:

```powershell
npm.cmd run test:run -- input.test.ts
```

Expected: PASS.

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: TypeScript 오류 없음.

- [ ] **Step 5: 커밋**

Stage 전에 확인:

```powershell
git diff --cached --name-status
```

Stage and commit:

```powershell
git add frontend\src\three\constants.ts frontend\src\three\SceneManager.ts frontend\src\three\scenes\VillageScene.ts
git commit -m "Add orbit follow camera"
```

---

### Task 3: Campfire Hideout Decor

**Files:**

- Modify: `frontend/src/three/scenes/villageDecor.ts`
- Modify: `frontend/src/three/scenes/villageDecor.test.ts`

- [ ] **Step 1: 실패하는 모닥불 아지트 데코 테스트 추가**

`frontend/src/three/scenes/villageDecor.test.ts`에 다음 테스트를 추가한다.

```ts
it('모닥불 주변에 대화 아지트 전용 오브젝트가 결정적으로 배치된다', () => {
  const scene = new THREE.Scene();
  buildVillageDecor(scene);
  scene.updateMatrixWorld(true);

  const hideoutObjects: string[] = [];
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Object3D)) return;
    if (obj.userData.villageDecorRole) {
      hideoutObjects.push(String(obj.userData.villageDecorRole));
    }
  });

  expect(hideoutObjects.filter((role) => role === 'campfire-seat')).toHaveLength(6);
  expect(hideoutObjects.filter((role) => role === 'campfire-lantern')).toHaveLength(5);
  expect(hideoutObjects).toContain('campfire-gathering-ring');
  expect(hideoutObjects).toContain('campfire-keepsake-sign');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```powershell
npm.cmd run test:run -- villageDecor.test.ts
```

Expected: `villageDecorRole`을 가진 오브젝트가 없어 실패한다.

- [ ] **Step 3: 모닥불 아지트 빌더 추가**

`frontend/src/three/scenes/villageDecor.ts`에 다음 함수를 추가한다.

```ts
function tagDecor<T extends THREE.Object3D>(obj: T, role: string): T {
  obj.userData.villageDecorRole = role;
  return obj;
}

function buildCampfireHideout(scene: THREE.Scene): void {
  const fireZ = VILLAGE.CAMPFIRE_Z;

  const ring = tagDecor(
    new THREE.Mesh(
      new THREE.RingGeometry(3.2, 5.4, 48),
      new THREE.MeshLambertMaterial({ color: 0xb98f5f, transparent: true, opacity: 0.78 }),
    ),
    'campfire-gathering-ring',
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.018, fireZ);
  scene.add(ring);

  const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5636 });
  const seatTopMaterial = new THREE.MeshLambertMaterial({ color: 0xb68a5a });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(angle) * 4.25;
    const z = fireZ + Math.sin(angle) * 4.25;
    const seat = tagDecor(
      new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.5, 10), seatMaterial),
      'campfire-seat',
    );
    seat.position.set(x, 0.25, z);
    seat.rotation.y = -angle;
    seat.castShadow = true;
    scene.add(seat);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 10), seatTopMaterial);
    top.position.set(x, 0.53, z);
    scene.add(top);
  }

  const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3525 });
  const glowMaterial = new THREE.MeshLambertMaterial({
    color: 0xffd58a,
    emissive: 0xffa84a,
    emissiveIntensity: 0.9,
  });
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const x = Math.cos(angle) * 5.7;
    const z = fireZ + Math.sin(angle) * 5.7;
    const post = tagDecor(
      new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), postMaterial),
      'campfire-lantern',
    );
    post.position.set(x, 0.7, z);
    post.castShadow = true;
    scene.add(post);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glowMaterial);
    glow.position.set(x, 1.45, z);
    scene.add(glow);
  }

  const sign = tagDecor(
    new THREE.Group(),
    'campfire-keepsake-sign',
  );
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), postMaterial);
  signPost.position.set(-5.2, 0.45, fireZ - 1.5);
  sign.add(signPost);
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.42, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xc99a62 }),
  );
  signBoard.position.set(-5.2, 1.0, fireZ - 1.5);
  signBoard.rotation.y = 0.35;
  sign.add(signBoard);
  scene.add(sign);
}
```

`buildVillageDecor`에서 기존 데코 생성 흐름 중 `buildInnerTrees(scene, rng);` 뒤에 호출한다.

```ts
buildCampfireHideout(scene);
```

- [ ] **Step 4: 모닥불 데코 테스트 통과 확인**

Run:

```powershell
npm.cmd run test:run -- villageDecor.test.ts
```

Expected: `villageDecor.test.ts` 전체 PASS.

- [ ] **Step 5: 커밋**

Stage 전에 확인:

```powershell
git diff --cached --name-status
```

Stage and commit:

```powershell
git add frontend\src\three\scenes\villageDecor.ts frontend\src\three\scenes\villageDecor.test.ts
git commit -m "Enhance campfire hideout decor"
```

---

### Task 4: Final Verification

**Files:**

- No planned source edits.

- [ ] **Step 1: 집중 테스트 실행**

Run:

```powershell
npm.cmd run test:run -- input.test.ts villageDecor.test.ts
```

Expected: both suites PASS.

- [ ] **Step 2: 프론트엔드 전체 테스트 실행**

Run:

```powershell
npm.cmd run test:run
```

Expected: all frontend tests PASS.

- [ ] **Step 3: TypeScript 검증**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: 로컬 앱 수동 확인**

Run:

```powershell
npm.cmd run dev
```

Expected:

- dev server starts successfully.
- 마을 중앙 모닥불 주변이 대화 아지트로 보인다.
- canvas 위 primary pointer drag로 카메라가 360도 회전한다.
- pitch가 제한되어 땅 밑이나 장면 밖으로 빠지지 않는다.
- WASD 이동이 기존 의미대로 동작한다.
- 채팅 입력 중에는 키보드 입력이 캐릭터 이동을 만들지 않는다.
- 모바일 폭에서 가상 조이스틱이 계속 보이고 입력 가능하다.

- [ ] **Step 5: 최종 상태 확인**

Run:

```powershell
git status --short
git diff --cached --name-status
```

Expected:

- 의도한 커밋이 모두 생성되어 있다.
- 기존 비주얼 패스 변경과 GLB 삭제 스테이징 상태가 사용자 의도와 다르게 섞이지 않았다.
- `.superpowers/` 임시 디렉터리는 커밋하지 않는다.

---

## 자체 검토

- Spec coverage:
  - 모닥불 시그니처 강화는 Task 3에서 처리한다.
  - 360도 mouse orbit은 Task 1, Task 2에서 처리한다.
  - 이동 방향을 카메라 기준으로 바꾸지 않는 조건은 Task 2에서 `Character.update` 입력 의미를 유지해서 만족한다.
  - 새 공개 에셋을 추가하지 않는 조건은 Task 3의 primitive mesh 방식으로 만족한다.
  - 테스트 요구는 Task 1, Task 3, Task 4에서 만족한다.
- Placeholder scan:
  - 이 계획에는 비워둔 구현 항목이나 결정되지 않은 단계가 없다.
- Type consistency:
  - `bindCameraElement`, `consumeCameraOrbitDelta`, `updateCamera(camera, orbitDelta)` 시그니처를 Task 1과 Task 2에서 일관되게 사용한다.
