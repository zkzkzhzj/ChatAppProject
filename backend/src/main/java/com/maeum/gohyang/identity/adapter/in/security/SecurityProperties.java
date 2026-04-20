package com.maeum.gohyang.identity.adapter.in.security;

import java.util.List;
import java.util.stream.Stream;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Security 허용 경로 설정.
 * - commonPublicPaths: 기본 허용 경로 (application.yml 기본값 + SECURITY_COMMON_PUBLIC_PATHS env로 오버라이드)
 * - envPublicPaths: 환경별로 추가되는 경로 (application.yml 기본값 + SECURITY_ENV_PUBLIC_PATHS env로 오버라이드)
 *
 * 두 리스트 모두 콤마 구분 문자열을 env로 주입하면 Spring이 List&lt;String&gt;으로 자동 바인딩한다.
 * 키를 분리한 이유: Spring Boot는 리스트 프로퍼티를 병합하지 않고 덮어쓰므로 공통 + 환경별 분리 후 코드에서 합친다.
 */
@ConfigurationProperties(prefix = "security")
public record SecurityProperties(
        List<String> commonPublicPaths,
        List<String> envPublicPaths
) {
    public SecurityProperties {
        if (commonPublicPaths == null) {
            commonPublicPaths = List.of();
        }
        if (envPublicPaths == null) {
            envPublicPaths = List.of();
        }
    }

    public String[] allPublicPaths() {
        return Stream.concat(commonPublicPaths.stream(), envPublicPaths.stream())
                .toArray(String[]::new);
    }
}
