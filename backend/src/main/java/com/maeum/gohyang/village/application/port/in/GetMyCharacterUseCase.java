package com.maeum.gohyang.village.application.port.in;

import com.maeum.gohyang.village.domain.Character;

public interface GetMyCharacterUseCase {

    Character execute(long userId);
}
