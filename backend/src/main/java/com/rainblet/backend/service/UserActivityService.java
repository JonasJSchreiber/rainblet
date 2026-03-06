package com.rainblet.backend.service;

import com.rainblet.backend.entity.User;
import com.rainblet.backend.entity.UserActivity;
import com.rainblet.backend.repository.UserActivityRepository;
import com.rainblet.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserActivityService {

    private static final Logger log = LoggerFactory.getLogger(UserActivityService.class);

    private final UserActivityRepository userActivityRepository;
    private final UserRepository userRepository;

    public UserActivityService(UserActivityRepository userActivityRepository, UserRepository userRepository) {
        this.userActivityRepository = userActivityRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void record(HttpServletRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return;
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return;
        }

        String resource = request.getRequestURI();
        if (!StringUtils.hasText(resource)) {
            return;
        }

        String email = resolveEmail(authentication);
        Long userId = resolveUserId(authentication);

        if (!StringUtils.hasText(email) || userId == null) {
            Optional<User> userFallback = resolveUserFromRepository(email, userId);
            if (userFallback.isEmpty()) {
                return;
            }
            User user = userFallback.get();
            userId = user.getId();
            email = user.getEmail();
        }

        UserActivity activity = new UserActivity();
        activity.setUserId(userId);
        activity.setUserEmail(email.trim().toLowerCase());
        activity.setResourceCalled(resource);
        activity.setCalledAt(Instant.now());

        try {
            userActivityRepository.save(activity);
        } catch (DataAccessException ex) {
            log.warn("Unable to persist user activity for resource {}", resource, ex);
        }
    }

    private Optional<User> resolveUserFromRepository(String email, Long userId) {
        if (userId != null) {
            Optional<User> byId = userRepository.findById(userId);
            if (byId.isPresent()) {
                return byId;
            }
        }

        if (StringUtils.hasText(email)) {
            return userRepository.findByEmailIgnoreCase(email.trim());
        }

        return Optional.empty();
    }

    private String resolveEmail(Authentication authentication) {
        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            Object emailClaim = claims.get("email");
            if (emailClaim != null) {
                String email = String.valueOf(emailClaim).trim();
                if (StringUtils.hasText(email)) {
                    return email;
                }
            }
        }

        Object principal = authentication.getPrincipal();
        if (principal != null) {
            String principalValue = String.valueOf(principal).trim();
            if (principalValue.contains("@") && StringUtils.hasText(principalValue)) {
                return principalValue;
            }
        }

        String name = authentication.getName();
        if (StringUtils.hasText(name) && name.contains("@")) {
            return name.trim();
        }

        return null;
    }

    private Long resolveUserId(Authentication authentication) {
        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            Long fromSub = parseLong(claims.get("sub"));
            if (fromSub != null) {
                return fromSub;
            }
        }

        return parseLong(authentication.getPrincipal());
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.valueOf(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}

