package com.maeum.gohyang.village.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.village.application.port.in.GetMyCharacterUseCase;
import com.maeum.gohyang.village.application.port.out.LoadCharacterPort;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.error.CharacterNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetMyCharacterService implements GetMyCharacterUseCase {

    private final LoadCharacterPort loadCharacterPort;

    @Override
    @Transactional(readOnly = true)
    public Character execute(long userId) {
        return loadCharacterPort.load(userId)
                .orElseThrow(CharacterNotFoundException::new);
    }
}
