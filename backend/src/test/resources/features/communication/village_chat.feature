Feature: 마을 공개 채팅 — Happy Path

  Scenario: 게스트는 마을 채팅에 메시지를 보낼 수 없다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    When 게스트가 마을 채팅에 메시지 전송을 시도한다
    Then HTTP 상태코드 403을 받는다

  Scenario: 회원은 마을 채팅에서 메시지를 전송할 수 있다
    Given 미가입 이메일 "village_chat@test.com"이 있다
    And 비밀번호 "pass1234"로 회원가입을 요청한다
    And 캐릭터가 생성될 때까지 최대 10초 대기한다
    When "안녕하세요"를 마을 채팅에 전송한다
    Then 유저 메시지가 성공적으로 전송된다

  Scenario: 빈 메시지는 전송할 수 없다
    Given 미가입 이메일 "village_chat_empty@test.com"이 있다
    And 비밀번호 "pass1234"로 회원가입을 요청한다
    And 캐릭터가 생성될 때까지 최대 10초 대기한다
    When ""를 마을 채팅에 전송한다
    Then HTTP 상태코드 400을 받는다
