package com.maeum.gohyang.communication.domain;

import java.time.LocalDateTime;

/**
 * Communication Context의 채팅방 Domain Entity.
 * 순수 POJO — 인프라 기술에 의존하지 않는다.
 */
public class ChatRoom {

    private final Long id;
    private final String title;
    private final ChatRoomType type;
    private final ChatRoomStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime closedAt;

    private ChatRoom(Long id, String title, ChatRoomType type, ChatRoomStatus status,
                     LocalDateTime createdAt, LocalDateTime closedAt) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.status = status;
        this.createdAt = createdAt;
        this.closedAt = closedAt;
    }

    /** NPC 채팅방 신규 생성. id는 영속화 이후 부여된다. */
    public static ChatRoom newNpcRoom() {
        return new ChatRoom(null, "마을 주민과의 대화", ChatRoomType.NPC, ChatRoomStatus.ACTIVE,
                LocalDateTime.now(), null);
    }

    /** 영속화된 ChatRoom 복원 (Persistence Adapter → Domain). */
    public static ChatRoom restore(Long id, String title, ChatRoomType type, ChatRoomStatus status,
                                   LocalDateTime createdAt, LocalDateTime closedAt) {
        return new ChatRoom(id, title, type, status, createdAt, closedAt);
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public ChatRoomType getType() {
        return type;
    }

    public ChatRoomStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }
}
