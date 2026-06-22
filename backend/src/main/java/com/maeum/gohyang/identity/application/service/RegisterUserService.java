package com.maeum.gohyang.identity.application.service;

import java.util.Objects;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.maeum.gohyang.identity.application.port.in.RegisterUserUseCase;
import com.maeum.gohyang.identity.application.port.out.CheckEmailDuplicatePort;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import com.maeum.gohyang.identity.application.port.out.SaveUserPort;
import com.maeum.gohyang.identity.domain.LocalAuthCredentials;
import com.maeum.gohyang.identity.domain.User;
import com.maeum.gohyang.identity.error.DuplicateEmailException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegisterUserService implements RegisterUserUseCase {

    private final CheckEmailDuplicatePort checkEmailDuplicatePort;
    private final SaveUserPort saveUserPort;
    private final IssueTokenPort issueTokenPort;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public TokenResult execute(RegisterUserCommand command) {
        if (checkEmailDuplicatePort.isEmailTaken(command.email())) {
            throw new DuplicateEmailException();
        }

        User newUser = User.newMember();
        LocalAuthCredentials credentials = new LocalAuthCredentials(
                command.email(),
                Objects.requireNonNull(passwordEncoder.encode(command.rawPassword()))
        );

        User savedUser;
        try {
            savedUser = saveUserPort.saveWithLocalAuth(newUser, credentials);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 isEmailTaken 통과 후 UNIQUE 제약 위반 시
            throw new DuplicateEmailException();
        }

        String token = issueTokenPort.issueMemberToken(savedUser.getId());
        return new TokenResult(token);
    }
}
