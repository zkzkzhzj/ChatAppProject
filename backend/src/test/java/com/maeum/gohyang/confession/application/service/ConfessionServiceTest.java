package com.maeum.gohyang.confession.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.application.port.in.DeleteConfessionUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class ConfessionServiceTest {

    private static final long AUTHOR_USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long CONFESSION_ID = 10L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 1, 0);

    @Mock SaveConfessionRecordPort saveConfessionRecordPort;
    @Mock LoadConfessionRecordPort loadConfessionRecordPort;

    @InjectMocks CreateConfessionService createConfessionService;
    @InjectMocks GetConfessionDetailService getConfessionDetailService;
    @InjectMocks DeleteConfessionService deleteConfessionService;

    private ConfessionRecord savedRecord() {
        return ConfessionRecord.restore(
                CONFESSION_ID,
                AUTHOR_USER_ID,
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
        @DisplayName("고백 기록을 생성한다")
        void 고백_기록을_생성한다() {
            given(saveConfessionRecordPort.save(any(ConfessionRecord.class))).willReturn(savedRecord());

            ConfessionRecord result = createConfessionService.execute(
                    new CreateConfessionUseCase.Command(
                            AUTHOR_USER_ID,
                            "제목",
                            "본문",
                            ConfessionBookshelf.GENERAL
                    )
            );

            assertThat(result.getId()).isEqualTo(CONFESSION_ID);
            assertThat(result.getAuthorUserId()).isEqualTo(AUTHOR_USER_ID);
            verify(saveConfessionRecordPort).save(any(ConfessionRecord.class));
        }

        @Test
        @DisplayName("보이는 고백 기록 상세를 조회한다")
        void 보이는_고백_기록_상세를_조회한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(savedRecord()));

            ConfessionRecord result = getConfessionDetailService.execute(CONFESSION_ID);

            assertThat(result.getId()).isEqualTo(CONFESSION_ID);
        }

        @Test
        @DisplayName("작성자는 고백 기록을 삭제한다")
        void 작성자는_고백_기록을_삭제한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(savedRecord()));
            given(saveConfessionRecordPort.save(any(ConfessionRecord.class))).willAnswer(inv -> inv.getArgument(0));

            deleteConfessionService.execute(new DeleteConfessionUseCase.Command(AUTHOR_USER_ID, CONFESSION_ID));

            verify(saveConfessionRecordPort).save(any(ConfessionRecord.class));
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("없는 고백 기록 상세 조회는 예외가 발생한다")
        void 없는_고백_기록_상세_조회는_예외가_발생한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.empty());

            assertThatThrownBy(() -> getConfessionDetailService.execute(CONFESSION_ID))
                    .isInstanceOf(ConfessionNotFoundException.class);
        }

        @Test
        @DisplayName("숨겨진 고백 기록 상세 조회는 예외가 발생한다")
        void 숨겨진_고백_기록_상세_조회는_예외가_발생한다() {
            ConfessionRecord hidden = ConfessionRecord.restore(
                    CONFESSION_ID,
                    AUTHOR_USER_ID,
                    "제목",
                    "본문",
                    ConfessionBookshelf.GENERAL,
                    ConfessionStatus.DELETED,
                    ConfessionRiskLevel.LOW,
                    NOW,
                    NOW
            );
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(hidden));

            assertThatThrownBy(() -> getConfessionDetailService.execute(CONFESSION_ID))
                    .isInstanceOf(ConfessionNotFoundException.class);
        }

        @Test
        @DisplayName("작성자가 아닌 사용자의 삭제는 예외가 발생한다")
        void 작성자가_아닌_사용자의_삭제는_예외가_발생한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(savedRecord()));

            assertThatThrownBy(
                    () -> deleteConfessionService.execute(
                            new DeleteConfessionUseCase.Command(OTHER_USER_ID, CONFESSION_ID)
                    )
            ).isInstanceOf(ConfessionAccessDeniedException.class);
        }
    }
}
