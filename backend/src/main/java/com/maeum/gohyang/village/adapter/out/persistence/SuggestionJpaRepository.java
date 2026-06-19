package com.maeum.gohyang.village.adapter.out.persistence;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuggestionJpaRepository extends JpaRepository<SuggestionJpaEntity, Long> {

    List<SuggestionJpaEntity> findByOrderByCreatedAtDesc(Pageable pageable);
}
