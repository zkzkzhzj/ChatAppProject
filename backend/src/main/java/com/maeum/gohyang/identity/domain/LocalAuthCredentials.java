package com.maeum.gohyang.identity.domain;

/**
 * 로컬(이메일/비밀번호) 인증 정보 Value Object.
 * email과 passwordHash는 항상 함께 다루는 하나의 개념이다.
 */
public record LocalAuthCredentials(String email, String passwordHash) { }
