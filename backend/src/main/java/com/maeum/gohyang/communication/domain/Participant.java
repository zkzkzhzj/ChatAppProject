package com.maeum.gohyang.communication.domain;

import java.time.LocalDateTime;

public class Participant {

    private final Long id;
    private final Long userId;
    private final Long chatRoomId;
    private final String displayName;
    private final ParticipantRole role;
    private final EntryType entryType;
    private final LocalDateTime joinedAt;
    private final LocalDateTime leftAt;

    private Participant(Long id, Long userId, Long chatRoomId, String displayName,
                        ParticipantRole role, EntryType entryType,
                        LocalDateTime joinedAt, LocalDateTime leftAt) {
        this.id = id;
        this.userId = userId;
        this.chatRoomId = chatRoomId;
        this.displayName = displayName;
        this.role = role;
        this.entryType = entryType;
        this.joinedAt = joinedAt;
        this.leftAt = leftAt;
    }

    public static Participant newMember(long userId, long chatRoomId) {
        return new Participant(null, userId, chatRoomId, "resident",
                ParticipantRole.MEMBER, EntryType.PROXIMITY, LocalDateTime.now(), null);
    }

    public static Participant restore(Long id, Long userId, Long chatRoomId, String displayName,
                                      ParticipantRole role, EntryType entryType,
                                      LocalDateTime joinedAt, LocalDateTime leftAt) {
        return new Participant(id, userId, chatRoomId, displayName, role, entryType, joinedAt, leftAt);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getChatRoomId() {
        return chatRoomId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public ParticipantRole getRole() {
        return role;
    }

    public EntryType getEntryType() {
        return entryType;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public LocalDateTime getLeftAt() {
        return leftAt;
    }
}
