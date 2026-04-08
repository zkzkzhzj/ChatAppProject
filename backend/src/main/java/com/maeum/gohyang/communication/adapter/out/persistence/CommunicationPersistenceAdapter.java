package com.maeum.gohyang.communication.adapter.out.persistence;

import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.application.port.out.SaveChatRoomPort;
import com.maeum.gohyang.communication.application.port.out.SaveParticipantPort;
import com.maeum.gohyang.communication.domain.ChatRoom;
import com.maeum.gohyang.communication.domain.Participant;
import com.maeum.gohyang.communication.domain.ParticipantRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CommunicationPersistenceAdapter
        implements SaveChatRoomPort, SaveParticipantPort, LoadParticipantPort {

    private final ChatRoomJpaRepository chatRoomJpaRepository;
    private final ParticipantJpaRepository participantJpaRepository;

    @Override
    public ChatRoom save(ChatRoom chatRoom) {
        return chatRoomJpaRepository.save(ChatRoomJpaEntity.from(chatRoom)).toDomain();
    }

    @Override
    public Participant save(Participant participant) {
        return participantJpaRepository.save(ParticipantJpaEntity.from(participant)).toDomain();
    }

    @Override
    public Optional<Participant> loadByUserAndRoom(long userId, long chatRoomId) {
        return participantJpaRepository.findByUserIdAndChatRoomId(userId, chatRoomId)
                .map(ParticipantJpaEntity::toDomain);
    }

    @Override
    public Optional<Participant> loadNpcByRoom(long chatRoomId) {
        return participantJpaRepository.findByParticipantRoleAndChatRoomId(ParticipantRole.NPC, chatRoomId)
                .map(ParticipantJpaEntity::toDomain);
    }
}
