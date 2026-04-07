package com.maeum.gohyang.identity.adapter.in.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.stream.Stream;

/**
 * Security 허용 경로 설정.
 * - commonPublicPaths: 모든 환경에서 열려있는 경로 (application.yml)
 * - envPublicPaths: 환경별로 추가되는 경로 (application-{profile}.yml)
 *
 * Spring Boot는 리스트 프로퍼티를 병합하지 않고 덮어쓰므로 키를 분리하여 코드에서 합친다.
 */
@ConfigurationProperties(prefix = "security")
public record SecurityProperties(
        List<String> commonPublicPaths,
        List<String> envPublicPaths
) {
    public SecurityProperties {
        if (commonPublicPaths == null) commonPublicPaths = List.of();
        if (envPublicPaths == null) envPublicPaths = List.of();
    }

    public String[] allPublicPaths() {
        return Stream.concat(commonPublicPaths.stream(), envPublicPaths.stream())
                .toArray(String[]::new);
    }
}
