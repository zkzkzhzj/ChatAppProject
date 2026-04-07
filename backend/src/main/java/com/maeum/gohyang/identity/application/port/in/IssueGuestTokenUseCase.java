package com.maeum.gohyang.identity.application.port.in;

public interface IssueGuestTokenUseCase {

    TokenResult execute();

    record TokenResult(String accessToken) {}
}
