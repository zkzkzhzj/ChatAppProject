package com.maeum.gohyang.identity.application.port.in;

public interface RegisterUserUseCase {

    TokenResult execute(RegisterUserCommand command);

    record RegisterUserCommand(String email, String rawPassword) {}

    record TokenResult(String accessToken) {}
}
