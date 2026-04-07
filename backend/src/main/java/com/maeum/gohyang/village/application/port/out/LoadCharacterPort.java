package com.maeum.gohyang.village.application.port.out;

import com.maeum.gohyang.village.domain.Character;

import java.util.Optional;

public interface LoadCharacterPort {

    Optional<Character> load(long userId);
}
