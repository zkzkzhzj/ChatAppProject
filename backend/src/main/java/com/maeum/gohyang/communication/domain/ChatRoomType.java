package com.maeum.gohyang.communication.domain;

/**
 * 채팅방 유형.
 * PUBLIC: 마을 공개 채팅 (채널당 1개).
 * NPC: 유저↔AI 주민 1:1 대화 (추후 Conversation으로 분리 예정).
 */
public enum ChatRoomType {
    PUBLIC,
    DIRECT,
    GROUP,
    NPC
}
