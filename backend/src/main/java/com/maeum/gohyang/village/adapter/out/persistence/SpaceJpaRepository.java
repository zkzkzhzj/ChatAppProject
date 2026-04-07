package com.maeum.gohyang.village.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpaceJpaRepository extends JpaRepository<SpaceJpaEntity, Long> {

    Optional<SpaceJpaEntity> findByUserIdAndIsDefaultTrue(Long userId);
}
