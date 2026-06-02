package com.maeum.gohyang.confession.domain;

/**
 * 고백 기록의 안전 위험도.
 * MVP에서는 정책 레이어가 값을 산정하고 Domain은 값만 보관한다.
 */
public enum ConfessionRiskLevel {

    LOW,
    MEDIUM,
    HIGH,
    IMMINENT
}
