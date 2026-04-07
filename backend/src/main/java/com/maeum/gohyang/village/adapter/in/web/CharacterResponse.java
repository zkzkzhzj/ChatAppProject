package com.maeum.gohyang.village.adapter.in.web;

import com.maeum.gohyang.village.domain.Character;

import java.time.LocalDateTime;

public record CharacterResponse(
        Long id,
        Long userId,
        LocalDateTime updatedAt
) {
    public static CharacterResponse from(Character character) {
        return new CharacterResponse(character.getId(), character.getUserId(), character.getUpdatedAt());
    }
}
