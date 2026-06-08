package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ParticipantJpaRepository extends JpaRepository<ParticipantJpaEntity, Long> {

    Optional<ParticipantJpaEntity> findByUserIdAndChatRoomId(Long userId, Long chatRoomId);

    List<ParticipantJpaEntity> findByChatRoomId(Long chatRoomId);
}
