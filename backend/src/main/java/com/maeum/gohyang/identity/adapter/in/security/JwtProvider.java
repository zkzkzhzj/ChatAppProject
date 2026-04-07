package com.maeum.gohyang.identity.adapter.in.security;

import com.maeum.gohyang.global.security.AuthenticatedUser;
import com.maeum.gohyang.global.security.UserType;
import com.maeum.gohyang.identity.application.port.out.IssueTokenPort;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtProvider implements IssueTokenPort {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiry-ms}")
    private long accessTokenExpiryMs;

    private SecretKey secretKey;

    @PostConstruct
    void init() {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String issueMemberToken(Long userId) {
        return buildToken(String.valueOf(userId), UserType.MEMBER);
    }

    @Override
    public String issueGuestToken() {
        return buildToken(null, UserType.GUEST);
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

            Long userId = null;
            if (role == UserType.MEMBER) {
                userId = Long.valueOf(claims.getSubject());
            }

            return Optional.of(new AuthenticatedUser(userId, role));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private String buildToken(String subject, UserType role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiryMs))
                .signWith(secretKey)
                .compact();
    }
}
