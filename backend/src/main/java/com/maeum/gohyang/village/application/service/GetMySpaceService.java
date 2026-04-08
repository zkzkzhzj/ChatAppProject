package com.maeum.gohyang.village.application.service;

import com.maeum.gohyang.village.application.port.in.GetMySpaceUseCase;
import com.maeum.gohyang.village.application.port.out.LoadSpacePort;
import com.maeum.gohyang.village.domain.Space;
import com.maeum.gohyang.village.error.SpaceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetMySpaceService implements GetMySpaceUseCase {

    private final LoadSpacePort loadSpacePort;

    @Override
    @Transactional(readOnly = true)
    public Space execute(long userId) {
        return loadSpacePort.loadDefault(userId)
                .orElseThrow(SpaceNotFoundException::new);
    }
}
