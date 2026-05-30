package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;

public interface ConfessionLetterJpaRepository extends JpaRepository<ConfessionLetterJpaEntity, Long> {

    List<ConfessionLetterJpaEntity> findByConfessionIdAndStatusOrderByCreatedAtDesc(
            Long confessionId,
            ConfessionLetterStatus status
    );

    List<ConfessionLetterJpaEntity> findBySenderUserIdAndStatusOrderByCreatedAtDesc(
            Long senderUserId,
            ConfessionLetterStatus status
    );
}
