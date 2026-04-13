package com.maeum.gohyang.identity.application.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.identity.application.port.in.LoginUseCase;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import com.maeum.gohyang.identity.application.port.out.LoadUserByEmailPort;
import com.maeum.gohyang.identity.application.port.out.LoadUserByEmailPort.UserCredentials;
import com.maeum.gohyang.identity.error.InvalidCredentialsException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoginService implements LoginUseCase {

    private final LoadUserByEmailPort loadUserByEmailPort;
    private final IssueTokenPort issueTokenPort;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public TokenResult execute(LoginCommand command) {
        UserCredentials credentials = loadUserByEmailPort.loadByEmail(command.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(command.rawPassword(), credentials.passwordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = issueTokenPort.issueMemberToken(credentials.userId());
        return new TokenResult(token);
    }
}
