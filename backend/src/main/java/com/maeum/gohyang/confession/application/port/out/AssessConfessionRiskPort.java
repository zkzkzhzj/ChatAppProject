package com.maeum.gohyang.confession.application.port.out;

import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;

public interface AssessConfessionRiskPort {

    ConfessionRiskLevel assess(String title, String body);
}
