package com.maeum.gohyang.identity.adapter.out.persistence;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.identity.application.port.out.CheckEmailDuplicatePort;
import com.maeum.gohyang.identity.application.port.out.LoadUserCredentialsPort;
import com.maeum.gohyang.identity.application.port.out.SaveUserPort;
import com.maeum.gohyang.identity.domain.LocalAuthCredentials;
import com.maeum.gohyang.identity.domain.User;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements SaveUserPort, CheckEmailDuplicatePort, LoadUserCredentialsPort {

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

    @Override
    public Optional<UserCredentials> load(String email) {
        return userLocalAuthJpaRepository.findByEmail(email)
                .map(entity -> new UserCredentials(entity.getUserId(), entity.getPasswordHash()));
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
