package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;
import com.maeum.gohyang.confession.error.InvalidConfessionLetterStateException;

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
@Table(name = "confession_letter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfessionLetterJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false)
    private @Nullable Long confessionId;

    @Column(nullable = false)
    private @Nullable Long senderUserId;

    @Column(nullable = false, length = ConfessionLetter.MAX_BODY_LENGTH)
    private @Nullable String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private @Nullable ConfessionLetterStatus status;

    @Column(nullable = false, updatable = false)
    private @Nullable LocalDateTime createdAt;

    private @Nullable LocalDateTime authorReadAt;

    public static ConfessionLetterJpaEntity from(ConfessionLetter letter) {
        ConfessionLetterJpaEntity e = new ConfessionLetterJpaEntity();
        e.id = letter.getId();
        e.confessionId = letter.getConfessionId();
        e.senderUserId = letter.getSenderUserId();
        e.body = letter.getBody();
        e.status = letter.getStatus();
        e.authorReadAt = letter.getAuthorReadAt();
        e.createdAt = letter.getCreatedAt();
        return e;
    }

    public ConfessionLetter toDomain() {
        if (confessionId == null || senderUserId == null || body == null || createdAt == null) {
            throw new InvalidConfessionLetterStateException();
        }
        return ConfessionLetter.restore(id, confessionId, senderUserId, body, status, authorReadAt, createdAt);
    }
}
