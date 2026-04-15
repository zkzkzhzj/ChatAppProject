package com.maeum.gohyang.communication.application.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.LoadChatHistoryUseCase;
import com.maeum.gohyang.communication.application.port.out.LoadMessageHistoryPort;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;
import com.maeum.gohyang.communication.domain.Message;
import com.maeum.gohyang.communication.domain.Participant;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoadChatHistoryService implements LoadChatHistoryUseCase {

    private final LoadMessageHistoryPort loadMessageHistoryPort;
    private final LoadParticipantPort loadParticipantPort;

    @Override
    public Result execute(long chatRoomId, int limit) {
        List<Message> messages = loadMessageHistoryPort.loadRecent(chatRoomId, limit);
        Map<Long, Participant> participantMap = loadParticipantPort.loadAll(chatRoomId).stream()
                .collect(Collectors.toMap(Participant::getId, p -> p));
        return new Result(messages, participantMap);
    }
}
