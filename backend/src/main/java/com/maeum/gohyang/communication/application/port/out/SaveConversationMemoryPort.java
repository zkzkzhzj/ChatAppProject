package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.NpcConversationMemory;

public interface SaveConversationMemoryPort {

    NpcConversationMemory save(NpcConversationMemory memory);
}
