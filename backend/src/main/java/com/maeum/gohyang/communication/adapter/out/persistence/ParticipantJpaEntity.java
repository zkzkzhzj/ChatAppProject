package com.maeum.gohyang.communication.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.communication.domain.EntryType;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.domain.ParticipantRole;

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
@Table(name = "participant")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ParticipantJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;  // NPC면 NULL

    @Column(nullable = false)
    private Long chatRoomId;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipantRole participantRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType entryType;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    private LocalDateTime leftAt;

    public static ParticipantJpaEntity from(Participant participant) {
        ParticipantJpaEntity e = new ParticipantJpaEntity();
        e.userId = participant.getUserId();
        e.chatRoomId = participant.getChatRoomId();
        e.displayName = participant.getDisplayName();
        e.participantRole = participant.getRole();
        e.entryType = participant.getEntryType();
        e.joinedAt = participant.getJoinedAt();
        e.leftAt = participant.getLeftAt();
        return e;
    }

    public Participant toDomain() {
        return Participant.restore(id, userId, chatRoomId, displayName,
                participantRole, entryType, joinedAt, leftAt);
    }
}
