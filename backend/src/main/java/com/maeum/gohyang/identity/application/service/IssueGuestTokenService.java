package com.maeum.gohyang.identity.application.service;

import com.maeum.gohyang.identity.application.port.in.IssueGuestTokenUseCase;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IssueGuestTokenService implements IssueGuestTokenUseCase {

    private final IssueTokenPort issueTokenPort;

    @Override
    public TokenResult execute() {
        return new TokenResult(issueTokenPort.issueGuestToken());
    }
}
