Feature: NPC 채팅 — Happy Path

  Scenario: 게스트는 NPC 채팅방을 생성할 수 없다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    When 게스트가 NPC 채팅방 생성을 시도한다
    Then HTTP 상태코드 403을 받는다

  Scenario: 회원은 NPC와 채팅할 수 있다
    Given 미가입 이메일 "npc_chat@test.com"이 있다
    And 비밀번호 "pass1234"로 회원가입을 요청한다
    And 캐릭터가 생성될 때까지 최대 10초 대기한다
    When NPC 채팅방을 생성한다
    Then 채팅방이 정상적으로 생성된다
    When "안녕하세요"를 NPC에게 전송한다
    Then NPC로부터 응답 메시지를 받는다
