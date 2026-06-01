package com.maeum.gohyang.confession.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConfessionReportJpaRepository extends JpaRepository<ConfessionReportJpaEntity, Long> {

    @Modifying
    @Query(value = "INSERT INTO confession_report "
            + "(confession_id, reporter_user_id, reason, created_at) "
            + "VALUES (:confessionId, :reporterUserId, :reason, NOW()) "
            + "ON CONFLICT (confession_id, reporter_user_id) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("confessionId") long confessionId,
                       @Param("reporterUserId") long reporterUserId,
                       @Param("reason") String reason);
}
