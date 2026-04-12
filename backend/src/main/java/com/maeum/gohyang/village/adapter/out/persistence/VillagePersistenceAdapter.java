package com.maeum.gohyang.village.adapter.out.persistence;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.village.application.port.out.LoadCharacterPort;
import com.maeum.gohyang.village.application.port.out.LoadSpacePort;
import com.maeum.gohyang.village.application.port.out.SaveCharacterPort;
import com.maeum.gohyang.village.application.port.out.SaveSpacePort;
import com.maeum.gohyang.village.domain.Character;
import com.maeum.gohyang.village.domain.Space;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VillagePersistenceAdapter
        implements SaveCharacterPort, LoadCharacterPort, SaveSpacePort, LoadSpacePort {

    private final CharacterJpaRepository characterJpaRepository;
    private final SpaceJpaRepository spaceJpaRepository;

    @Override
    public Character save(Character character) {
        return characterJpaRepository.save(CharacterJpaEntity.from(character)).toDomain();
    }

    @Override
    public Optional<Character> load(long userId) {
        return characterJpaRepository.findByUserId(userId)
                .map(CharacterJpaEntity::toDomain);
    }

    @Override
    public Space save(Space space) {
        return spaceJpaRepository.save(SpaceJpaEntity.from(space)).toDomain();
    }

    @Override
    public Optional<Space> loadDefault(long userId) {
        return spaceJpaRepository.findByUserIdAndIsDefaultTrue(userId)
                .map(SpaceJpaEntity::toDomain);
    }
}
