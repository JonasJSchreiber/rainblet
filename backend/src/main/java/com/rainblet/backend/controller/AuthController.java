package com.rainblet.backend.controller;

import com.rainblet.backend.dto.AuthResponse;
import com.rainblet.backend.dto.EmailLoginRequest;
import com.rainblet.backend.dto.UserRegistrationRequest;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.rainblet.backend.security.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final String googleClientId;
    private final String googleClientSecret;
    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(
            @Value("${spring.security.oauth2.client.registration.google.client-id:}") String googleClientId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret:}") String googleClientSecret,
            UserService userService,
            JwtService jwtService
    ) {
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.userService = userService;
        this.jwtService = jwtService;
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

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody UserRegistrationRequest request) {
        User user = userService.registerLocalUser(request.getEmail(), request.getName(), request.getPassword());
        return authResponse(user, "local");
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody EmailLoginRequest request) {
        User user = userService.authenticateLocalUser(request.getEmail(), request.getPassword());
        return authResponse(user, "local");
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

    private AuthResponse authResponse(User user, String provider) {
        String name = StringUtils.hasText(user.getDisplayName()) ? user.getDisplayName() : user.getEmail();
        String picture = StringUtils.hasText(user.getPictureUrl()) ? user.getPictureUrl() : "";

        Map<String, Object> claims = new HashMap<>();
        claims.put("provider", provider);
        claims.put("sub", String.valueOf(user.getId()));
        claims.put("email", user.getEmail());
        claims.put("name", name);
        claims.put("picture", picture);

        String token = jwtService.generateToken(user.getEmail(), claims);
        return new AuthResponse(token, String.valueOf(user.getId()), user.getEmail(), name, picture);
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
