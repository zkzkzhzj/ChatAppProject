package com.maeum.gohyang.village.application.port.out;

import com.maeum.gohyang.village.domain.Character;

public interface SaveCharacterPort {

    Character save(Character character);
}
