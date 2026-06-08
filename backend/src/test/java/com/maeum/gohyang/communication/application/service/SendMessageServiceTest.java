package com.maeum.gohyang.communication.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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
import org.springframework.dao.DataIntegrityViolationException;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.EntryType;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.domain.ParticipantRole;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;

@ExtendWith(MockitoExtension.class)
class SendMessageServiceTest {

    @Mock LoadParticipantPort loadParticipantPort;
    @Mock SaveParticipantPort saveParticipantPort;
    @Mock SaveMessagePort saveMessagePort;

    @InjectMocks SendMessageService sendMessageService;

    private static final long USER_ID = 1L;
    private static final long CHAT_ROOM_ID = 1L;
    private static final long PARTICIPANT_ID = 10L;

    private Participant userParticipant() {
        return Participant.restore(PARTICIPANT_ID, USER_ID, CHAT_ROOM_ID, "resident",
                ParticipantRole.MEMBER, EntryType.PROXIMITY, LocalDateTime.now(), null);
    }

    @Nested
    @DisplayName("성공")
    class Success {

        @Test
        @DisplayName("멘션처럼 보이는 본문도 일반 사용자 메시지로 저장된다")
        void 멘션처럼_보이는_본문도_일반_사용자_메시지로_저장된다() {
            String mentionBody = "@village-resident hello";
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, mentionBody));

            assertThat(result.userMessage().getBody()).isEqualTo(mentionBody);
        }

        @Test
        @DisplayName("메시지 전송 전 참여자가 자동 생성된다")
        void 메시지_전송_전_참여자가_자동_생성된다() {
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.empty());
            given(saveParticipantPort.save(any(Participant.class))).willReturn(userParticipant());
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "first message"));

            assertThat(result.userMessage().getBody()).isEqualTo("first message");
            verify(saveParticipantPort).save(any(Participant.class));
        }

        @Test
        @DisplayName("동시 참여자 생성 충돌 시 다시 조회해 복구한다")
        void 동시_참여자_생성_충돌_시_다시_조회해_복구한다() {
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID))
                    .willReturn(Optional.empty())
                    .willReturn(Optional.of(userParticipant()));
            given(saveParticipantPort.save(any(Participant.class)))
                    .willThrow(new DataIntegrityViolationException("uk_participant_user_chatroom"));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "concurrent message"));

            assertThat(result.userMessage().getBody()).isEqualTo("concurrent message");
            verify(saveParticipantPort).save(any(Participant.class));
        }
    }

    @Nested
    @DisplayName("실패")
    class Failure {

        @Test
        @DisplayName("빈 본문이면 InvalidMessageBodyException이 발생한다")
        void 빈_본문이면_InvalidMessageBodyException이_발생한다() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, ""))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("null 본문이면 InvalidMessageBodyException이 발생한다")
        void null_본문이면_InvalidMessageBodyException이_발생한다() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, null))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("본문 길이가 제한을 초과하면 InvalidMessageBodyException이 발생한다")
        void 본문_길이가_제한을_초과하면_InvalidMessageBodyException이_발생한다() {
            String longBody = "a".repeat(1001);
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, longBody))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }
    }
}
