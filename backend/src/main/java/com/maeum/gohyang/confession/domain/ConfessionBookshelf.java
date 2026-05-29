package com.maeum.gohyang.confession.domain;

/**
 * 도서관에서 고백 기록이 꽂히는 책장.
 * MVP에서는 고정 분류로 시작하고, 사용자 정의 책장은 후속 트랙에서 검토한다.
 */
public enum ConfessionBookshelf {

    RELATIONSHIP,
    FAMILY,
    CAREER,
    LONELINESS,
    REGRET,
    GENERAL
}
