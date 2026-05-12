import { type PositionBroadcast, sendPosition } from '@/lib/websocket/stompClient';

/**
 * 멀티유저 위치 송신·필터 (Step 1.5).
 *
 * - 송신: Character 이동 시 throttle + 위치 변화 임계값 통과해야 sender 호출.
 *   Three.js ground 평면의 z 를 백엔드 contract y 에 매핑한다 (옛 Phaser 2D 호환).
 * - heartbeat: 변화 없어도 HEARTBEAT_MS 마다 1회 송신. backend 가 새 connection
 *   에 idle user snapshot 결 안 보내므로 (변화 시점에만 broadcast), idle user 결
 *   새로 join 한 사람한테 안 보이는 한계를 client heartbeat 결로 가린다.
 * - self filter: 자기 displayId 와 일치하는 broadcast 는 다른 유저로 처리 X.
 * - reset: Scene 전환·unmount 시 throttle 상태 초기화.
 *
 * sender 는 기본값 = `sendPosition` (STOMP publish). 테스트에서 모킹 함수 주입 가능.
 * ES Modules 의 named export 는 `vi.spyOn` 으로 가로채기 어려워 DI 로 testability 확보.
 */
export const THROTTLE_MS = 100;
export const HEARTBEAT_MS = 2000;
export const POSITION_EPSILON = 0.01;

export type PositionSender = (x: number, y: number) => void;

export class PositionSync {
  private selfId: string | null = null;
  // -Infinity 로 박아 첫 호출이 now=0 일 때도 throttle 통과. 0 으로 두면 now=0 호출 시
  // 0 - 0 = 0 < THROTTLE_MS 로 첫 송신이 차단된다 (테스트·실제 양쪽 결 동일 문제).
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private lastX = Number.NaN;
  private lastZ = Number.NaN;

  constructor(private readonly sender: PositionSender = sendPosition) {}

  setSelfId(id: string | null): void {
    this.selfId = id;
  }

  /** 자기 ID 와 일치하면 false (다른 유저 placeholder 로 렌더 X). */
  shouldRender(pos: PositionBroadcast): boolean {
    if (this.selfId == null) return true;
    return pos.id !== this.selfId;
  }

  /**
   * Three.js (x, z) 좌표를 백엔드 contract (x, y) 로 매핑해 송신.
   * throttle 통과 + 직전 송신 대비 변화 임계값 이상일 때만 발신.
   * 반환 = 실제 송신 여부 (테스트 검증용).
   */
  sendIfChanged(x: number, z: number, now: number = performance.now()): boolean {
    if (now - this.lastSentAt < THROTTLE_MS) return false;

    const hasLast = Number.isFinite(this.lastX);
    const heartbeatDue = now - this.lastSentAt >= HEARTBEAT_MS;

    // 변화 임계값 미만 결 일반적으로 송신 X — 단 heartbeat 주기 도래 시 강제 송신
    if (hasLast && !heartbeatDue) {
      const dx = Math.abs(x - this.lastX);
      const dz = Math.abs(z - this.lastZ);
      if (dx < POSITION_EPSILON && dz < POSITION_EPSILON) return false;
    }

    this.sender(x, z);
    this.lastSentAt = now;
    this.lastX = x;
    this.lastZ = z;
    return true;
  }

  reset(): void {
    this.lastSentAt = Number.NEGATIVE_INFINITY;
    this.lastX = Number.NaN;
    this.lastZ = Number.NaN;
  }
}
