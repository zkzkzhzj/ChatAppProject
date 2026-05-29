package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ConfessionPersistenceAdapter implements SaveConfessionRecordPort, LoadConfessionRecordPort {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final ConfessionRecordJpaRepository confessionRecordJpaRepository;

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

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
