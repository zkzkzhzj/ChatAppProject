package com.maeum.gohyang.village.application.port.out;

import java.util.Optional;

import com.maeum.gohyang.village.domain.Space;

public interface LoadSpacePort {

    Optional<Space> loadDefault(long userId);
}
