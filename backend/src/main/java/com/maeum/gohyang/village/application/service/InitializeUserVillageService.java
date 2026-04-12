package com.maeum.gohyang.village.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.village.application.port.in.InitializeUserVillageUseCase;
import com.maeum.gohyang.village.application.port.out.LoadCharacterPort;
import com.maeum.gohyang.village.application.port.out.SaveCharacterPort;
import com.maeum.gohyang.village.application.port.out.SaveSpacePort;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.domain.Space;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class InitializeUserVillageService implements InitializeUserVillageUseCase {

    private final LoadCharacterPort loadCharacterPort;
    private final SaveCharacterPort saveCharacterPort;
    private final SaveSpacePort saveSpacePort;

    @Override
    @Transactional
    public void execute(long userId) {
        // Kafka at-least-once 보장으로 동일 이벤트가 재전달될 수 있다.
        // processed_event 테이블이 1차 방어선이지만, 서비스 레벨에서도 이중 생성을 방지한다.
        if (loadCharacterPort.load(userId).isPresent()) {
            log.warn("Village 초기화 중복 요청 무시: userId={}", userId);
            return;
        }

        saveCharacterPort.save(Character.newCharacter(userId));
        saveSpacePort.save(Space.newDefaultSpace(userId));

        log.debug("Village 초기화 완료: userId={}", userId);
    }
}
