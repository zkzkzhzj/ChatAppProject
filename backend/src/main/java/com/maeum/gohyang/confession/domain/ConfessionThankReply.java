package com.maeum.gohyang.confession.domain;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.error.InvalidConfessionLetterContentException;

/**
 * 고백 작성자가 편지에 남기는 1회성 감사 답장.
 */
public class ConfessionThankReply {

    public static final int MAX_BODY_LENGTH = 500;

    private final Long id;
    private final long letterId;
    private final long authorUserId;
    private final String body;
    private final LocalDateTime createdAt;

    private ConfessionThankReply(Long id, long letterId, long authorUserId,
                                 String body, LocalDateTime createdAt) {
        this.id = id;
        this.letterId = letterId;
        this.authorUserId = authorUserId;
        this.body = body;
        this.createdAt = createdAt;
    }

    public static ConfessionThankReply newReply(long letterId, long authorUserId, String body) {
        validate(body);
        return new ConfessionThankReply(null, letterId, authorUserId, body.trim(), LocalDateTime.now());
    }

    public static ConfessionThankReply restore(Long id, long letterId, long authorUserId,
                                               String body, LocalDateTime createdAt) {
        validate(body);
        return new ConfessionThankReply(id, letterId, authorUserId, body.trim(), createdAt);
    }

    private static void validate(String body) {
        if (body == null || body.trim().isEmpty() || body.trim().length() > MAX_BODY_LENGTH) {
            throw new InvalidConfessionLetterContentException();
        }
    }

    public Long getId() {
        return id;
    }

    public long getLetterId() {
        return letterId;
    }

    public long getAuthorUserId() {
        return authorUserId;
    }

    public String getBody() {
        return body;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
