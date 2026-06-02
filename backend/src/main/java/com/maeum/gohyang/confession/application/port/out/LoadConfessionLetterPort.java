package com.maeum.gohyang.confession.application.port.out;

import java.util.List;
import java.util.Optional;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface LoadConfessionLetterPort {

    Optional<ConfessionLetter> loadLetter(long letterId);

    List<ConfessionLetter> loadReceived(long confessionId);

    List<ConfessionLetter> loadReceivedForAuthor(long authorUserId);

    long countUnreadReceivedForAuthor(long authorUserId);

    /**
     * Marks unread received letters for the author as read using an idempotent DB-level update.
     * Implementations should update only rows whose authorReadAt is null, relying on atomic
     * UPDATE semantics inside a transaction so concurrent callers can safely treat this as
     * idempotent.
     */
    void markReceivedAsRead(long authorUserId);

    List<ConfessionLetter> loadSent(long senderUserId);
}
