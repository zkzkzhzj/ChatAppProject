package com.maeum.gohyang.confession.adapter.in.web;

import com.maeum.gohyang.confession.application.port.in.CreateConfessionUseCase;
import com.maeum.gohyang.confession.domain.ConfessionBookshelf;
import com.maeum.gohyang.confession.domain.ConfessionRecord;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateConfessionRequest(
        @NotBlank
        @Size(max = ConfessionRecord.MAX_TITLE_LENGTH)
        String title,

        @NotBlank
        @Size(max = ConfessionRecord.MAX_BODY_LENGTH)
        String body,

        ConfessionBookshelf bookshelf
) {

    public CreateConfessionUseCase.Command toCommand(long authorUserId) {
        return new CreateConfessionUseCase.Command(authorUserId, title, body, bookshelf);
    }
}
