package com.maeum.gohyang.village.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.village.domain.Character;

public record CharacterResponse(
        Long id,
        Long userId,
        LocalDateTime updatedAt
) {
    public static CharacterResponse from(Character character) {
        return new CharacterResponse(character.getId(), character.getUserId(), character.getUpdatedAt());
    }
}
