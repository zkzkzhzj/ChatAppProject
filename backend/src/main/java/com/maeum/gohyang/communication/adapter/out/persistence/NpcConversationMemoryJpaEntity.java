package com.maeum.gohyang.communication.adapter.out.persistence;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.maeum.gohyang.communication.domain.NpcConversationMemory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "npc_conversation_memory")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NpcConversationMemoryJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(nullable = false)
    private int messageCount;

    /**
     * pgvector embedding.
     * Hibernate 7.x의 네이티브 벡터 타입 지원으로 float[] ↔ vector 자동 매핑된다.
     * @JdbcTypeCode(SqlTypes.VECTOR)가 JDBC 파라미터를 vector 타입으로 바인딩한다.
     */
    @JdbcTypeCode(SqlTypes.VECTOR)
    @Array(length = 768)
    @Column(name = "embedding")
    private float[] embedding;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static NpcConversationMemoryJpaEntity from(NpcConversationMemory memory) {
        NpcConversationMemoryJpaEntity e = new NpcConversationMemoryJpaEntity();
        e.userId = memory.getUserId();
        e.summary = memory.getSummary();
        e.messageCount = memory.getMessageCount();
        e.embedding = toFloatArray(memory.getEmbedding());
        e.createdAt = memory.getCreatedAt();
        return e;
    }

    public NpcConversationMemory toDomain() {
        return NpcConversationMemory.restore(id, userId, summary, messageCount,
                toFloatList(embedding), createdAt);
    }

    /** List<Float> → float[] (Hibernate 벡터 타입용) */
    static float[] toFloatArray(List<Float> vector) {
        if (vector == null || vector.isEmpty()) {
            return null;
        }
        float[] result = new float[vector.size()];
        for (int i = 0; i < vector.size(); i++) {
            result[i] = vector.get(i);
        }
        return result;
    }

    /** float[] → List<Float> (도메인 변환용) */
    static List<Float> toFloatList(float[] array) {
        if (array == null || array.length == 0) {
            return Collections.emptyList();
        }
        List<Float> result = new ArrayList<>(array.length);
        for (float f : array) {
            result.add(f);
        }
        return result;
    }

    /** List<Float> → pgvector 문자열 "[0.1,0.2,0.3]" (네이티브 쿼리 파라미터용) */
    static String toVectorString(List<Float> vector) {
        if (vector == null || vector.isEmpty()) {
            return null;
        }
        return "[" + vector.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",")) + "]";
    }
}
