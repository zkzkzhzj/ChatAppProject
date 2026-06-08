package com.maeum.gohyang.communication.application.port.out;

import java.util.List;
import java.util.Optional;

import com.maeum.gohyang.communication.domain.Participant;

public interface LoadParticipantPort {

    Optional<Participant> load(long userId, long chatRoomId);

    List<Participant> loadAll(long chatRoomId);
}
