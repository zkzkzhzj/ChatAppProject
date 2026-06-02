package com.maeum.gohyang.confession.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.confession.application.port.in.AddConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.in.RemoveConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.out.AddConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.DeleteConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionReaction;
import com.maeum.gohyang.confession.domain.ConfessionReactionCount;
import com.maeum.gohyang.confession.domain.ConfessionReactionType;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class ConfessionReactionServiceTest {

    private static final long CONFESSION_ID = 10L;
    private static final long USER_ID = 2L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 3, 0);

    @Mock LoadConfessionRecordPort loadConfessionRecordPort;
    @Mock AddConfessionReactionPort addConfessionReactionPort;
    @Mock DeleteConfessionReactionPort deleteConfessionReactionPort;
    @Mock LoadConfessionReactionPort loadConfessionReactionPort;

    @InjectMocks AddConfessionReactionService addConfessionReactionService;
    @InjectMocks RemoveConfessionReactionService removeConfessionReactionService;
    @InjectMocks ListConfessionReactionSummaryService listConfessionReactionSummaryService;

    private ConfessionRecord visibleRecord() {
        return ConfessionRecord.restore(
                CONFESSION_ID,
                1L,
                "제목",
                "본문",
                ConfessionBookshelf.GENERAL,
                ConfessionStatus.VISIBLE,
                ConfessionRiskLevel.LOW,
                NOW,
                NOW
        );
    }

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("보이는 고백에 공감을 추가한다")
        void 보이는_고백에_공감을_추가한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(addConfessionReactionPort.addIfAbsent(any(ConfessionReaction.class)))
                    .willReturn(true);

            AddConfessionReactionUseCase.Result result = addConfessionReactionService.execute(
                    new AddConfessionReactionUseCase.Command(USER_ID, CONFESSION_ID, ConfessionReactionType.CANDLE)
            );

            assertThat(result.added()).isTrue();
            assertThat(result.reactionType()).isEqualTo(ConfessionReactionType.CANDLE);
        }

        @Test
        @DisplayName("중복 공감은 추가되지 않은 결과를 반환한다")
        void 중복_공감은_추가되지_않은_결과를_반환한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(addConfessionReactionPort.addIfAbsent(any(ConfessionReaction.class)))
                    .willReturn(false);

            AddConfessionReactionUseCase.Result result = addConfessionReactionService.execute(
                    new AddConfessionReactionUseCase.Command(USER_ID, CONFESSION_ID, ConfessionReactionType.CANDLE)
            );

            assertThat(result.added()).isFalse();
        }

        @Test
        @DisplayName("공감 집계를 조회한다")
        void 공감_집계를_조회한다() {
            given(loadConfessionReactionPort.count(CONFESSION_ID))
                    .willReturn(List.of(new ConfessionReactionCount(ConfessionReactionType.CANDLE, 3L)));

            List<ConfessionReactionCount> result = listConfessionReactionSummaryService.execute(CONFESSION_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).count()).isEqualTo(3L);
        }

        @Test
        @DisplayName("공감을 삭제한다")
        void 공감을_삭제한다() {
            removeConfessionReactionService.execute(
                    new RemoveConfessionReactionUseCase.Command(USER_ID, CONFESSION_ID, ConfessionReactionType.CANDLE)
            );

            verify(deleteConfessionReactionPort).delete(USER_ID, CONFESSION_ID, ConfessionReactionType.CANDLE);
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("없는 고백에 공감하면 예외가 발생한다")
        void 없는_고백에_공감하면_예외가_발생한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.empty());

            assertThatThrownBy(
                    () -> addConfessionReactionService.execute(
                            new AddConfessionReactionUseCase.Command(
                                    USER_ID,
                                    CONFESSION_ID,
                                    ConfessionReactionType.CANDLE
                            )
                    )
            ).isInstanceOf(ConfessionNotFoundException.class);
        }
    }
}
