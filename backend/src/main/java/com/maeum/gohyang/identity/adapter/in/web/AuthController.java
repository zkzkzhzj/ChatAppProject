package com.maeum.gohyang.identity.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.maeum.gohyang.identity.application.port.in.IssueGuestTokenUseCase;
import com.maeum.gohyang.identity.application.port.in.RegisterUserUseCase;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final RegisterUserUseCase registerUserUseCase;
    private final IssueGuestTokenUseCase issueGuestTokenUseCase;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterUserUseCase.TokenResult result = registerUserUseCase.execute(request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(result.accessToken()));
    }

    @PostMapping("/guest")
    @ResponseStatus(HttpStatus.OK)
    public AuthResponse guest() {
        IssueGuestTokenUseCase.TokenResult result = issueGuestTokenUseCase.execute();
        return new AuthResponse(result.accessToken());
    }
}
