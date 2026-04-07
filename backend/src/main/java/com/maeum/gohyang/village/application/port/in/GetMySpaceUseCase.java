package com.maeum.gohyang.village.application.port.in;

import com.maeum.gohyang.village.domain.Space;

public interface GetMySpaceUseCase {

    Space execute(long userId);
}
