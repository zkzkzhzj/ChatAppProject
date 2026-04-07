package com.maeum.gohyang.village.application.port.out;

import com.maeum.gohyang.village.domain.Space;

import java.util.Optional;

public interface LoadSpacePort {

    Optional<Space> loadDefault(long userId);
}
