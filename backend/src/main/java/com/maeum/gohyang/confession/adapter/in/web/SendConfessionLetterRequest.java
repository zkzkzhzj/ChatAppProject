package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.SendConfessionLetterUseCase;
import com.maeum.gohyang.confession.domain.ConfessionLetter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendConfessionLetterRequest(
        @NotBlank
        @Size(max = ConfessionLetter.MAX_BODY_LENGTH)
        String body
) {

    public SendConfessionLetterUseCase.Command toCommand(long senderUserId, long confessionId) {
        return new SendConfessionLetterUseCase.Command(senderUserId, confessionId, body);
    }
}
