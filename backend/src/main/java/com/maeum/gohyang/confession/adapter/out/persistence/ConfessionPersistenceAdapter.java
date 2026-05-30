package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.confession.application.port.out.AddConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.AddConfessionReportPort;
import com.maeum.gohyang.confession.application.port.out.DeleteConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.LoadThankReplyPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveThankReplyPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;
import com.maeum.gohyang.confession.domain.ConfessionReaction;
import com.maeum.gohyang.confession.domain.ConfessionReactionCount;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionReport;
import com.maeum.gohyang.confession.domain.ConfessionStatus;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.DuplicateThankReplyException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConfessionPersistenceAdapter implements SaveConfessionRecordPort, LoadConfessionRecordPort,
        SaveConfessionLetterPort, LoadConfessionLetterPort, SaveThankReplyPort, LoadThankReplyPort,
        AddConfessionReactionPort, DeleteConfessionReactionPort, LoadConfessionReactionPort,
        AddConfessionReportPort {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final ConfessionRecordJpaRepository confessionRecordJpaRepository;
    private final ConfessionLetterJpaRepository confessionLetterJpaRepository;
    private final ConfessionThankReplyJpaRepository confessionThankReplyJpaRepository;
    private final ConfessionReactionJpaRepository confessionReactionJpaRepository;
    private final ConfessionReportJpaRepository confessionReportJpaRepository;

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

    @Override
    public boolean addIfAbsent(ConfessionReaction reaction) {
        return confessionReactionJpaRepository.insertIfAbsent(
                reaction.getConfessionId(),
                reaction.getUserId(),
                reaction.getReactionType().name()
        ) > 0;
    }

    @Override
    public void delete(long userId, long confessionId, ConfessionReactionType reactionType) {
        confessionReactionJpaRepository.delete(userId, confessionId, reactionType);
    }

    @Override
    public List<ConfessionReactionCount> countByConfession(long confessionId) {
        return confessionReactionJpaRepository.countByConfessionId(confessionId)
                .stream()
                .map(row -> new ConfessionReactionCount(
                        ConfessionReactionType.valueOf(row.getReactionType()),
                        row.getReactionCount()
                ))
                .toList();
    }

    @Override
    public boolean addIfAbsent(ConfessionReport report) {
        return confessionReportJpaRepository.insertIfAbsent(
                report.getConfessionId(),
                report.getReporterUserId(),
                report.getReason().name()
        ) > 0;
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
