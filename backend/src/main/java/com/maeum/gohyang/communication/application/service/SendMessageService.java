package com.maeum.gohyang.communication.application.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.error.ChatRoomNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SendMessageService implements SendMessageUseCase {

    private final LoadParticipantPort loadParticipantPort;
    private final SaveParticipantPort saveParticipantPort;
    private final SaveMessagePort saveMessagePort;
    private final GenerateNpcResponsePort generateNpcResponsePort;

    /**
     * 메시지 전송.
     *
     * PostgreSQL(participant) 작업을 트랜잭션으로 묶는다.
     * Cassandra(message 저장)는 별도 저장소이므로 PostgreSQL 트랜잭션과 무관하게 동작한다.
     *
     * Phase 5에서 NPC 응답이 LLM API 호출로 바뀌면, 트랜잭션 범위를 participant 조회까지로
     * 축소하고 메시지 저장/NPC 응답을 트랜잭션 밖으로 분리해야 한다.
     */
    @Override
    @Transactional
    public Result execute(Command command) {
        Participant userParticipant = getOrCreateParticipant(command.userId(), command.chatRoomId());

        Participant npcParticipant = loadParticipantPort
                .loadNpc(command.chatRoomId())
                .orElseThrow(ChatRoomNotFoundException::new);

        Message userMessage = saveMessagePort.save(
                Message.newMessage(command.chatRoomId(), userParticipant.getId(), command.body(), MessageType.TEXT)
        );

        String npcResponseText = generateNpcResponsePort.generate(command.body());
        Message npcMessage = saveMessagePort.save(
                Message.newMessage(command.chatRoomId(), npcParticipant.getId(), npcResponseText, MessageType.TEXT)
        );

        return new Result(userMessage, npcMessage);
    }

    /**
     * 공개 채팅방에서는 참여자가 없으면 자동 생성한다.
     * 동시 요청 시 UNIQUE(user_id, chat_room_id) 제약조건으로 중복 방지.
     * DataIntegrityViolationException 발생 시 재조회하여 반환한다.
     */
    private Participant getOrCreateParticipant(long userId, long chatRoomId) {
        return loadParticipantPort.load(userId, chatRoomId)
                .orElseGet(() -> {
                    try {
                        return saveParticipantPort.save(Participant.newMember(userId, chatRoomId));
                    } catch (DataIntegrityViolationException e) {
                        return loadParticipantPort.load(userId, chatRoomId)
                                .orElseThrow(ChatRoomNotFoundException::new);
                    }
                });
    }
}
