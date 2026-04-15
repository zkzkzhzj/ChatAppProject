package com.maeum.gohyang.identity.application.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.identity.application.port.in.LoginUseCase;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import com.maeum.gohyang.identity.application.port.out.LoadUserCredentialsPort;
import com.maeum.gohyang.identity.application.port.out.LoadUserCredentialsPort.UserCredentials;
import com.maeum.gohyang.identity.error.InvalidCredentialsException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoginService implements LoginUseCase {

    private final LoadUserCredentialsPort loadUserCredentialsPort;
    private final IssueTokenPort issueTokenPort;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public TokenResult execute(LoginCommand command) {
        UserCredentials credentials = loadUserCredentialsPort.load(command.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(command.rawPassword(), credentials.passwordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = issueTokenPort.issueMemberToken(credentials.userId());
        return new TokenResult(token);
    }
}
