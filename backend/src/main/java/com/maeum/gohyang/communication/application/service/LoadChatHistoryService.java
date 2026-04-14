package com.maeum.gohyang.communication.application.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.maeum.gohyang.communication.application.port.in.LoadChatHistoryUseCase;
import com.maeum.gohyang.communication.application.port.out.LoadMessageHistoryPort;
import com.maeum.gohyang.communication.domain.Message;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoadChatHistoryService implements LoadChatHistoryUseCase {

    private final LoadMessageHistoryPort loadMessageHistoryPort;

    @Override
    public List<Message> execute(long chatRoomId, int limit) {
        return loadMessageHistoryPort.loadRecent(chatRoomId, limit);
    }
}
