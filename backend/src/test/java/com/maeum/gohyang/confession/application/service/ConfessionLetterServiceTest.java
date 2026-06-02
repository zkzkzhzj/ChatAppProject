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

import com.maeum.gohyang.confession.application.port.in.GetThankReplyUseCase;
import com.maeum.gohyang.confession.application.port.in.ListReceivedLettersUseCase;
import com.maeum.gohyang.confession.application.port.in.SendConfessionLetterUseCase;
import com.maeum.gohyang.confession.application.port.in.SendThankReplyUseCase;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.application.port.out.LoadThankReplyPort;
import com.maeum.gohyang.confession.application.port.out.PublishConfessionLetterEventPort;
import com.maeum.gohyang.confession.application.port.out.SaveConfessionLetterPort;
import com.maeum.gohyang.confession.application.port.out.SaveThankReplyPort;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionLetter;
import com.maeum.gohyang.confession.domain.ConfessionLetterStatus;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;
import com.maeum.gohyang.confession.domain.ConfessionStatus;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;
import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.ConfessionLetterNotFoundException;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("NullAway")
class ConfessionLetterServiceTest {

    private static final long AUTHOR_USER_ID = 1L;
    private static final long SENDER_USER_ID = 2L;
    private static final long OTHER_USER_ID = 3L;
    private static final long CONFESSION_ID = 10L;
    private static final long LETTER_ID = 100L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 2, 0);

    @Mock LoadConfessionRecordPort loadConfessionRecordPort;
    @Mock SaveConfessionLetterPort saveConfessionLetterPort;
    @Mock LoadConfessionLetterPort loadConfessionLetterPort;
    @Mock PublishConfessionLetterEventPort publishConfessionLetterEventPort;
    @Mock SaveThankReplyPort saveThankReplyPort;
    @Mock LoadThankReplyPort loadThankReplyPort;

    @InjectMocks SendConfessionLetterService sendConfessionLetterService;
    @InjectMocks ListReceivedLettersService listReceivedLettersService;
    @InjectMocks ListSentLettersService listSentLettersService;
    @InjectMocks SendThankReplyService sendThankReplyService;
    @InjectMocks GetThankReplyService getThankReplyService;

    private ConfessionRecord visibleRecord() {
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

    private ConfessionRecord deletedRecord() {
        return ConfessionRecord.restore(
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
    }

    private ConfessionLetter savedLetter() {
        return ConfessionLetter.restore(
                LETTER_ID,
                CONFESSION_ID,
                SENDER_USER_ID,
                "편지",
                ConfessionLetterStatus.SENT,
                NOW
        );
    }

    private ConfessionThankReply savedReply() {
        return ConfessionThankReply.restore(200L, LETTER_ID, AUTHOR_USER_ID, "고마워요", NOW);
    }

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("다른 사용자는 보이는 고백에 편지를 보낸다")
        void 다른_사용자는_보이는_고백에_편지를_보낸다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(saveConfessionLetterPort.save(any(ConfessionLetter.class))).willReturn(savedLetter());

            ConfessionLetter result = sendConfessionLetterService.execute(
                    new SendConfessionLetterUseCase.Command(SENDER_USER_ID, CONFESSION_ID, "편지")
            );

            assertThat(result.getId()).isEqualTo(LETTER_ID);
            assertThat(result.getSenderUserId()).isEqualTo(SENDER_USER_ID);
            verify(saveConfessionLetterPort).save(any(ConfessionLetter.class));
            verify(publishConfessionLetterEventPort).publishLetterSent(AUTHOR_USER_ID, CONFESSION_ID, LETTER_ID);
        }

        @Test
        @DisplayName("작성자는 자신의 고백에 도착한 편지를 조회한다")
        void 작성자는_자신의_고백에_도착한_편지를_조회한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(loadConfessionLetterPort.loadReceived(CONFESSION_ID)).willReturn(List.of(savedLetter()));

            List<ConfessionLetter> result = listReceivedLettersService.execute(
                    new ListReceivedLettersUseCase.Query(AUTHOR_USER_ID, CONFESSION_ID)
            );

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSenderUserId()).isEqualTo(SENDER_USER_ID);
        }

        @Test
        @DisplayName("작성자는 자신에게 도착한 모든 편지를 조회한다")
        void 작성자는_자신에게_도착한_모든_편지를_조회한다() {
            given(loadConfessionLetterPort.loadReceivedForAuthor(AUTHOR_USER_ID)).willReturn(List.of(savedLetter()));

            List<ConfessionLetter> result = listReceivedLettersService.execute(AUTHOR_USER_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSenderUserId()).isEqualTo(SENDER_USER_ID);
        }

        @Test
        @DisplayName("작성자는 읽지 않은 도착 편지 수를 조회한다")
        void 작성자는_읽지_않은_도착_편지_수를_조회한다() {
            given(loadConfessionLetterPort.countUnreadReceivedForAuthor(AUTHOR_USER_ID)).willReturn(2L);

            long result = listReceivedLettersService.countUnread(AUTHOR_USER_ID);

            assertThat(result).isEqualTo(2L);
        }

        @Test
        @DisplayName("작성자는 도착 편지를 모두 읽음 처리한다")
        void 작성자는_도착_편지를_모두_읽음_처리한다() {
            listReceivedLettersService.markAllRead(AUTHOR_USER_ID);

            verify(loadConfessionLetterPort).markReceivedAsRead(AUTHOR_USER_ID);
        }

        @Test
        @DisplayName("발신자는 자신이 보낸 편지를 조회한다")
        void 발신자는_자신이_보낸_편지를_조회한다() {
            given(loadConfessionLetterPort.loadSent(SENDER_USER_ID)).willReturn(List.of(savedLetter()));

            List<ConfessionLetter> result = listSentLettersService.execute(SENDER_USER_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(LETTER_ID);
        }

        @Test
        @DisplayName("고백 작성자는 받은 편지에 감사 답장을 보낸다")
        void 고백_작성자는_받은_편지에_감사_답장을_보낸다() {
            given(loadConfessionLetterPort.loadLetter(LETTER_ID)).willReturn(Optional.of(savedLetter()));
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(saveThankReplyPort.save(any(ConfessionThankReply.class))).willReturn(savedReply());

            ConfessionThankReply result = sendThankReplyService.execute(
                    new SendThankReplyUseCase.Command(AUTHOR_USER_ID, LETTER_ID, "고마워요")
            );

            assertThat(result.getLetterId()).isEqualTo(LETTER_ID);
            assertThat(result.getAuthorUserId()).isEqualTo(AUTHOR_USER_ID);
            verify(saveThankReplyPort).save(any(ConfessionThankReply.class));
        }

        @Test
        @DisplayName("편지 발신자는 감사 답장을 조회한다")
        void 편지_발신자는_감사_답장을_조회한다() {
            given(loadConfessionLetterPort.loadLetter(LETTER_ID)).willReturn(Optional.of(savedLetter()));
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));
            given(loadThankReplyPort.loadForLetter(LETTER_ID)).willReturn(Optional.of(savedReply()));

            Optional<ConfessionThankReply> result = getThankReplyService.execute(
                    new GetThankReplyUseCase.Query(SENDER_USER_ID, LETTER_ID)
            );

            assertThat(result).isPresent();
            assertThat(result.get().getLetterId()).isEqualTo(LETTER_ID);
            assertThat(result.get().getAuthorUserId()).isEqualTo(AUTHOR_USER_ID);
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("작성자는 자기 고백에 편지를 보낼 수 없다")
        void 작성자는_자기_고백에_편지를_보낼_수_없다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));

            assertThatThrownBy(
                    () -> sendConfessionLetterService.execute(
                            new SendConfessionLetterUseCase.Command(AUTHOR_USER_ID, CONFESSION_ID, "편지")
                    )
            ).isInstanceOf(ConfessionAccessDeniedException.class);
        }

        @Test
        @DisplayName("숨겨진 고백에는 편지를 보낼 수 없다")
        void 숨겨진_고백에는_편지를_보낼_수_없다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(deletedRecord()));

            assertThatThrownBy(
                    () -> sendConfessionLetterService.execute(
                            new SendConfessionLetterUseCase.Command(SENDER_USER_ID, CONFESSION_ID, "편지")
                    )
            ).isInstanceOf(ConfessionAccessDeniedException.class);
        }

        @Test
        @DisplayName("없는 고백에 편지를 보내면 예외가 발생한다")
        void 없는_고백에_편지를_보내면_예외가_발생한다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.empty());

            assertThatThrownBy(
                    () -> sendConfessionLetterService.execute(
                            new SendConfessionLetterUseCase.Command(SENDER_USER_ID, CONFESSION_ID, "편지")
                    )
            ).isInstanceOf(ConfessionNotFoundException.class);
        }

        @Test
        @DisplayName("작성자가 아닌 사용자는 받은 편지를 조회할 수 없다")
        void 작성자가_아닌_사용자는_받은_편지를_조회할_수_없다() {
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));

            assertThatThrownBy(
                    () -> listReceivedLettersService.execute(
                            new ListReceivedLettersUseCase.Query(OTHER_USER_ID, CONFESSION_ID)
                    )
            ).isInstanceOf(ConfessionAccessDeniedException.class);
        }

        @Test
        @DisplayName("없는 편지에 감사 답장을 보내면 예외가 발생한다")
        void 없는_편지에_감사_답장을_보내면_예외가_발생한다() {
            given(loadConfessionLetterPort.loadLetter(LETTER_ID)).willReturn(Optional.empty());

            assertThatThrownBy(
                    () -> sendThankReplyService.execute(
                            new SendThankReplyUseCase.Command(AUTHOR_USER_ID, LETTER_ID, "고마워요")
                    )
            ).isInstanceOf(ConfessionLetterNotFoundException.class);
        }

        @Test
        @DisplayName("작성자가 아닌 사용자의 감사 답장 시도는 편지 존재를 숨긴다")
        void 작성자가_아닌_사용자의_감사_답장_시도는_편지_존재를_숨긴다() {
            given(loadConfessionLetterPort.loadLetter(LETTER_ID)).willReturn(Optional.of(savedLetter()));
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));

            assertThatThrownBy(
                    () -> sendThankReplyService.execute(
                            new SendThankReplyUseCase.Command(SENDER_USER_ID, LETTER_ID, "고마워요")
                    )
            ).isInstanceOf(ConfessionLetterNotFoundException.class);
        }

        @Test
        @DisplayName("무관한 사용자의 감사 답장 조회는 편지 존재를 숨긴다")
        void 무관한_사용자의_감사_답장_조회는_편지_존재를_숨긴다() {
            given(loadConfessionLetterPort.loadLetter(LETTER_ID)).willReturn(Optional.of(savedLetter()));
            given(loadConfessionRecordPort.load(CONFESSION_ID)).willReturn(Optional.of(visibleRecord()));

            assertThatThrownBy(
                    () -> getThankReplyService.execute(
                            new GetThankReplyUseCase.Query(OTHER_USER_ID, LETTER_ID)
                    )
            ).isInstanceOf(ConfessionLetterNotFoundException.class);
        }
    }
}
