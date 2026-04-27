package com.maeum.gohyang.identity.adapter.in.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.ParseTokenPort;
import com.maeum.gohyang.global.security.UserType;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtProvider implements IssueTokenPort, ParseTokenPort {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiry-ms}")
    private long accessTokenExpiryMs;

    @Value("${jwt.guest-token-expiry-ms}")
    private long guestTokenExpiryMs;

    private SecretKey secretKey;

    @PostConstruct
    void init() {
        if (secret == null || secret.startsWith("change-me")) {
            throw new IllegalStateException(
                    "JWT_SECRET 환경변수가 설정되지 않았습니다. "
                    + "프로덕션 환경에서는 반드시 안전한 시크릿 키를 설정하세요.");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String issueMemberToken(Long userId) {
        return buildToken(String.valueOf(userId), UserType.MEMBER, accessTokenExpiryMs);
    }

    @Override
    public String issueGuestToken() {
        return buildToken("guest-" + UUID.randomUUID(), UserType.GUEST, guestTokenExpiryMs);
    }

    /**
     * 토큰을 파싱해 AuthenticatedUser를 반환한다.
     * 유효하지 않은 토큰이면 empty를 반환한다.
     */
    public Optional<AuthenticatedUser> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String roleStr = claims.get("role", String.class);
            UserType role = UserType.valueOf(roleStr);

            String subject = claims.getSubject();
            Long userId = (role == UserType.MEMBER) ? Long.valueOf(subject) : null;
            String sessionId = (role == UserType.GUEST) ? subject : null;

            return Optional.of(new AuthenticatedUser(userId, role, sessionId));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private String buildToken(String subject, UserType role, long expiryMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMs))
                .signWith(secretKey)
                .compact();
    }
}
