package com.maeum.gohyang.communication.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.CreateChatRoomUseCase;
import com.maeum.gohyang.communication.application.port.out.SaveChatRoomPort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.ChatRoom;
import com.maeum.gohyang.communication.domain.Participant;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CreateChatRoomService implements CreateChatRoomUseCase {

    private final SaveChatRoomPort saveChatRoomPort;
    private final SaveParticipantPort saveParticipantPort;

    @Override
    @Transactional
    public Result execute(Command command) {
        ChatRoom chatRoom = saveChatRoomPort.save(ChatRoom.newNpcRoom());

        Participant userParticipant = saveParticipantPort.save(
                Participant.newHost(command.userId(), chatRoom.getId(), command.displayName())
        );
        saveParticipantPort.save(Participant.newNpc(chatRoom.getId()));

        return new Result(chatRoom.getId(), userParticipant.getId());
    }
}
