package com.maeum.gohyang.communication.adapter.in.websocket.v2.protocol;

/**
 * raw WebSocket(/ws/v2) 메시지 envelope의 종류.
 *
 * 4종은 클라이언트 → 서버, 3종은 서버 → 클라이언트로만 흘러간다.
 * 한 enum으로 합쳐두는 이유: JSON `type` 필드 매핑이 양방향 모두 동일하고,
 * 하나의 프로토콜 카탈로그로 읽히는 편이 클라이언트 구현자에게 더 유리하기 때문.
 */
public enum EnvelopeType {

    // Inbound — Client -> Server
    SUBSCRIBE,
    UNSUBSCRIBE,
    PUBLISH,
    POSITION,
    TYPING,
    PING,

    // Outbound — Server -> Client
    MESSAGE,
    POSITION_UPDATE,
    TYPING_UPDATE,
    ERROR,
    PONG
}
