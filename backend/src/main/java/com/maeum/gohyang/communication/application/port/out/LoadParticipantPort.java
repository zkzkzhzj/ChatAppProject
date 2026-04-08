package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.Participant;

import java.util.Optional;

public interface LoadParticipantPort {

    /** 채팅방에서 특정 유저의 참여자 정보를 조회한다. */
    Optional<Participant> load(long userId, long chatRoomId);

    /** 채팅방의 NPC 참여자를 조회한다. */
    Optional<Participant> loadNpc(long chatRoomId);
}
