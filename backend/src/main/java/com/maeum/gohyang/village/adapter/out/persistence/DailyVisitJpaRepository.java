package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.maeum.gohyang.village.domain.DailyVisitType;

public interface DailyVisitJpaRepository extends JpaRepository<DailyVisitJpaEntity, Long> {

    @Modifying
    @Query(value = "INSERT INTO daily_visit "
            + "(visit_date, visitor_key, visitor_type, created_at) "
            + "VALUES (:visitDate, :visitorKey, :visitorType, NOW()) "
            + "ON CONFLICT (visit_date, visitor_key) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(
            @Param("visitDate") LocalDate visitDate,
            @Param("visitorKey") String visitorKey,
            @Param("visitorType") String visitorType
    );

    long countByVisitDate(LocalDate visitDate);

    long countByVisitDateAndVisitorType(LocalDate visitDate, DailyVisitType visitorType);
}
