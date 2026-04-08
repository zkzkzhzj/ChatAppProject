package com.maeum.gohyang.communication.application.service;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.error.ChatRoomNotFoundException;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.error.NotParticipantException;
import com.maeum.gohyang.communication.domain.Participant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SendMessageService implements SendMessageUseCase {

    private final LoadParticipantPort loadParticipantPort;
    private final SaveMessagePort saveMessagePort;
    private final GenerateNpcResponsePort generateNpcResponsePort;

    @Override
    public Result execute(Command command) {
        Participant userParticipant = loadParticipantPort
                .loadByUserAndRoom(command.userId(), command.chatRoomId())
                .orElseThrow(NotParticipantException::new);

        Participant npcParticipant = loadParticipantPort
                .loadNpcByRoom(command.chatRoomId())
                .orElseThrow(ChatRoomNotFoundException::new);

        Message userMessage = saveMessagePort.save(
                Message.newMessage(command.chatRoomId(), userParticipant.getId(), command.body(), MessageType.TEXT)
        );

        String npcResponseText = generateNpcResponsePort.generate(command.body());
        Message npcMessage = saveMessagePort.save(
                Message.newMessage(command.chatRoomId(), npcParticipant.getId(), npcResponseText, MessageType.TEXT)
        );

        return new Result(toMessageData(userMessage), toMessageData(npcMessage));
    }

    private MessageData toMessageData(Message message) {
        return new MessageData(message.getId(), message.getParticipantId(),
                message.getBody(), message.getCreatedAt());
    }
}
