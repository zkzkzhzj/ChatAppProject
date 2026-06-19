package com.maeum.gohyang.village.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.village.application.port.in.CreateSuggestionUseCase;
import com.maeum.gohyang.village.application.port.in.RecordDailyVisitUseCase;
import com.maeum.gohyang.village.application.port.out.AddDailyVisitPort;
import com.maeum.gohyang.village.application.port.out.LoadDailyVisitStatsPort;
import com.maeum.gohyang.village.application.port.out.LoadSuggestionsPort;
import com.maeum.gohyang.village.application.port.out.SaveSuggestionPort;
import com.maeum.gohyang.village.domain.DailyVisitStats;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;
import com.maeum.gohyang.village.domain.SuggestionStatus;
import com.maeum.gohyang.village.error.InvalidSuggestionContentException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class VillageBoardServiceTest {

    private static final String GUEST_KEY = "guest-abc";

    @Mock AddDailyVisitPort addDailyVisitPort;
    @Mock LoadDailyVisitStatsPort loadDailyVisitStatsPort;
    @Mock SaveSuggestionPort saveSuggestionPort;
    @Mock LoadSuggestionsPort loadSuggestionsPort;

    @InjectMocks VillageBoardService service;

    @Test
    @DisplayName("오늘 방문을 insert-if-absent로 기록하고 집계를 반환한다")
    void 오늘_방문을_insert_if_absent로_기록하고_집계를_반환한다() {
        DailyVisitStats stats = new DailyVisitStats(1, 0, 1, 2);
        given(addDailyVisitPort.addIfAbsent(any(LocalDate.class), any(String.class), any(DailyVisitType.class)))
                .willReturn(true);
        given(loadDailyVisitStatsPort.load(
                any(LocalDate.class),
                any(LocalDateTime.class),
                any(LocalDateTime.class)
        )).willReturn(stats);

        RecordDailyVisitUseCase.Result result = service.execute(
                new RecordDailyVisitUseCase.Command(GUEST_KEY, DailyVisitType.GUEST)
        );

        assertThat(result.added()).isTrue();
        assertThat(result.stats()).isEqualTo(stats);
        verify(addDailyVisitPort).addIfAbsent(result.date(), GUEST_KEY, DailyVisitType.GUEST);
    }

    @Test
    @DisplayName("대시보드는 오늘 시작과 내일 시작 사이의 마음 개수를 조회한다")
    void 대시보드는_오늘_시작과_내일_시작_사이의_마음_개수를_조회한다() {
        DailyVisitStats stats = new DailyVisitStats(1, 1, 2, 3);
        ArgumentCaptor<LocalDate> dateCaptor = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDateTime> startCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> endCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        given(loadDailyVisitStatsPort.load(
                any(LocalDate.class),
                any(LocalDateTime.class),
                any(LocalDateTime.class)
        )).willReturn(stats);

        assertThat(service.execute().stats()).isEqualTo(stats);

        verify(loadDailyVisitStatsPort).load(dateCaptor.capture(), startCaptor.capture(), endCaptor.capture());
        assertThat(startCaptor.getValue()).isEqualTo(dateCaptor.getValue().atStartOfDay());
        assertThat(endCaptor.getValue()).isEqualTo(dateCaptor.getValue().plusDays(1).atStartOfDay());
    }

    @Test
    @DisplayName("건의사항을 저장하고 최신 목록은 제한 개수로 조회한다")
    void 건의사항을_저장하고_최신_목록은_제한_개수로_조회한다() {
        Suggestion saved = Suggestion.restore(
                1L,
                GUEST_KEY,
                DailyVisitType.GUEST,
                "제목",
                "내용",
                SuggestionStatus.OPEN,
                null,
                LocalDateTime.of(2026, 6, 19, 12, 0),
                LocalDateTime.of(2026, 6, 19, 12, 0)
        );
        given(saveSuggestionPort.save(any(Suggestion.class))).willReturn(saved);
        given(loadSuggestionsPort.loadRecent(50)).willReturn(List.of(saved));

        Suggestion result = service.execute(
                new CreateSuggestionUseCase.Command(GUEST_KEY, DailyVisitType.GUEST, " 제목 ", " 내용 ")
        );

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(service.execute(100)).containsExactly(saved);
    }

    @Test
    @DisplayName("빈 건의사항은 저장하지 않는다")
    void 빈_건의사항은_저장하지_않는다() {
        assertThatThrownBy(() -> service.execute(
                new CreateSuggestionUseCase.Command(GUEST_KEY, DailyVisitType.GUEST, "", "내용")
        )).isInstanceOf(InvalidSuggestionContentException.class);
    }
}
