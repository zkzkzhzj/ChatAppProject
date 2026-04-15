package com.maeum.gohyang.identity.application.port.out;

import java.util.Optional;

public interface LoadUserCredentialsPort {

    Optional<UserCredentials> load(String email);

    record UserCredentials(Long userId, String passwordHash) { }
}
