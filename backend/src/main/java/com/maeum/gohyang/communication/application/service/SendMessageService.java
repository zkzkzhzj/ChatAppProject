package com.maeum.gohyang.communication.application.service;

import org.springframework.stereotype.Service;

import com.maeum.gohyang.communication.application.port.in.SendMessageUseCase;
import com.maeum.gohyang.communication.application.port.out.GenerateNpcResponsePort;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveMessagePort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.MessageType;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.error.ChatRoomNotFoundException;
import com.maeum.gohyang.communication.error.NotParticipantException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SendMessageService implements SendMessageUseCase {

    private final LoadParticipantPort loadParticipantPort;
    private final SaveMessagePort saveMessagePort;
    private final GenerateNpcResponsePort generateNpcResponsePort;

    @Override
    public Result execute(Command command) {
        Participant userParticipant = loadParticipantPort
                .load(command.userId(), command.chatRoomId())
                .orElseThrow(NotParticipantException::new);

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
}
