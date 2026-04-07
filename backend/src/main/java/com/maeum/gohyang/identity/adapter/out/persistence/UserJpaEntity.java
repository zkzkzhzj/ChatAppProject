package com.maeum.gohyang.identity.adapter.out.persistence;

import com.maeum.gohyang.identity.domain.UserType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserType type;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime deletedAt;

    public static UserJpaEntity create(UserType type, LocalDateTime createdAt) {
        UserJpaEntity e = new UserJpaEntity();
        e.type = type;
        e.createdAt = createdAt;
        return e;
    }
}
