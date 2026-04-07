package com.maeum.gohyang.village.adapter.out.persistence;

import com.maeum.gohyang.village.domain.Space;
import com.maeum.gohyang.village.domain.SpaceTheme;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "space")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpaceJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private boolean isDefault;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SpaceTheme theme;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public static SpaceJpaEntity from(Space space) {
        SpaceJpaEntity e = new SpaceJpaEntity();
        e.userId = space.getUserId();
        e.isDefault = space.isDefault();
        e.theme = space.getTheme();
        e.createdAt = space.getCreatedAt();
        e.updatedAt = space.getUpdatedAt();
        return e;
    }

    public Space toDomain() {
        return Space.restore(id, userId, isDefault, theme, createdAt, updatedAt);
    }
}
