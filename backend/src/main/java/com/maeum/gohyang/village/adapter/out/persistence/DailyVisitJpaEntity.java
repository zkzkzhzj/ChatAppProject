package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.jspecify.annotations.Nullable;

import com.maeum.gohyang.village.domain.DailyVisitType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "daily_visit")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyVisitJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false)
    private @Nullable LocalDate visitDate;

    @Column(nullable = false, length = 80)
    private @Nullable String visitorKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private @Nullable DailyVisitType visitorType;

    @Column(nullable = false, updatable = false)
    private @Nullable LocalDateTime createdAt;
}
