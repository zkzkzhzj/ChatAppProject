package com.maeum.gohyang.identity.application.port.out;

import java.util.Optional;

public interface LoadUserByEmailPort {

    Optional<UserCredentials> loadByEmail(String email);

    record UserCredentials(Long userId, String passwordHash) { }
}
