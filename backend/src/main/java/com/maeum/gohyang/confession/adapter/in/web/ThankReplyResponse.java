package com.maeum.gohyang.confession.adapter.in.web;

import java.time.LocalDateTime;

import com.maeum.gohyang.confession.domain.ConfessionThankReply;

public record ThankReplyResponse(
        long id,
        long letterId,
        String body,
        LocalDateTime createdAt
) {

    public static ThankReplyResponse from(ConfessionThankReply reply) {
        return new ThankReplyResponse(
                reply.getId(),
                reply.getLetterId(),
                reply.getBody(),
                reply.getCreatedAt()
        );
    }
}
