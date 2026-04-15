package com.maeum.gohyang.village.adapter.in.websocket;

/** 클라이언트가 전송하는 위치 좌표. */
public record PositionRequest(double x, double y) { }
