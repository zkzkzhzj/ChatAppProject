Feature: 인증
  회원가입과 토큰 발급을 검증한다.

  Scenario: 이메일로 회원가입하면 JWT를 발급받는다
    Given 미가입 이메일 "test@maeum.com"이 있다
    When 비밀번호 "password123"으로 회원가입을 요청한다
    Then HTTP 상태코드 201을 받는다
    And 응답에 accessToken이 포함되어 있다

  Scenario: GUEST 토큰을 발급받는다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    And 응답에 accessToken이 포함되어 있다

  Scenario: 중복 이메일로 회원가입하면 실패한다
    Given "duplicate@maeum.com"으로 이미 가입된 유저가 있다
    When 동일한 이메일로 회원가입을 요청한다
    Then HTTP 상태코드 409를 받는다
