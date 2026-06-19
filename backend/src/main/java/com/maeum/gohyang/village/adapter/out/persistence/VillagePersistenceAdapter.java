package com.maeum.gohyang.village.adapter.out.persistence;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.village.application.port.out.AddDailyVisitPort;
import com.maeum.gohyang.village.application.port.out.LoadCharacterPort;
import com.maeum.gohyang.village.application.port.out.LoadDailyVisitStatsPort;
import com.maeum.gohyang.village.application.port.out.LoadSpacePort;
import com.maeum.gohyang.village.application.port.out.LoadSuggestionsPort;
import com.maeum.gohyang.village.application.port.out.SaveCharacterPort;
import com.maeum.gohyang.village.application.port.out.SaveSpacePort;
import com.maeum.gohyang.village.application.port.out.SaveSuggestionPort;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.domain.DailyVisitStats;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Space;
import com.maeum.gohyang.village.domain.Suggestion;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VillagePersistenceAdapter
        implements SaveCharacterPort, LoadCharacterPort, SaveSpacePort, LoadSpacePort,
        AddDailyVisitPort, LoadDailyVisitStatsPort, SaveSuggestionPort, LoadSuggestionsPort {

    private final CharacterJpaRepository characterJpaRepository;
    private final SpaceJpaRepository spaceJpaRepository;
    private final DailyVisitJpaRepository dailyVisitJpaRepository;
    private final VillageDashboardJpaRepository villageDashboardJpaRepository;
    private final SuggestionJpaRepository suggestionJpaRepository;

    @Override
    public Character save(Character character) {
        return characterJpaRepository.save(CharacterJpaEntity.from(character)).toDomain();
    }

    @Override
    public Optional<Character> load(long userId) {
        return characterJpaRepository.findByUserId(userId)
                .map(CharacterJpaEntity::toDomain);
    }

    @Override
    public Space save(Space space) {
        return spaceJpaRepository.save(SpaceJpaEntity.from(space)).toDomain();
    }

    @Override
    public Optional<Space> loadDefault(long userId) {
        return spaceJpaRepository.findByUserIdAndIsDefaultTrue(userId)
                .map(SpaceJpaEntity::toDomain);
    }

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
