package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.village.application.port.out.AddDailyVisitPort;
import com.maeum.gohyang.village.application.port.out.LoadDailyVisitStatsPort;
import com.maeum.gohyang.village.application.port.out.LoadSuggestionsPort;
import com.maeum.gohyang.village.application.port.out.SaveSuggestionPort;
import com.maeum.gohyang.village.domain.DailyVisitStats;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VillagePersistenceAdapter
        implements AddDailyVisitPort, LoadDailyVisitStatsPort, SaveSuggestionPort, LoadSuggestionsPort {

    private final DailyVisitJpaRepository dailyVisitJpaRepository;
    private final VillageDashboardJpaRepository villageDashboardJpaRepository;
    private final SuggestionJpaRepository suggestionJpaRepository;

    @Override
    public boolean addIfAbsent(LocalDate visitDate, String visitorKey, DailyVisitType visitorType) {
        return dailyVisitJpaRepository.insertIfAbsent(visitDate, visitorKey, visitorType) > 0;
    }

    @Override
    public DailyVisitStats load(
            LocalDate visitDate,
            OffsetDateTime startInclusive,
            OffsetDateTime endExclusive
    ) {
        long guestCount = dailyVisitJpaRepository.countByVisitDateAndVisitorType(
                visitDate,
                DailyVisitType.GUEST
        );
        long memberCount = dailyVisitJpaRepository.countByVisitDateAndVisitorType(
                visitDate,
                DailyVisitType.MEMBER
        );
        long totalCount = dailyVisitJpaRepository.countByVisitDate(visitDate);
        long confessionCount = villageDashboardJpaRepository.countConfessionsCreatedBetween(
                startInclusive,
                endExclusive
        );
        return new DailyVisitStats(guestCount, memberCount, totalCount, confessionCount);
    }

    @Override
    public Suggestion save(Suggestion suggestion) {
        return suggestionJpaRepository.save(SuggestionJpaEntity.from(suggestion)).toDomain();
    }

    @Override
    public List<Suggestion> loadRecent(int limit) {
        return suggestionJpaRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, limit))
                .stream()
                .map(SuggestionJpaEntity::toDomain)
                .toList();
    }
}
