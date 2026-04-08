package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.ChatRoom;

public interface SaveChatRoomPort {
    ChatRoom save(ChatRoom chatRoom);
}
