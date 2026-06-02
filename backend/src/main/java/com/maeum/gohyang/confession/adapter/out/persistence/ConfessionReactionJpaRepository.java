package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.maeum.gohyang.confession.domain.ConfessionReactionType;

public interface ConfessionReactionJpaRepository extends JpaRepository<ConfessionReactionJpaEntity, Long> {

    @Modifying
    @Query(value = "INSERT INTO confession_reaction "
            + "(confession_id, user_id, reaction_type, created_at) "
            + "VALUES (:confessionId, :userId, :reactionType, NOW()) "
            + "ON CONFLICT (confession_id, user_id, reaction_type) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("confessionId") long confessionId,
                       @Param("userId") long userId,
                       @Param("reactionType") String reactionType);

    @Modifying
    @Query("DELETE FROM ConfessionReactionJpaEntity r "
            + "WHERE r.userId = :userId "
            + "AND r.confessionId = :confessionId "
            + "AND r.reactionType = :reactionType")
    void delete(@Param("userId") long userId,
                @Param("confessionId") long confessionId,
                @Param("reactionType") ConfessionReactionType reactionType);

    @Query(value = "SELECT reaction_type AS reactionType, COUNT(*) AS reactionCount "
            + "FROM confession_reaction "
            + "WHERE confession_id = :confessionId "
            + "GROUP BY reaction_type "
            + "ORDER BY reaction_type",
            nativeQuery = true)
    List<ConfessionReactionCountProjection> countByConfessionId(@Param("confessionId") long confessionId);
}
