package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select letter
            from ConfessionLetterJpaEntity letter
            join ConfessionRecordJpaEntity record on record.id = letter.confessionId
            where record.authorUserId = :authorUserId
              and letter.status = :status
            order by letter.createdAt desc
            """)
    List<ConfessionLetterJpaEntity> findReceivedForAuthor(
            @Param("authorUserId") Long authorUserId,
            @Param("status") ConfessionLetterStatus status
    );

    @Query("""
            select count(letter)
            from ConfessionLetterJpaEntity letter
            join ConfessionRecordJpaEntity record on record.id = letter.confessionId
            where record.authorUserId = :authorUserId
              and letter.status = :status
              and letter.authorReadAt is null
            """)
    long countUnreadReceivedForAuthor(
            @Param("authorUserId") Long authorUserId,
            @Param("status") ConfessionLetterStatus status
    );

    @Modifying
    @Query("""
            update ConfessionLetterJpaEntity letter
            set letter.authorReadAt = CURRENT_TIMESTAMP
            where letter.status = :status
              and letter.authorReadAt is null
              and exists (
                  select 1
                  from ConfessionRecordJpaEntity record
                  where record.id = letter.confessionId
                    and record.authorUserId = :authorUserId
              )
            """)
    int markReceivedAsRead(
            @Param("authorUserId") Long authorUserId,
            @Param("status") ConfessionLetterStatus status
    );
}
