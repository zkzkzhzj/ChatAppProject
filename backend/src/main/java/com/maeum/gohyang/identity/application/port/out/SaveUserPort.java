package com.maeum.gohyang.identity.application.port.out;

import com.maeum.gohyang.identity.domain.LocalAuthCredentials;
import com.maeum.gohyang.identity.domain.User;

public interface SaveUserPort {

    /** User와 로컬 인증 정보를 함께 저장한다. id가 채워진 User를 반환한다. */
    User saveWithLocalAuth(User user, LocalAuthCredentials credentials);
}
