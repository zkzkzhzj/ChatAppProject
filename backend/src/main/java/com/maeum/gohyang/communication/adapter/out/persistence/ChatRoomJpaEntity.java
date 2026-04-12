package com.maeum.gohyang.communication.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.communication.domain.ChatRoom;
import com.maeum.gohyang.communication.domain.ChatRoomStatus;
import com.maeum.gohyang.communication.domain.ChatRoomType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "chat_room")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoomJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRoomType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRoomStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime closedAt;

    public static ChatRoomJpaEntity from(ChatRoom chatRoom) {
        ChatRoomJpaEntity e = new ChatRoomJpaEntity();
        e.title = chatRoom.getTitle();
        e.type = chatRoom.getType();
        e.status = chatRoom.getStatus();
        e.createdAt = chatRoom.getCreatedAt();
        e.closedAt = chatRoom.getClosedAt();
        return e;
    }

    public ChatRoom toDomain() {
        return ChatRoom.restore(id, title, type, status, createdAt, closedAt);
    }
}
