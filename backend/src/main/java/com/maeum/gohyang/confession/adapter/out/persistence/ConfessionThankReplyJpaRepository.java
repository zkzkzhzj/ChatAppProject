package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfessionThankReplyJpaRepository extends JpaRepository<ConfessionThankReplyJpaEntity, Long> {

    Optional<ConfessionThankReplyJpaEntity> findByLetterId(Long letterId);
}
