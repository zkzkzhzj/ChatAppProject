package com.maeum.gohyang.confession.domain;

import java.time.LocalDateTime;
import java.time.ZoneId;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.InvalidConfessionLetterContentException;

/**
 * 고백 작성자에게만 닿는 비공개 편지.
 * 공개 고백 상세, 목록, 사서 안내 컨텍스트에는 포함하지 않는다.
 */
public class ConfessionLetter {

    public static final int MAX_BODY_LENGTH = 1500;

    private final @Nullable Long id;
    private final long confessionId;
    private final long senderUserId;
    private final String body;
    private final ConfessionLetterStatus status;
    private final @Nullable LocalDateTime authorReadAt;
    private final LocalDateTime createdAt;

    private ConfessionLetter(@Nullable Long id, long confessionId, long senderUserId, String body,
                             ConfessionLetterStatus status, @Nullable LocalDateTime authorReadAt,
                             LocalDateTime createdAt) {
        this.id = id;
        this.confessionId = confessionId;
        this.senderUserId = senderUserId;
        this.body = body;
        this.status = status;
        this.authorReadAt = authorReadAt;
        this.createdAt = createdAt;
    }

    public static ConfessionLetter newLetter(long confessionId, long senderUserId, String body) {
        validate(body);
        return new ConfessionLetter(
                null,
                confessionId,
                senderUserId,
                body.trim(),
                ConfessionLetterStatus.SENT,
                null,
                LocalDateTime.now(ZoneId.systemDefault())
        );
    }

    public static ConfessionLetter restore(@Nullable Long id, long confessionId, long senderUserId,
                                           String body, @Nullable ConfessionLetterStatus status,
                                           LocalDateTime createdAt) {
        return restore(id, confessionId, senderUserId, body, status, null, createdAt);
    }

    public static ConfessionLetter restore(@Nullable Long id, long confessionId, long senderUserId,
                                           String body, @Nullable ConfessionLetterStatus status,
                                           @Nullable LocalDateTime authorReadAt, LocalDateTime createdAt) {
        validate(body);
        return new ConfessionLetter(id, confessionId, senderUserId, body.trim(),
                statusOrDefault(status), authorReadAt, createdAt);
    }

    public void assertSender(long userId) {
        if (senderUserId != userId) {
            throw new ConfessionAccessDeniedException();
        }
    }

    public boolean isSent() {
        return status == ConfessionLetterStatus.SENT;
    }

    public boolean isUnreadByAuthor() {
        return authorReadAt == null;
    }

    private static void validate(String body) {
        if (body == null || body.trim().isEmpty() || body.trim().length() > MAX_BODY_LENGTH) {
            throw new InvalidConfessionLetterContentException();
        }
    }

    private static ConfessionLetterStatus statusOrDefault(@Nullable ConfessionLetterStatus status) {
        return status == null ? ConfessionLetterStatus.SENT : status;
    }

    public @Nullable Long getId() {
        return id;
    }

    public long getConfessionId() {
        return confessionId;
    }

    public long getSenderUserId() {
        return senderUserId;
    }

    public String getBody() {
        return body;
    }

    public ConfessionLetterStatus getStatus() {
        return status;
    }

    public @Nullable LocalDateTime getAuthorReadAt() {
        return authorReadAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
