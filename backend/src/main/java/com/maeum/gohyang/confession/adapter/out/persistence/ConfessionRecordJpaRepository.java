package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;

public interface ConfessionRecordJpaRepository extends JpaRepository<ConfessionRecordJpaEntity, Long> {

    List<ConfessionRecordJpaEntity> findByStatusOrderByCreatedAtDesc(ConfessionStatus status, Pageable pageable);

    List<ConfessionRecordJpaEntity> findByBookshelfAndStatusOrderByCreatedAtDesc(
            ConfessionBookshelf bookshelf,
            ConfessionStatus status,
            Pageable pageable
    );

    List<ConfessionRecordJpaEntity> findByStatusAndRiskLevelInOrderByCreatedAtDesc(
            ConfessionStatus status,
            List<ConfessionRiskLevel> riskLevels,
            Pageable pageable
    );

    List<ConfessionRecordJpaEntity> findByBookshelfAndStatusAndRiskLevelInOrderByCreatedAtDesc(
            ConfessionBookshelf bookshelf,
            ConfessionStatus status,
            List<ConfessionRiskLevel> riskLevels,
            Pageable pageable
    );
}
