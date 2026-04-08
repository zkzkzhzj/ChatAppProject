package com.maeum.gohyang.identity.application.service;

import com.maeum.gohyang.identity.application.port.in.RegisterUserUseCase;
import com.maeum.gohyang.identity.application.port.out.CheckEmailDuplicatePort;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import com.maeum.gohyang.identity.application.port.out.SaveOutboxEventPort;
import com.maeum.gohyang.identity.application.port.out.SaveUserPort;
import com.maeum.gohyang.identity.error.DuplicateEmailException;
import com.maeum.gohyang.identity.domain.LocalAuthCredentials;
import com.maeum.gohyang.identity.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RegisterUserService implements RegisterUserUseCase {

    private final CheckEmailDuplicatePort checkEmailDuplicatePort;
    private final SaveUserPort saveUserPort;
    private final IssueTokenPort issueTokenPort;
    private final SaveOutboxEventPort saveOutboxEventPort;
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
                passwordEncoder.encode(command.rawPassword())
        );
        User savedUser = saveUserPort.saveWithLocalAuth(newUser, credentials);

        // user.registered 이벤트를 Outbox에 저장한다.
        // 같은 트랜잭션 내에 있으므로 회원가입 롤백 시 이벤트도 함께 롤백된다.
        saveOutboxEventPort.saveUserRegisteredEvent(savedUser.getId());

        String token = issueTokenPort.issueMemberToken(savedUser.getId());
        return new TokenResult(token);
    }
}
