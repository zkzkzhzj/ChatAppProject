package com.maeum.gohyang.village.application.service;

import org.springframework.dao.DataIntegrityViolationException;
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
        // 1차 방어: IdempotencyGuard.tryAcquire() (컨슈머에서 처리)
        // 2차 방어: 캐릭터 존재 여부 확인
        // 3차 방어: DB UNIQUE 제약조건 + DataIntegrityViolationException catch
        if (loadCharacterPort.load(userId).isPresent()) {
            log.warn("Village 초기화 중복 요청 무시: userId={}", userId);
            return;
        }

        try {
            saveCharacterPort.save(Character.newCharacter(userId));
            saveSpacePort.save(Space.newDefaultSpace(userId));
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 check 통과 후 UNIQUE 제약 위반 시 — 정상 흐름으로 처리
            log.warn("Village 초기화 동시 요청 감지 (UNIQUE 위반), 무시: userId={}", userId);
            return;
        }

        log.debug("Village 초기화 완료: userId={}", userId);
    }
}
