package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.Participant;

public interface SaveParticipantPort {
    Participant save(Participant participant);
}
