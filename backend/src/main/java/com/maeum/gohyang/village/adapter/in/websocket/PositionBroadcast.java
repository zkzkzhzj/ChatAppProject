package com.maeum.gohyang.village.adapter.in.websocket;

/** 다른 유저에게 broadcast되는 위치 정보. */
public record PositionBroadcast(
        String id,
        String userType,
        double x,
        double y
) { }
