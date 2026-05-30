package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.SendThankReplyUseCase;
import com.maeum.gohyang.confession.domain.ConfessionThankReply;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendThankReplyRequest(
        @NotBlank
        @Size(max = ConfessionThankReply.MAX_BODY_LENGTH)
        String body
) {

    public SendThankReplyUseCase.Command toCommand(long requesterUserId, long letterId) {
        return new SendThankReplyUseCase.Command(requesterUserId, letterId, body);
    }
}
