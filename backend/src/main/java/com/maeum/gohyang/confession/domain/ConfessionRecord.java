package com.maeum.gohyang.confession.domain;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.InvalidConfessionContentException;

/**
 * 도서관에 꽂히는 익명 고백 기록 Domain Entity.
 * 작성자 식별자는 권한 확인용으로만 보관하고 외부 응답에는 노출하지 않는다.
 */
public class ConfessionRecord {

    public static final int MAX_TITLE_LENGTH = 120;
    public static final int MAX_BODY_LENGTH = 3000;

    private final Long id;
    private final long authorUserId;
    private final String title;
    private final String body;
    private final ConfessionBookshelf bookshelf;
    private final ConfessionStatus status;
    private final ConfessionRiskLevel riskLevel;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private ConfessionRecord(Long id, long authorUserId, String title, String body,
                             ConfessionBookshelf bookshelf, ConfessionStatus status,
                             ConfessionRiskLevel riskLevel, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
        this.id = id;
        this.authorUserId = authorUserId;
        this.title = title;
        this.body = body;
        this.bookshelf = bookshelf;
        this.status = status;
        this.riskLevel = riskLevel;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /** 새 고백 기록 생성. id는 영속화 이후 부여된다. */
    public static ConfessionRecord newRecord(long authorUserId, String title, String body,
                                             ConfessionBookshelf bookshelf,
                                             ConfessionRiskLevel riskLevel) {
        validate(title, body);
        LocalDateTime now = LocalDateTime.now();
        return new ConfessionRecord(null, authorUserId, title.trim(), body.trim(),
                bookshelfOrDefault(bookshelf), ConfessionStatus.VISIBLE,
                riskLevelOrDefault(riskLevel), now, now);
    }

    /** 영속화된 고백 기록 복원 (Persistence Adapter -> Domain). */
    public static ConfessionRecord restore(Long id, long authorUserId, String title, String body,
                                           ConfessionBookshelf bookshelf, ConfessionStatus status,
                                           ConfessionRiskLevel riskLevel, LocalDateTime createdAt,
                                           LocalDateTime updatedAt) {
        validate(title, body);
        return new ConfessionRecord(id, authorUserId, title.trim(), body.trim(),
                bookshelfOrDefault(bookshelf), statusOrDefault(status),
                riskLevelOrDefault(riskLevel), createdAt, updatedAt);
    }

    /** 작성자가 고백 기록을 삭제하면 공개 목록에서 제외된다. */
    public ConfessionRecord deleteByAuthor(long requesterUserId) {
        if (authorUserId != requesterUserId) {
            throw new ConfessionAccessDeniedException();
        }
        return new ConfessionRecord(id, authorUserId, title, body, bookshelf,
                ConfessionStatus.DELETED, riskLevel, createdAt, LocalDateTime.now());
    }

    public boolean isVisible() {
        return status == ConfessionStatus.VISIBLE;
    }

    public boolean isAuthor(long userId) {
        return authorUserId == userId;
    }

    public boolean canBeShownToLibrarian() {
        return status == ConfessionStatus.VISIBLE
                && (riskLevel == ConfessionRiskLevel.LOW || riskLevel == ConfessionRiskLevel.MEDIUM);
    }

    private static void validate(String title, String body) {
        if (isBlank(title) || title.trim().length() > MAX_TITLE_LENGTH) {
            throw new InvalidConfessionContentException();
        }
        if (isBlank(body) || body.trim().length() > MAX_BODY_LENGTH) {
            throw new InvalidConfessionContentException();
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static ConfessionBookshelf bookshelfOrDefault(ConfessionBookshelf bookshelf) {
        return bookshelf == null ? ConfessionBookshelf.GENERAL : bookshelf;
    }

    private static ConfessionStatus statusOrDefault(ConfessionStatus status) {
        return status == null ? ConfessionStatus.VISIBLE : status;
    }

    private static ConfessionRiskLevel riskLevelOrDefault(ConfessionRiskLevel riskLevel) {
        return riskLevel == null ? ConfessionRiskLevel.LOW : riskLevel;
    }

    public Long getId() {
        return id;
    }

    public long getAuthorUserId() {
        return authorUserId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public ConfessionBookshelf getBookshelf() {
        return bookshelf;
    }

    public ConfessionStatus getStatus() {
        return status;
    }

    public ConfessionRiskLevel getRiskLevel() {
        return riskLevel;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
