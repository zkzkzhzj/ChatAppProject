package com.maeum.gohyang.identity.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.identity.application.port.in.IssueGuestTokenUseCase;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IssueGuestTokenService implements IssueGuestTokenUseCase {

    private final IssueTokenPort issueTokenPort;

    @Override
    public TokenResult execute() {
        return new TokenResult(issueTokenPort.issueGuestToken());
    }
}
