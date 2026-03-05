package com.rainblet.backend.service;

import com.rainblet.backend.dto.UserUpsertRequest;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User upsertFromSso(UserUpsertRequest request) {
        String provider = normalizeProvider(request.getSsoProvider());
        String ssoSubject = requireTrimmed(request.getSsoSubject(), "ssoSubject is required");
        String email = normalizeEmail(request.getEmail());

        Optional<User> existingByProvider = userRepository.findBySsoProviderAndSsoSubject(provider, ssoSubject);
        Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(email);

        User target = existingByProvider.or(() -> existingByEmail).orElseGet(User::new);

        Optional<User> emailOwner = existingByEmail;
        if (emailOwner.isPresent() && target.getId() != null && !emailOwner.get().getId().equals(target.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already belongs to another user");
        }

        target.setEmail(email);
        target.setSsoProvider(provider);
        target.setSsoSubject(ssoSubject);
        target.setDisplayName(trimToNull(request.getDisplayName()));
        target.setGivenName(trimToNull(request.getGivenName()));
        target.setFamilyName(trimToNull(request.getFamilyName()));
        target.setPictureUrl(trimToNull(request.getPictureUrl()));
        target.setLocale(trimToNull(request.getLocale()));
        target.setEmailVerified(Boolean.TRUE.equals(request.getEmailVerified()));
        target.setLastLoginAt(Instant.now());

        return userRepository.save(target);
    }

    @Transactional
    public User resolveAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            return resolveFromClaims(claims);
        }

        String principal = String.valueOf(authentication.getPrincipal());
        if (StringUtils.hasText(principal)) {
            return userRepository.findByEmailIgnoreCase(principal.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found");
    }

    @Transactional
    public User registerLocalUser(String email, String name, String rawPassword) {
        String normalizedEmail = normalizeEmail(email);
        String displayName = requireTrimmed(name, "name is required");
        String password = requireTrimmed(rawPassword, "password is required");

        if (password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already belongs to another user");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setDisplayName(displayName);
        user.setEmailVerified(false);
        user.setSsoProvider("local");
        user.setSsoSubject(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setLastLoginAt(Instant.now());

        return userRepository.save(user);
    }

    @Transactional
    public User authenticateLocalUser(String email, String rawPassword) {
        String normalizedEmail = normalizeEmail(email);
        String password = requireTrimmed(rawPassword, "password is required");

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        String storedHash = user.getPasswordHash();
        if (!StringUtils.hasText(storedHash) || !passwordEncoder.matches(password, storedHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        return userRepository.save(user);
    }

    public void ensureEmailAvailable(String email, Long userIdToExclude) {
        if (!StringUtils.hasText(email)) {
            return;
        }

        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(existing -> {
            if (userIdToExclude == null || !existing.getId().equals(userIdToExclude)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "User email already exists: " + email.trim());
            }
        });
    }

    private User resolveFromClaims(Claims claims) {
        String provider = trimToNull(claimAsString(claims, "provider"));
        String email = trimToNull(claimAsString(claims, "email"));
        String subject = trimToNull(claimAsString(claims, "sub"));

        if ("local".equalsIgnoreCase(provider) && email != null) {
            return userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        }

        if (provider != null && subject != null) {
            Optional<User> existing = userRepository.findBySsoProviderAndSsoSubject(provider.toLowerCase(), subject);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        if (email != null) {
            Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(email);
            if (existingByEmail.isPresent()) {
                return existingByEmail.get();
            }
        }

        if (provider != null && !"local".equalsIgnoreCase(provider)) {
            UserUpsertRequest request = new UserUpsertRequest();
            request.setSsoProvider(provider);
            request.setSsoSubject(subject);
            request.setEmail(email);
            request.setDisplayName(claimAsString(claims, "name"));
            request.setGivenName(claimAsString(claims, "given_name"));
            request.setFamilyName(claimAsString(claims, "family_name"));
            request.setPictureUrl(claimAsString(claims, "picture"));
            request.setLocale(claimAsString(claims, "locale"));
            request.setEmailVerified(claimAsBoolean(claims, "email_verified"));
            return upsertFromSso(request);
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found");
    }

    private String claimAsString(Claims claims, String key) {
        Object value = claims.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private Boolean claimAsBoolean(Claims claims, String key) {
        Object value = claims.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String asString) {
            if ("true".equalsIgnoreCase(asString)) {
                return Boolean.TRUE;
            }
            if ("false".equalsIgnoreCase(asString)) {
                return Boolean.FALSE;
            }
        }

        return null;
    }

    private String normalizeProvider(String provider) {
        return StringUtils.hasText(provider) ? provider.trim().toLowerCase() : "google";
    }

    private String normalizeEmail(String email) {
        return requireTrimmed(email, "email is required").toLowerCase();
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String requireTrimmed(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }
}