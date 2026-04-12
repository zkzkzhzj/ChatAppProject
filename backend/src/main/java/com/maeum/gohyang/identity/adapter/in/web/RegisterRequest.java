package com.maeum.gohyang.identity.adapter.in.web;

import com.maeum.gohyang.identity.application.port.in.RegisterUserUseCase.RegisterUserCommand;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8, max = 64)
        String password
) {
    public RegisterUserCommand toCommand() {
        return new RegisterUserCommand(email, password);
    }
}
