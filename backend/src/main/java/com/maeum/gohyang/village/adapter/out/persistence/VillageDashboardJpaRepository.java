package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface VillageDashboardJpaRepository extends Repository<ConfessionDashboardReadEntity, Long> {

    @Query(value = "SELECT COUNT(*) FROM confession_record "
            + "WHERE created_at >= :startInclusive AND created_at < :endExclusive",
            nativeQuery = true)
    long countConfessionsCreatedBetween(
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive
    );
}
