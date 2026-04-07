package com.maeum.gohyang.identity.adapter.out.persistence;

import com.maeum.gohyang.identity.application.port.out.CheckEmailDuplicatePort;
import com.maeum.gohyang.identity.application.port.out.SaveUserPort;
import com.maeum.gohyang.identity.domain.LocalAuthCredentials;
import com.maeum.gohyang.identity.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements SaveUserPort, CheckEmailDuplicatePort {

    private final UserJpaRepository userJpaRepository;
    private final UserLocalAuthJpaRepository userLocalAuthJpaRepository;

    @Override
    public User saveWithLocalAuth(User user, LocalAuthCredentials credentials) {
        UserJpaEntity savedUser = persistUser(user);
        persistLocalAuth(savedUser.getId(), credentials);
        return User.restore(savedUser.getId(), savedUser.getType(), savedUser.getCreatedAt());
    }

    @Override
    public boolean isEmailTaken(String email) {
        return userLocalAuthJpaRepository.existsByEmail(email);
    }

    private UserJpaEntity persistUser(User user) {
        return userJpaRepository.save(
                UserJpaEntity.create(user.getType(), user.getCreatedAt())
        );
    }

    private void persistLocalAuth(Long userId, LocalAuthCredentials credentials) {
        userLocalAuthJpaRepository.save(
                UserLocalAuthJpaEntity.create(userId, credentials.email(), credentials.passwordHash())
        );
    }
}
