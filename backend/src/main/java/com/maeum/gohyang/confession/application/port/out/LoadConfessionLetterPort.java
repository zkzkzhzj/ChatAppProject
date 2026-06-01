package com.maeum.gohyang.confession.application.port.out;

import java.util.List;
import java.util.Optional;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface LoadConfessionLetterPort {

    Optional<ConfessionLetter> loadLetter(long letterId);

    List<ConfessionLetter> loadReceived(long confessionId);

    List<ConfessionLetter> loadReceivedForAuthor(long authorUserId);

    long countUnreadReceivedForAuthor(long authorUserId);

    void markReceivedAsRead(long authorUserId);

    List<ConfessionLetter> loadSent(long senderUserId);
}
