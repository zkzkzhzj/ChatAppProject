package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.RemoveConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.out.DeleteConfessionReactionPort;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RemoveConfessionReactionService implements RemoveConfessionReactionUseCase {

    private final DeleteConfessionReactionPort deleteConfessionReactionPort;

    @Override
    @Transactional
    public void execute(Command command) {
        deleteConfessionReactionPort.delete(command.userId(), command.confessionId(), command.reactionType());
    }
}
