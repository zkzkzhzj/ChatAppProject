/**
 * 안식처 가드레일 6축 (spec D11) — 3D 에서 ZEP 메타버스 회귀 막는 상수.
 * 각 값 변경 시 spec D11 위반 신호 검토 (learning 72 §5).
 */

// 카메라 — 캐릭터 기준 orbit-follow. 이동 방향은 기존 월드 기준 유지.
export const CAMERA = {
  FOLLOW_LERP: 0.08, // 천천히 따라가는 결 (Stardew 결)
  FOV: 50,
  HEIGHT_OFFSET: 8,
  DISTANCE: 12,
  MIN_DISTANCE: 7,
  MAX_DISTANCE: 18,
  WHEEL_ZOOM_SENSITIVITY: 0.003,
  ORBIT_ENABLED: true as boolean,
  ORBIT_YAW_SENSITIVITY: 0.006,
  ORBIT_PITCH_SENSITIVITY: 0.004,
  ORBIT_MIN_PITCH: -0.85,
  ORBIT_MAX_PITCH: 0.25,
  ORBIT_INITIAL_YAW: 0,
  ORBIT_INITIAL_PITCH: -0.55,
} as const;

// 라이팅 — warm tone + soft shadow + Fog
export const LIGHTING = {
  AMBIENT_COLOR: 0xfff5e0, // warm tone (오후 햇살)
  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_COLOR: 0xffd9a3, // 따뜻한 햇빛
  DIRECTIONAL_INTENSITY: 0.9,
  DIRECTIONAL_POSITION: { x: 10, y: 20, z: 10 },
  FOG_COLOR: 0xf4e4c1, // 옅은 베이지 (포근한 결)
  FOG_NEAR: 30,
  FOG_FAR: 80,
  BACKGROUND: 0xe8d5a3, // 하늘 톤 (warm)
} as const;

// 물리 — 걷기 + 점프 (가벼운 깡총) + 뛰기 X
export const PHYSICS = {
  WALK_SPEED: 4, // units/s. 5 이상 = D11 위반 (VRChat 결)
  JUMP_VELOCITY: 5, // 점프 시작 속도
  JUMP_MAX_HEIGHT: 1, // 가벼운 깡총. 1 unit 초과 = D11 위반
  GRAVITY: 18,
  RUN_ENABLED: false, // D11 위반 시 true (사용자 결 박지 X)
} as const;

// 카메라 워크 — 페이드 + 천천히 zoom
export const TRANSITION = {
  FADE_DURATION_MS: 600, // Scene 전환 페이드
  CAMERA_ZOOM_LERP: 0.05,
} as const;

// 마을 레이아웃 (세로 구도 유지 — 입구·캠프파이어·연못·도서관)
// 2026-06-12 visual pass: 맵 확장 (radius 28→40). 좌표 변경 시 sound-config.ts 의
// point zone (캠프파이어·연못·숲 외곽) 좌표도 함께 갱신할 것.
export const VILLAGE = {
  WORLD_SIZE: 84, // 정사각 마을 외접 (FOREST_WALL_RADIUS 기준)
  ENTRY_Z: 32, // 입구 (남쪽, 캐릭터 spawn)
  CAMPFIRE_Z: 10,
  POND_X: -10, // 연못 중심 x (visual pass — 길에서 떨어뜨려 배치)
  POND_Z: -8,
  POND_RADIUS: 4.5,
  LIBRARY_Z: -27, // 도서관 (북쪽, 진입 트리거)
  LIBRARY_TRIGGER_RADIUS: 3, // 캐릭터가 이 반경 안에 들어오면 도서관 진입
  BOARD_TRIGGER_RADIUS: 4,
  FOREST_WALL_RADIUS: 40, // 숲 외곽 경계 (collision)
  TREE_COUNT: 76, // 숲 wall 둘레 트리
} as const;
