package com.maeum.gohyang.communication.application.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
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

    @Override
    @Transactional
    public Result execute(Command command) {
        Participant userParticipant = getOrCreateParticipant(command.userId(), command.chatRoomId());

        Message userMessage = saveMessagePort.saveWithUser(
                Message.newMessage(command.chatRoomId(), userParticipant.getId(), command.body(), MessageType.TEXT),
                command.userId()
        );

        return new Result(userMessage);
    }

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
