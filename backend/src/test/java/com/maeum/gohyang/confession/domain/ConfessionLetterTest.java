package com.maeum.gohyang.confession.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.maeum.gohyang.confession.error.ConfessionAccessDeniedException;
import com.maeum.gohyang.confession.error.InvalidConfessionLetterContentException;

class ConfessionLetterTest {

    private static final long CONFESSION_ID = 10L;
    private static final long SENDER_USER_ID = 2L;
    private static final long OTHER_USER_ID = 3L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 5, 30, 2, 0);

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("편지는 발신자와 본문을 가진 전송 상태로 생성된다")
        void 편지는_발신자와_본문을_가진_전송_상태로_생성된다() {
            ConfessionLetter letter = ConfessionLetter.newLetter(CONFESSION_ID, SENDER_USER_ID, "  위로의 말  ");

            assertThat(letter.getId()).isNull();
            assertThat(letter.getConfessionId()).isEqualTo(CONFESSION_ID);
            assertThat(letter.getSenderUserId()).isEqualTo(SENDER_USER_ID);
            assertThat(letter.getBody()).isEqualTo("위로의 말");
            assertThat(letter.getStatus()).isEqualTo(ConfessionLetterStatus.SENT);
            assertThat(letter.isSent()).isTrue();
        }

        @Test
        @DisplayName("감사 답장은 본문을 다듬어서 생성된다")
        void 감사_답장은_본문을_다듬어서_생성된다() {
            ConfessionThankReply reply = ConfessionThankReply.newReply(100L, 1L, "  고마워요  ");

            assertThat(reply.getLetterId()).isEqualTo(100L);
            assertThat(reply.getAuthorUserId()).isEqualTo(1L);
            assertThat(reply.getBody()).isEqualTo("고마워요");
        }

        @Test
        @DisplayName("저장된 편지의 상태가 없으면 전송 상태로 복원한다")
        void 저장된_편지의_상태가_없으면_전송_상태로_복원한다() {
            ConfessionLetter letter = ConfessionLetter.restore(
                    100L,
                    CONFESSION_ID,
                    SENDER_USER_ID,
                    "본문",
                    null,
                    NOW
            );

            assertThat(letter.getStatus()).isEqualTo(ConfessionLetterStatus.SENT);
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("빈 편지 본문은 예외가 발생한다")
        void 빈_편지_본문은_예외가_발생한다() {
            assertThatThrownBy(() -> ConfessionLetter.newLetter(CONFESSION_ID, SENDER_USER_ID, " "))
                    .isInstanceOf(InvalidConfessionLetterContentException.class);
        }

        @Test
        @DisplayName("긴 편지 본문은 예외가 발생한다")
        void 긴_편지_본문은_예외가_발생한다() {
            assertThatThrownBy(
                    () -> ConfessionLetter.newLetter(
                            CONFESSION_ID,
                            SENDER_USER_ID,
                            "가".repeat(ConfessionLetter.MAX_BODY_LENGTH + 1)
                    )
            ).isInstanceOf(InvalidConfessionLetterContentException.class);
        }

        @Test
        @DisplayName("긴 감사 답장 본문은 예외가 발생한다")
        void 긴_감사_답장_본문은_예외가_발생한다() {
            assertThatThrownBy(
                    () -> ConfessionThankReply.newReply(
                            100L,
                            1L,
                            "가".repeat(ConfessionThankReply.MAX_BODY_LENGTH + 1)
                    )
            ).isInstanceOf(InvalidConfessionLetterContentException.class);
        }

        @Test
        @DisplayName("발신자가 아닌 사용자는 편지 권한 예외가 발생한다")
        void 발신자가_아닌_사용자는_편지_권한_예외가_발생한다() {
            ConfessionLetter letter = ConfessionLetter.newLetter(CONFESSION_ID, SENDER_USER_ID, "본문");

            assertThatThrownBy(() -> letter.assertSender(OTHER_USER_ID))
                    .isInstanceOf(ConfessionAccessDeniedException.class);
        }
    }
}
