package com.maeum.gohyang.village.application.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.village.application.port.in.CreateSuggestionUseCase;
import com.maeum.gohyang.village.application.port.in.GetVillageDashboardUseCase;
import com.maeum.gohyang.village.application.port.in.ListSuggestionsUseCase;
import com.maeum.gohyang.village.application.port.in.RecordDailyVisitUseCase;
import com.maeum.gohyang.village.application.port.out.AddDailyVisitPort;
import com.maeum.gohyang.village.application.port.out.LoadDailyVisitStatsPort;
import com.maeum.gohyang.village.application.port.out.LoadSuggestionsPort;
import com.maeum.gohyang.village.application.port.out.SaveSuggestionPort;
import com.maeum.gohyang.village.domain.DailyVisitStats;
import com.maeum.gohyang.village.domain.Suggestion;

@Service
public class VillageBoardService implements RecordDailyVisitUseCase, GetVillageDashboardUseCase,
        CreateSuggestionUseCase, ListSuggestionsUseCase {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final AddDailyVisitPort addDailyVisitPort;
    private final LoadDailyVisitStatsPort loadDailyVisitStatsPort;
    private final SaveSuggestionPort saveSuggestionPort;
    private final LoadSuggestionsPort loadSuggestionsPort;
    private final ZoneId serviceZone;

    public VillageBoardService(
            AddDailyVisitPort addDailyVisitPort,
            LoadDailyVisitStatsPort loadDailyVisitStatsPort,
            SaveSuggestionPort saveSuggestionPort,
            LoadSuggestionsPort loadSuggestionsPort,
            @Value("${village.timezone:Asia/Seoul}") String serviceTimezone
    ) {
        this.addDailyVisitPort = addDailyVisitPort;
        this.loadDailyVisitStatsPort = loadDailyVisitStatsPort;
        this.saveSuggestionPort = saveSuggestionPort;
        this.loadSuggestionsPort = loadSuggestionsPort;
        this.serviceZone = ZoneId.of(serviceTimezone);
    }

    @Override
    @Transactional
    public RecordDailyVisitUseCase.Result execute(RecordDailyVisitUseCase.Command command) {
        LocalDate today = today();
        boolean added = addDailyVisitPort.addIfAbsent(today, command.visitorKey(), command.visitorType());
        return new RecordDailyVisitUseCase.Result(today, added, loadStats(today));
    }

    @Override
    @Transactional(readOnly = true)
    public GetVillageDashboardUseCase.Result execute() {
        LocalDate today = today();
        return new GetVillageDashboardUseCase.Result(today, loadStats(today));
    }

    @Override
    @Transactional
    public Suggestion execute(CreateSuggestionUseCase.Command command) {
        return saveSuggestionPort.save(Suggestion.newSuggestion(
                command.authorKey(),
                command.authorType(),
                command.title(),
                command.body()
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Suggestion> execute(int limit) {
        return loadSuggestionsPort.loadRecent(normalizeLimit(limit));
    }

    private DailyVisitStats loadStats(LocalDate date) {
        return loadDailyVisitStatsPort.load(
                date,
                date.atStartOfDay(serviceZone).toOffsetDateTime(),
                date.plusDays(1).atStartOfDay(serviceZone).toOffsetDateTime()
        );
    }

    private LocalDate today() {
        return ZonedDateTime.now(serviceZone).toLocalDate();
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
