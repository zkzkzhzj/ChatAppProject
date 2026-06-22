package com.maeum.gohyang.village.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.village.application.port.in.CreateSuggestionUseCase;
import com.maeum.gohyang.village.application.port.in.GetVillageDashboardUseCase;
import com.maeum.gohyang.village.application.port.in.ListSuggestionsUseCase;
import com.maeum.gohyang.village.application.port.in.RecordDailyVisitUseCase;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.error.SuggestionAccessDeniedException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/village")
@RequiredArgsConstructor
@Validated
public class VillageController {

    private static final String DEFAULT_SUGGESTION_LIMIT = "20";
    private static final int MAX_SUGGESTION_LIMIT = 50;

    private final RecordDailyVisitUseCase recordDailyVisitUseCase;
    private final GetVillageDashboardUseCase getVillageDashboardUseCase;
    private final CreateSuggestionUseCase createSuggestionUseCase;
    private final ListSuggestionsUseCase listSuggestionsUseCase;

    @PostMapping("/visits/today")
    public DailyVisitResponse recordTodayVisit(@AuthenticationPrincipal AuthenticatedUser user) {
        return DailyVisitResponse.from(recordDailyVisitUseCase.execute(
                new RecordDailyVisitUseCase.Command(user.displayId(), toDailyVisitType(user))
        ));
    }

    @GetMapping("/dashboard/today")
    public VillageDashboardResponse getTodayDashboard() {
        return VillageDashboardResponse.from(getVillageDashboardUseCase.execute());
    }

    @GetMapping("/suggestions")
    public List<SuggestionResponse> listSuggestions(
            @RequestParam(defaultValue = DEFAULT_SUGGESTION_LIMIT)
            @Min(1)
            @Max(MAX_SUGGESTION_LIMIT)
            int limit) {
        return listSuggestionsUseCase.execute(limit)
                .stream()
                .map(SuggestionResponse::from)
                .toList();
    }

    @PostMapping("/suggestions")
    @ResponseStatus(HttpStatus.CREATED)
    public SuggestionResponse createSuggestion(
            @Valid @RequestBody CreateSuggestionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        requireMemberSuggestionAuthor(user);
        return SuggestionResponse.from(createSuggestionUseCase.execute(
                request.toCommand(user.displayId(), toDailyVisitType(user))
        ));
    }

    private void requireMemberSuggestionAuthor(AuthenticatedUser user) {
        if (user == null || user.isGuest()) {
            throw new SuggestionAccessDeniedException();
        }
    }

    private DailyVisitType toDailyVisitType(AuthenticatedUser user) {
        return user.isGuest() ? DailyVisitType.GUEST : DailyVisitType.MEMBER;
    }
}
