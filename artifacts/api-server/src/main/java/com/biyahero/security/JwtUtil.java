package com.biyahero.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);
    private static final long EXPIRY_MS = 7L * 24 * 60 * 60 * 1000;

    private final SecretKey secretKey;

    public JwtUtil() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            if ("production".equals(System.getenv("NODE_ENV"))) {
                throw new IllegalStateException("JWT_SECRET environment variable is required in production");
            }
            log.warn("[WARN] JWT_SECRET is not set — using an insecure default. Set JWT_SECRET before deploying.");
            secret = "biyahero-local-dev-only-not-for-production";
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String signToken(int userId) {
        return Jwts.builder()
            .subject(String.valueOf(userId))
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
            .signWith(secretKey)
            .compact();
    }

    public Integer verifyToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            String sub = claims.getSubject();
            if (sub != null) return Integer.parseInt(sub);
            return null;
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
