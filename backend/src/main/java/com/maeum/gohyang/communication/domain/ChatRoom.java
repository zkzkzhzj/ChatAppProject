package com.maeum.gohyang.communication.domain;

import java.time.LocalDateTime;

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
