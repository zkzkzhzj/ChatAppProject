package com.maeum.gohyang.confession.adapter.out.persistence;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "confession_thank_reply")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConfessionThankReplyJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long letterId;

    @Column(nullable = false)
    private Long authorUserId;

    @Column(nullable = false, length = ConfessionThankReply.MAX_BODY_LENGTH)
    private String body;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static ConfessionThankReplyJpaEntity from(ConfessionThankReply reply) {
        ConfessionThankReplyJpaEntity e = new ConfessionThankReplyJpaEntity();
        e.id = reply.getId();
        e.letterId = reply.getLetterId();
        e.authorUserId = reply.getAuthorUserId();
        e.body = reply.getBody();
        e.createdAt = reply.getCreatedAt();
        return e;
    }

    public ConfessionThankReply toDomain() {
        return ConfessionThankReply.restore(id, letterId, authorUserId, body, createdAt);
    }
}
