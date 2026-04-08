package com.maeum.gohyang.communication.application.port.out;

import com.maeum.gohyang.communication.domain.Message;

public interface SaveMessagePort {
    Message save(Message message);
}
