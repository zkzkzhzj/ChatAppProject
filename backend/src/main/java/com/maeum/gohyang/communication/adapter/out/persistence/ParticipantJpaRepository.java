package com.maeum.gohyang.communication.adapter.out.persistence;

import com.maeum.gohyang.communication.domain.ParticipantRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParticipantJpaRepository extends JpaRepository<ParticipantJpaEntity, Long> {

    Optional<ParticipantJpaEntity> findByUserIdAndChatRoomId(Long userId, Long chatRoomId);

    Optional<ParticipantJpaEntity> findByParticipantRoleAndChatRoomId(ParticipantRole role, Long chatRoomId);
}
