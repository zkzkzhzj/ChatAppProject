package com.maeum.gohyang.identity.application.port.out;

import com.maeum.gohyang.identity.domain.UserType;

public interface IssueTokenPort {

    String issueMemberToken(Long userId);

    String issueGuestToken();
}
