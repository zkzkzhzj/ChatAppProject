package com.maeum.gohyang.village.application.port.out;

import java.util.Optional;

import com.maeum.gohyang.village.domain.Character;

public interface LoadCharacterPort {

    Optional<Character> load(long userId);
}
