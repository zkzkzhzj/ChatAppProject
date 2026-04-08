package com.maeum.gohyang.communication.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomJpaRepository extends JpaRepository<ChatRoomJpaEntity, Long> {
}
