package com.maeum.gohyang.confession.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.confession.application.port.in.AddConfessionReactionUseCase;
import com.maeum.gohyang.confession.application.port.out.AddConfessionReactionPort;
import com.maeum.gohyang.confession.application.port.out.LoadConfessionRecordPort;
import com.maeum.gohyang.confession.domain.ConfessionReaction;
import com.maeum.gohyang.confession.domain.ConfessionRecord;
import com.maeum.gohyang.confession.error.ConfessionNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AddConfessionReactionService implements AddConfessionReactionUseCase {

    private final LoadConfessionRecordPort loadConfessionRecordPort;
    private final AddConfessionReactionPort addConfessionReactionPort;

    @Override
    @Transactional
    public Result execute(Command command) {
        ConfessionRecord record = loadConfessionRecordPort.load(command.confessionId())
                .orElseThrow(ConfessionNotFoundException::new);
        if (!record.isVisible()) {
            throw new ConfessionNotFoundException();
        }
        boolean added = addConfessionReactionPort.addIfAbsent(
                ConfessionReaction.newReaction(command.confessionId(), command.userId(), command.reactionType())
        );
        return new Result(added, command.reactionType());
    }
}
