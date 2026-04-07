package com.maeum.gohyang.identity.adapter.out.persistence;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_local_auth")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserLocalAuthJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime deletedAt;

    public static UserLocalAuthJpaEntity create(Long userId, String email, String passwordHash) {
        UserLocalAuthJpaEntity e = new UserLocalAuthJpaEntity();
        e.userId = userId;
        e.email = email;
        e.passwordHash = passwordHash;
        e.createdAt = LocalDateTime.now();
        return e;
    }
}
