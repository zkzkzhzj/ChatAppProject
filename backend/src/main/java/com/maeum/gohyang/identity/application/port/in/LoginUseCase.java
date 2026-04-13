package com.maeum.gohyang.identity.application.port.in;

public interface LoginUseCase {

    TokenResult execute(LoginCommand command);

    record LoginCommand(String email, String rawPassword) { }

    record TokenResult(String accessToken) { }
}
