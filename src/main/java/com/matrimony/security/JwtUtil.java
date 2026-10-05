package com.matrimony.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import java.util.Base64;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long EXPIRATION_MS = TimeUnit.HOURS.toMillis(24);

    public JwtUtil(@Value("${jwt.secret}") String secretString) {
        System.out.println("--- LOADING JWT SECRET ---");
        System.out.println("Loaded secret from properties: [" + secretString + "]");
        System.out.println("--------------------------");
        // Correctly decode the Base64 string from properties into a byte array
        byte[] keyBytes = Base64.getDecoder().decode(secretString);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generates a JWT token for a given username.
     * The token includes the subject, issue date, and expiration date.
     *
     * @param username The username to be included in the token.
     * @return A securely signed JWT token string.
     */
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts the username from a JWT token.
     *
     * @param token The JWT token string.
     * @return The username extracted from the token's claims.
     */
    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /**
     * Validates a JWT token.
     *
     * @param token The JWT token string.
     * @param username The expected username to match against.
     * @return true if the token is valid, false otherwise.
     */
    public boolean validateToken(String token, String username) {
        try {
            String tokenUsername = extractUsername(token);
            return tokenUsername.equals(username) && !isTokenExpired(token);
        } catch (SignatureException e) {
            System.err.println("Invalid JWT signature: " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.err.println("Invalid JWT token: " + e.getMessage());
        } catch (ExpiredJwtException e) {
            System.err.println("JWT token is expired: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.err.println("JWT token is unsupported: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.err.println("JWT claims string is empty: " + e.getMessage());
        }
        return false;
    }

    /**
     * Checks if a token has expired.
     *
     * @param token The JWT token string.
     * @return true if the token is expired, false otherwise.
     */
    private boolean isTokenExpired(String token) {
        Date expirationDate = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
        return expirationDate.before(new Date());
    }
}