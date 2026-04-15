package com.maeum.gohyang.communication.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.maeum.gohyang.communication.domain.ParticipantRole;

public interface ParticipantJpaRepository extends JpaRepository<ParticipantJpaEntity, Long> {

    Optional<ParticipantJpaEntity> findByUserIdAndChatRoomId(Long userId, Long chatRoomId);

    Optional<ParticipantJpaEntity> findByParticipantRoleAndChatRoomId(ParticipantRole role, Long chatRoomId);

    List<ParticipantJpaEntity> findByChatRoomId(Long chatRoomId);
}
