package com.maeum.gohyang.village.adapter.in.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.UserType;
import com.maeum.gohyang.village.application.port.in.CreateSuggestionUseCase;
import com.maeum.gohyang.village.application.port.in.GetVillageDashboardUseCase;
import com.maeum.gohyang.village.application.port.in.ListSuggestionsUseCase;
import com.maeum.gohyang.village.application.port.in.RecordDailyVisitUseCase;
import com.maeum.gohyang.village.domain.DailyVisitType;
import com.maeum.gohyang.village.domain.Suggestion;
import com.maeum.gohyang.village.domain.SuggestionStatus;
import com.maeum.gohyang.village.error.SuggestionAccessDeniedException;

@ExtendWith(MockitoExtension.class)
class VillageControllerTest {

    @Mock RecordDailyVisitUseCase recordDailyVisitUseCase;
    @Mock GetVillageDashboardUseCase getVillageDashboardUseCase;
    @Mock CreateSuggestionUseCase createSuggestionUseCase;
    @Mock ListSuggestionsUseCase listSuggestionsUseCase;

    @InjectMocks VillageController controller;

    @Test
    @DisplayName("게스트는 건의사항을 등록할 수 없다")
    void 게스트는_건의사항을_등록할_수_없다() {
        AuthenticatedUser guest = new AuthenticatedUser(null, UserType.GUEST, "guest-abc");
        CreateSuggestionRequest request = new CreateSuggestionRequest("제목", "내용");

        assertThatThrownBy(() -> controller.createSuggestion(request, guest))
                .isInstanceOf(SuggestionAccessDeniedException.class);
    }

    @Test
    @DisplayName("회원은 건의사항을 등록할 수 있다")
    void 회원은_건의사항을_등록할_수_있다() {
        AuthenticatedUser member = new AuthenticatedUser(7L, UserType.MEMBER);
        CreateSuggestionRequest request = new CreateSuggestionRequest("제목", "내용");
        Suggestion saved = Suggestion.restore(
                1L,
                "user-7",
                DailyVisitType.MEMBER,
                "제목",
                "내용",
                SuggestionStatus.OPEN,
                null,
                LocalDateTime.of(2026, 6, 20, 12, 0),
                LocalDateTime.of(2026, 6, 20, 12, 0)
        );
        given(createSuggestionUseCase.execute(any(CreateSuggestionUseCase.Command.class))).willReturn(saved);

        SuggestionResponse response = controller.createSuggestion(request, member);

        ArgumentCaptor<CreateSuggestionUseCase.Command> commandCaptor =
                ArgumentCaptor.forClass(CreateSuggestionUseCase.Command.class);
        verify(createSuggestionUseCase).execute(commandCaptor.capture());
        assertThat(commandCaptor.getValue().authorKey()).isEqualTo("user-7");
        assertThat(commandCaptor.getValue().authorType()).isEqualTo(DailyVisitType.MEMBER);
        assertThat(response.id()).isEqualTo(1L);
    }
}
