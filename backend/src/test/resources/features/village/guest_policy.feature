Feature: 게스트 마을 정책

  Scenario: 게스트는 임시 캐릭터로 마을을 이용할 수 있다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    And 게스트 캐릭터가 반환된다

  Scenario: 게스트는 개인 공간을 조회할 수 없다
    When GUEST 토큰 발급을 요청한다
    Then HTTP 상태코드 200을 받는다
    And 게스트가 내 공간을 조회하면 403을 받는다
