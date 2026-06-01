package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionLetter;

public interface SaveConfessionLetterPort {

    ConfessionLetter save(ConfessionLetter letter);
}
