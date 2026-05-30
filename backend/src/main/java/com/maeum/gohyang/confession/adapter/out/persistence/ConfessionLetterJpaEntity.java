package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;

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
    private Long id;

    @Column(nullable = false)
    private Long confessionId;

    @Column(nullable = false)
    private Long senderUserId;

    @Column(nullable = false, length = ConfessionLetter.MAX_BODY_LENGTH)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConfessionLetterStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static ConfessionLetterJpaEntity from(ConfessionLetter letter) {
        ConfessionLetterJpaEntity e = new ConfessionLetterJpaEntity();
        e.id = letter.getId();
        e.confessionId = letter.getConfessionId();
        e.senderUserId = letter.getSenderUserId();
        e.body = letter.getBody();
        e.status = letter.getStatus();
        e.createdAt = letter.getCreatedAt();
        return e;
    }

    public ConfessionLetter toDomain() {
        return ConfessionLetter.restore(id, confessionId, senderUserId, body, status, createdAt);
    }
}
