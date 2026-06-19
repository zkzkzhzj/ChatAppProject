package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.OffsetDateTime;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface VillageDashboardJpaRepository extends Repository<ConfessionDashboardReadEntity, Long> {

    @Query(value = "SELECT COUNT(*) FROM confession_record "
            + "WHERE created_at >= :startInclusive AND created_at < :endExclusive",
            nativeQuery = true)
    long countConfessionsCreatedBetween(
            @Param("startInclusive") OffsetDateTime startInclusive,
            @Param("endExclusive") OffsetDateTime endExclusive
    );
}
