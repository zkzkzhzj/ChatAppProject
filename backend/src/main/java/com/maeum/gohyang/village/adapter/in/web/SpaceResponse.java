package com.maeum.gohyang.village.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.village.domain.Space;
import com.maeum.gohyang.village.domain.SpaceTheme;

public record SpaceResponse(
        Long id,
        Long userId,
        boolean isDefault,
        SpaceTheme theme,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static SpaceResponse from(Space space) {
        return new SpaceResponse(
                space.getId(),
                space.getUserId(),
                space.isDefault(),
                space.getTheme(),
                space.getCreatedAt(),
                space.getUpdatedAt()
        );
    }
}
