package com.rainblet.backend.controller;

import io.jsonwebtoken.Claims;
import java.net.URI;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final String googleClientId;
    private final String googleClientSecret;

    public AuthController(
            @Value("${spring.security.oauth2.client.registration.google.client-id:}") String googleClientId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret:}") String googleClientSecret
    ) {
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
    }

    @GetMapping("/google")
    public ResponseEntity<Void> googleLogin() {
        if (!googleOauthEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Google login is not configured on this server"
            );
        }

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create("/oauth2/authorization/google"))
                .build();
    }

    @GetMapping("/me")
    public Map<String, String> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        String principal = String.valueOf(authentication.getPrincipal());
        String id = principal;
        String email = principal;
        String name = principal;
        String picture = "";

        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            id = claimAsString(claims, "sub", id);
            email = claimAsString(claims, "email", email);
            name = claimAsString(claims, "name", name);
            picture = claimAsString(claims, "picture", picture);
        }

        return Map.of(
                "id", id,
                "email", email,
                "name", name,
                "pictureUrl", picture
        );
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        // Stateless JWT logout happens client-side by dropping the token.
    }

    private String claimAsString(Claims claims, String key, String fallback) {
        Object value = claims.get(key);
        if (value == null) {
            return fallback;
        }

        String stringValue = String.valueOf(value);
        return StringUtils.hasText(stringValue) ? stringValue : fallback;
    }

    private boolean googleOauthEnabled() {
        return StringUtils.hasText(googleClientId) && StringUtils.hasText(googleClientSecret);
    }
}