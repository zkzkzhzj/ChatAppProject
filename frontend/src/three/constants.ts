/**
 * 안식처 가드레일 6축 (spec D11) — 3D 에서 ZEP 메타버스 회귀 막는 상수.
 * 각 값 변경 시 spec D11 위반 신호 검토 (learning 72 §5).
 */

// 카메라 — 정적 follow, orbit 자유 회전 X
export const CAMERA = {
  FOLLOW_LERP: 0.08, // 천천히 따라가는 결 (Stardew 결)
  FOV: 50,
  HEIGHT_OFFSET: 8,
  DISTANCE: 12,
  ORBIT_ENABLED: false, // D11 위반 시 true (사용자 결 박지 X)
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

// 마을 레이아웃 (사용자 결, 2026-05-10 — 입구·캠프파이어·연못·도서관 세로 구도)
export const VILLAGE = {
  WORLD_SIZE: 60, // 정사각 마을, 60×60 units
  ENTRY_Z: 25, // 입구 (남쪽, 캐릭터 spawn)
  CAMPFIRE_Z: 8,
  POND_Z: -5,
  LIBRARY_Z: -22, // 도서관 (북쪽, 진입 트리거)
  LIBRARY_TRIGGER_RADIUS: 3, // 캐릭터가 이 반경 안에 들어오면 도서관 진입
  FOREST_WALL_RADIUS: 28, // 숲 외곽 경계 (collision)
  TREE_COUNT: 40, // 숲 wall 둘레 트리
} as const;
