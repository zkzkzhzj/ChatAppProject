package com.maeum.gohyang.communication.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
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
import com.maeum.gohyang.communication.application.port.out.PublishConversationSummaryEventPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.EntryType;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.NpcConversationContext;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.domain.ParticipantRole;
import com.maeum.gohyang.communication.error.InvalidMessageBodyException;

@ExtendWith(MockitoExtension.class)
class SendMessageServiceTest {

    @Mock LoadParticipantPort loadParticipantPort;
    @Mock SaveParticipantPort saveParticipantPort;
    @Mock SaveMessagePort saveMessagePort;
    @Mock NpcReplyService npcReplyService;
    @Mock PublishConversationSummaryEventPort publishConversationSummaryEventPort;

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
        @DisplayName("기존 참여자가 @멘션 메시지를 보내면 NPC 비동기 응답을 트리거한다")
        void 기존_참여자가_멘션_메시지를_보내면_NPC_비동기_응답을_트리거한다() {
            // Given
            String mentionBody = "@[마을 주민](npc:" + NPC_PARTICIPANT_ID + ") 안녕하세요";
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            // When
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, mentionBody));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo(mentionBody);
            verify(npcReplyService).replyAsync(any(NpcConversationContext.class));
            verify(saveParticipantPort, never()).save(any());
        }

        @Test
        @DisplayName("참여자가 없으면 자동 생성 후 메시지를 전송한다")
        void 참여자가_없으면_자동_생성_후_메시지를_전송한다() {
            // Given
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.empty());
            given(saveParticipantPort.save(any(Participant.class))).willReturn(userParticipant());
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            // When — 멘션 없는 일반 메시지
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "첫 메시지"));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo("첫 메시지");
            verify(saveParticipantPort).save(any(Participant.class));
            verify(npcReplyService, never()).replyAsync(any(NpcConversationContext.class));
        }

        @Test
        @DisplayName("동시 참여자 생성 시 UNIQUE 제약 위반이면 재조회로 복구한다")
        void 동시_참여자_생성_시_UNIQUE_제약_위반이면_재조회로_복구한다() {
            // Given — load가 empty → save가 UNIQUE 위반 → 재조회 성공
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID))
                    .willReturn(Optional.empty())               // 첫 조회: 없음
                    .willReturn(Optional.of(userParticipant())); // 재조회: 있음 (다른 스레드가 먼저 생성)
            given(saveParticipantPort.save(any(Participant.class)))
                    .willThrow(new DataIntegrityViolationException("uk_participant_user_chatroom"));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

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
        @DisplayName("멘션 없는 일반 메시지는 NPC 응답을 트리거하지 않는다")
        void 멘션_없는_일반_메시지는_NPC_응답을_트리거하지_않는다() {
            // Given
            given(loadParticipantPort.load(USER_ID, CHAT_ROOM_ID)).willReturn(Optional.of(userParticipant()));
            given(saveMessagePort.saveWithUser(any(Message.class), anyLong())).willAnswer(inv -> inv.getArgument(0));

            // When
            SendMessageUseCase.Result result = sendMessageService.execute(
                    new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, "안녕"));

            // Then
            assertThat(result.userMessage().getBody()).isEqualTo("안녕");
            verify(npcReplyService, never()).replyAsync(any(NpcConversationContext.class));
        }

        @Test
        @DisplayName("빈 메시지 body는 InvalidMessageBodyException")
        void 빈_메시지_body는_InvalidMessageBodyException() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, ""))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("null 메시지 body는 InvalidMessageBodyException")
        void null_메시지_body는_InvalidMessageBodyException() {
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, null))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }

        @Test
        @DisplayName("1000자 초과 메시지는 InvalidMessageBodyException")
        void 천자_초과_메시지는_InvalidMessageBodyException() {
            String longBody = "a".repeat(1001);
            assertThatThrownBy(() -> new SendMessageUseCase.Command(USER_ID, CHAT_ROOM_ID, longBody))
                    .isInstanceOf(InvalidMessageBodyException.class);
        }
    }
}
