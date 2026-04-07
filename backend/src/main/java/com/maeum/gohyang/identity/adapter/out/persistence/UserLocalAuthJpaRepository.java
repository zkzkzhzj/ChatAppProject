package com.maeum.gohyang.identity.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

interface UserLocalAuthJpaRepository extends JpaRepository<UserLocalAuthJpaEntity, Long> {

    boolean existsByEmail(String email);
}
