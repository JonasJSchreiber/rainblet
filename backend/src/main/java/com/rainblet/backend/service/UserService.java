package com.rainblet.backend.service;

import com.rainblet.backend.dto.UserUpsertRequest;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User upsertFromSso(UserUpsertRequest request) {
        String provider = normalizeProvider(request.getSsoProvider());
        String ssoSubject = requireTrimmed(request.getSsoSubject(), "ssoSubject is required");
        String email = requireTrimmed(request.getEmail(), "email is required");

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

    private String normalizeProvider(String provider) {
        return StringUtils.hasText(provider) ? provider.trim().toLowerCase() : "google";
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