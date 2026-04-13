package com.maeum.gohyang.identity.adapter.in.web;

import com.maeum.gohyang.identity.application.port.in.LoginUseCase.LoginCommand;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email
        String email,

        @NotBlank
        String password
) {
    public LoginCommand toCommand() {
        return new LoginCommand(email, password);
    }
}
