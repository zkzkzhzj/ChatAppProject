Feature: 마을 초기화

  Scenario: 회원가입 후 캐릭터와 공간이 생성된다
    Given 미가입 이메일 "village@maeum.com"이 있다
    When 비밀번호 "password123"으로 회원가입을 요청한다
    Then HTTP 상태코드 201을 받는다
    And 캐릭터가 생성될 때까지 최대 10초 대기한다
    And 내 캐릭터가 존재한다
    And 내 기본 공간이 존재한다
