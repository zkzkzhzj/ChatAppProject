package com.maeum.gohyang.communication.domain;

import java.time.LocalDateTime;

/**
 * 채팅방 참여자 Domain Entity.
 * userId는 NPC 참여자의 경우 null이다.
 */
public class Participant {

    private static final String NPC_DISPLAY_NAME = "마을 주민";

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

    /** 채팅방 생성자(HOST) 참여자 신규 생성. */
    public static Participant newHost(long userId, long chatRoomId, String displayName) {
        return new Participant(null, userId, chatRoomId, displayName,
                ParticipantRole.HOST, EntryType.SYSTEM, LocalDateTime.now(), null);
    }

    /** 공개 채팅방 일반 참여자 신규 생성. */
    public static Participant newMember(long userId, long chatRoomId) {
        return new Participant(null, userId, chatRoomId, "주민",
                ParticipantRole.MEMBER, EntryType.PROXIMITY, LocalDateTime.now(), null);
    }

    /** NPC 참여자 신규 생성. userId = null. */
    public static Participant newNpc(long chatRoomId) {
        return new Participant(null, null, chatRoomId, NPC_DISPLAY_NAME,
                ParticipantRole.NPC, EntryType.SYSTEM, LocalDateTime.now(), null);
    }

    /** 영속화된 Participant 복원 (Persistence Adapter → Domain). */
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
