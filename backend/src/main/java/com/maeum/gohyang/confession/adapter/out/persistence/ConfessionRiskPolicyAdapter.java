package com.maeum.gohyang.confession.adapter.out.persistence;

import java.util.Locale;

import org.springframework.stereotype.Component;

import com.maeum.gohyang.confession.application.port.out.AssessConfessionRiskPort;
import com.maeum.gohyang.confession.domain.ConfessionRiskLevel;

@Component
public class ConfessionRiskPolicyAdapter implements AssessConfessionRiskPort {

    @Override
    public ConfessionRiskLevel assess(String title, String body) {
        String text = ((title == null ? "" : title) + " " + (body == null ? "" : body))
                .toLowerCase(Locale.ROOT);
        if (containsAny(text, "자살", "죽고 싶", "죽고싶", "suicide")) {
            return ConfessionRiskLevel.IMMINENT;
        }
        if (containsAny(text, "자해", "해치고 싶", "해치고싶", "self-harm")) {
            return ConfessionRiskLevel.HIGH;
        }
        return ConfessionRiskLevel.LOW;
    }

    private boolean containsAny(String text, String... patterns) {
        for (String pattern : patterns) {
            if (text.contains(pattern)) {
                return true;
            }
        }
        return false;
    }
}
