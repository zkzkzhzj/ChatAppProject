package com.maeum.gohyang.village.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CharacterJpaRepository extends JpaRepository<CharacterJpaEntity, Long> {

    Optional<CharacterJpaEntity> findByUserId(Long userId);
}
