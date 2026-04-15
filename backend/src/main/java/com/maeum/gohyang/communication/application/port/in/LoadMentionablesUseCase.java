package com.maeum.gohyang.communication.application.port.in;

import java.util.List;

public interface LoadMentionablesUseCase {

    List<Mentionable> execute(long chatRoomId);

    enum MentionableType {
        NPC
    }

    record Mentionable(long id, String name, MentionableType type) { }
}
