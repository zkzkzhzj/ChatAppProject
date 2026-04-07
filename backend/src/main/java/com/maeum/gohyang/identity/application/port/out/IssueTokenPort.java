package com.maeum.gohyang.identity.application.port.out;

public interface IssueTokenPort {

    String issueMemberToken(Long userId);

    String issueGuestToken();
}
