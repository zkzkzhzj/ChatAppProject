package com.maeum.gohyang.village.adapter.in.websocket;

import jakarta.validation.constraints.NotNull;

/** 클라이언트가 전송하는 위치 좌표. */
public record PositionRequest(
        @NotNull Double x,
        @NotNull Double y
) { }
