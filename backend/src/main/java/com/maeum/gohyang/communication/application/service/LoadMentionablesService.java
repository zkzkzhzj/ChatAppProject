package com.maeum.gohyang.communication.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.communication.application.port.in.LoadMentionablesUseCase;
import com.maeum.gohyang.communication.application.port.out.LoadParticipantPort;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoadMentionablesService implements LoadMentionablesUseCase {

    private final LoadParticipantPort loadParticipantPort;

    @Override
    public List<Mentionable> execute(long chatRoomId) {
        return loadParticipantPort.loadNpc(chatRoomId)
                .map(npc -> List.of(new Mentionable(npc.getId(), npc.getDisplayName(), MentionableType.NPC)))
                .orElse(List.of());
    }
}
