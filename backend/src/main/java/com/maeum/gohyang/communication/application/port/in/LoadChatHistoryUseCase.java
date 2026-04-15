package com.maeum.gohyang.communication.application.port.in;

import java.util.List;
import java.util.Map;

import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.Participant;

public interface LoadChatHistoryUseCase {

    Result execute(long chatRoomId, int limit);

    record Result(List<Message> messages, Map<Long, Participant> participantMap) { }
}
