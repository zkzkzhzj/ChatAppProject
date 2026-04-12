package com.maeum.gohyang.village.adapter.out.persistence;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CharacterJpaRepository extends JpaRepository<CharacterJpaEntity, Long> {

    Optional<CharacterJpaEntity> findByUserId(Long userId);
}
