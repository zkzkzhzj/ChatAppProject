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
    @DisplayName("success")
    class Success {

        @Test
        @DisplayName("plain mention-like text is saved as a normal user message")
        void plain_mention_like_text_is_saved_as_normal_user_message() {
            String mentionBody = "@village-resident hello";
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, mentionBody));

            assertThat(result.userMessage().getBody()).isEqualTo(mentionBody);
        }

        @Test
        @DisplayName("participant is created automatically before sending a message")
        void participant_is_created_automatically_before_sending_message() {
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.empty());
            given(saveParticipantPort.save(any(Participant.class))).willReturn(userParticipant());
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "first message"));

            assertThat(result.userMessage().getBody()).isEqualTo("first message");
            verify(saveParticipantPort).save(any(Participant.class));
        }

        @Test
        @DisplayName("concurrent participant creation recovers by reloading")
        void concurrent_participant_creation_recovers_by_reloading() {
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
    @DisplayName("failure")
    class Failure {

        @Test
        @DisplayName("empty body throws InvalidMessageBodyException")
        void empty_body_throws_invalid_message_body_exception() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, ""))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("null body throws InvalidMessageBodyException")
        void null_body_throws_invalid_message_body_exception() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, null))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("body longer than limit throws InvalidMessageBodyException")
        void body_longer_than_limit_throws_invalid_message_body_exception() {
            String longBody = "a".repeat(1001);
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, longBody))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }
    }
}
