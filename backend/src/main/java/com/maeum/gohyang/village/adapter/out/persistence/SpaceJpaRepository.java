package com.maeum.gohyang.village.adapter.out.persistence;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SpaceJpaRepository extends JpaRepository<SpaceJpaEntity, Long> {

    Optional<SpaceJpaEntity> findByUserIdAndIsDefaultTrue(Long userId);
}
