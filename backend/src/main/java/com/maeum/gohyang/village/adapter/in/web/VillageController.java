package com.maeum.gohyang.village.adapter.in.web;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.village.application.port.in.GetMyCharacterUseCase;
import com.maeum.gohyang.village.application.port.in.GetMySpaceUseCase;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.domain.GuestNoPersonalSpaceException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/village")
@RequiredArgsConstructor
public class VillageController {

    private final GetMyCharacterUseCase getMyCharacterUseCase;
    private final GetMySpaceUseCase getMySpaceUseCase;

    /**
     * 내 캐릭터 조회.
     * - MEMBER: DB에서 조회. 회원가입 직후 Kafka 이벤트 처리 전이면 404가 올 수 있다 (프론트에서 폴링).
     * - GUEST: DB 저장 없는 기본 캐릭터를 즉석 생성해 반환. 새로고침 시 초기화된다.
     */
    @GetMapping("/characters/me")
    public CharacterResponse getMyCharacter(@AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            return CharacterResponse.from(Character.defaultGuest());
        }
        return CharacterResponse.from(getMyCharacterUseCase.execute(user.userId()));
    }

    /**
     * 내 기본 공간 조회.
     * - MEMBER: DB에서 조회.
     * - GUEST: 개인 공간 없음. 403 반환.
     */
    @GetMapping("/spaces/me")
    public SpaceResponse getMySpace(@AuthenticationPrincipal AuthenticatedUser user) {
        if (user.isGuest()) {
            throw new GuestNoPersonalSpaceException();
        }
        return SpaceResponse.from(getMySpaceUseCase.execute(user.userId()));
    }
}
