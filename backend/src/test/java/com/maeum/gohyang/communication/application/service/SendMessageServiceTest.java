package com.maeum.gohyang.communication.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.EntryType;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.domain.ParticipantRole;
import com.maeum.gohyang.communication.error.ChatRoomNotFoundException;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;

import java.time.LocalDateTime;

import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class SendMessageServiceTest {

    @Mock LoadParticipantPort loadParticipantPort;
    @Mock SaveParticipantPort saveParticipantPort;
    @Mock SaveMessagePort saveMessagePort;
    @Mock GenerateNpcResponsePort generateNpcResponsePort;

    @InjectMocks SendMessageService sendMessageService;

    private static final long USER_ID = 1L;
    private static final long CHAT_ROOM_ID = 1L;
    private static final long PARTICIPANT_ID = 10L;
    private static final long NPC_PARTICIPANT_ID = 1L;

    private Participant userParticipant() {
        return Participant.restore(PARTICIPANT_ID, USER_ID, CHAT_ROOM_ID, "주민",
                ParticipantRole.MEMBER, EntryType.PROXIMITY, LocalDateTime.now(), null);
    }

    private Participant npcParticipant() {
        return Participant.restore(NPC_PARTICIPANT_ID, null, CHAT_ROOM_ID, "마을 주민",
                ParticipantRole.NPC, EntryType.SYSTEM, LocalDateTime.now(), null);
    }

    @Nested
    @DisplayName("성공 케이스")
    class Success {

        @Test
        @DisplayName("기존 참여자가 있으면 메시지를 전송하고 NPC 응답을 받는다")
        void existingParticipant_sendsMessageAndGetsNpcResponse() {
            // Given
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(loadParticipantPort.loadNpc(CHAT_ROOM_ID)).willReturn(Optional.of(npcParticipant()));
            given(saveMessagePort.save(any(Message.class))).willAnswer(inv -> inv.getArgument(0));
            given(generateNpcResponsePort.generate(anyString())).willReturn("NPC 응답");

            // When
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "안녕하세요"));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo("안녕하세요");
            assertThat(result.npcMessage().getBody()).isEqualTo("NPC 응답");
            verify(saveParticipantPort, never()).save(any());
        }

        @Test
        @DisplayName("참여자가 없으면 자동 생성 후 메시지를 전송한다")
        void noParticipant_autoCreatesAndSendsMessage() {
            // Given
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.empty());
            given(saveParticipantPort.save(any(Participant.class))).willReturn(userParticipant());
            given(loadParticipantPort.loadNpc(CHAT_ROOM_ID)).willReturn(Optional.of(npcParticipant()));
            given(saveMessagePort.save(any(Message.class))).willAnswer(inv -> inv.getArgument(0));
            given(generateNpcResponsePort.generate(anyString())).willReturn("NPC 응답");

            // When
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "첫 메시지"));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo("첫 메시지");
            verify(saveParticipantPort).save(any(Participant.class));
        }

        @Test
        @DisplayName("동시 참여자 생성 시 UNIQUE 제약 위반이면 재조회로 복구한다")
        void concurrentParticipantCreation_recoversViaRetry() {
            // Given — load가 empty → save가 UNIQUE 위반 → 재조회 성공
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID))
                    .willReturn(Optional.empty())               // 첫 조회: 없음
                    .willReturn(Optional.of(userParticipant())); // 재조회: 있음 (다른 스레드가 먼저 생성)
            given(saveParticipantPort.save(any(Participant.class)))
                    .willThrow(new DataIntegrityViolationException("uk_participant_user_chatroom"));
            given(loadParticipantPort.loadNpc(CHAT_ROOM_ID)).willReturn(Optional.of(npcParticipant()));
            given(saveMessagePort.save(any(Message.class))).willAnswer(inv -> inv.getArgument(0));
            given(generateNpcResponsePort.generate(anyString())).willReturn("NPC 응답");

            // When
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "동시 메시지"));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo("동시 메시지");
            verify(saveParticipantPort).save(any(Participant.class));
        }
    }

    @Nested
    @DisplayName("실패 케이스")
    class Failure {

        @Test
        @DisplayName("NPC 참여자가 없으면 ChatRoomNotFoundException")
        void noNpcParticipant_throwsChatRoomNotFound() {
            // Given
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(loadParticipantPort.loadNpc(CHAT_ROOM_ID)).willReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "안녕")))
                    .isInstanceOf(ChatRoomNotFoundException.class);
        }

        @Test
        @DisplayName("빈 메시지 body는 InvalidMessageBodyException")
        void emptyBody_throwsInvalidMessageBody() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, ""))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("null 메시지 body는 InvalidMessageBodyException")
        void nullBody_throwsInvalidMessageBody() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, null))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("1000자 초과 메시지는 InvalidMessageBodyException")
        void tooLongBody_throwsInvalidMessageBody() {
            String longBody = "a".repeat(1001);
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, longBody))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }
    }
}
