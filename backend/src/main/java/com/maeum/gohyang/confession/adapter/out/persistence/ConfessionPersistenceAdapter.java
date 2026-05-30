package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.LoadThankReplyPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveThankReplyPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionStatus;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.DuplicateThankReplyException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConfessionPersistenceAdapter implements SaveConfessionRecordPort, LoadConfessionRecordPort,
        SaveConfessionLetterPort, LoadConfessionLetterPort, SaveThankReplyPort, LoadThankReplyPort {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final ConfessionRecordJpaRepository confessionRecordJpaRepository;
    private final ConfessionLetterJpaRepository confessionLetterJpaRepository;
    private final ConfessionThankReplyJpaRepository confessionThankReplyJpaRepository;

    @Override
    public ConfessionRecord save(ConfessionRecord confessionRecord) {
        return confessionRecordJpaRepository.save(ConfessionRecordJpaEntity.from(confessionRecord)).toDomain();
    }

    @Override
    public Optional<ConfessionRecord> load(long confessionId) {
        return confessionRecordJpaRepository.findById(confessionId)
                .map(ConfessionRecordJpaEntity::toDomain);
    }

    @Override
    public List<ConfessionRecord> loadVisible(ConfessionBookshelf bookshelf, int limit) {
        PageRequest pageRequest = PageRequest.of(0, normalizeLimit(limit));
        if (bookshelf == null) {
            return confessionRecordJpaRepository.findByStatusOrderByCreatedAtDesc(
                            ConfessionStatus.VISIBLE,
                            pageRequest
                    )
                    .stream()
                    .map(ConfessionRecordJpaEntity::toDomain)
                    .toList();
        }
        return confessionRecordJpaRepository.findByBookshelfAndStatusOrderByCreatedAtDesc(
                        bookshelf,
                        ConfessionStatus.VISIBLE,
                        pageRequest
                )
                .stream()
                .map(ConfessionRecordJpaEntity::toDomain)
                .toList();
    }

    @Override
    public ConfessionLetter save(ConfessionLetter letter) {
        return confessionLetterJpaRepository.save(ConfessionLetterJpaEntity.from(letter)).toDomain();
    }

    @Override
    public Optional<ConfessionLetter> loadLetter(long letterId) {
        return confessionLetterJpaRepository.findById(letterId)
                .map(ConfessionLetterJpaEntity::toDomain);
    }

    @Override
    public List<ConfessionLetter> loadReceived(long confessionId) {
        return confessionLetterJpaRepository.findByConfessionIdAndStatusOrderByCreatedAtDesc(
                        confessionId,
                        ConfessionLetterStatus.SENT
                )
                .stream()
                .map(ConfessionLetterJpaEntity::toDomain)
                .toList();
    }

    @Override
    public List<ConfessionLetter> loadSent(long senderUserId) {
        return confessionLetterJpaRepository.findBySenderUserIdAndStatusOrderByCreatedAtDesc(
                        senderUserId,
                        ConfessionLetterStatus.SENT
                )
                .stream()
                .map(ConfessionLetterJpaEntity::toDomain)
                .toList();
    }

    @Override
    public ConfessionThankReply save(ConfessionThankReply thankReply) {
        try {
            return confessionThankReplyJpaRepository.save(ConfessionThankReplyJpaEntity.from(thankReply)).toDomain();
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateThankReplyException();
        }
    }

    @Override
    public Optional<ConfessionThankReply> loadForLetter(long letterId) {
        return confessionThankReplyJpaRepository.findByLetterId(letterId)
                .map(ConfessionThankReplyJpaEntity::toDomain);
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
