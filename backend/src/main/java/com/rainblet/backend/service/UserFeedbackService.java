package com.rainblet.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rainblet.backend.dto.UserFeedbackCreateRequest;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.entity.UserFeedback;
import com.rainblet.backend.repository.UserFeedbackRepository;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserFeedbackService {

    private static final String DEFAULT_FEEDBACK_TYPE = "general";
    private static final String DEFAULT_SOURCE = "web-app";
    private static final String DEFAULT_STATUS = "NEW";

    private final UserFeedbackRepository userFeedbackRepository;
    private final ObjectMapper objectMapper;

    public UserFeedbackService(UserFeedbackRepository userFeedbackRepository, ObjectMapper objectMapper) {
        this.userFeedbackRepository = userFeedbackRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UserFeedback create(User user, UserFeedbackCreateRequest request) {
        UserFeedback feedback = new UserFeedback();
        feedback.setUserId(user.getId());
        feedback.setUserEmail(user.getEmail());
        feedback.setFeedbackType(normalizeOrDefault(request.getFeedbackType(), DEFAULT_FEEDBACK_TYPE));
        feedback.setSource(normalizeOrDefault(request.getSource(), DEFAULT_SOURCE));
        feedback.setStatus(DEFAULT_STATUS);
        feedback.setSubject(trimToNull(request.getSubject()));
        feedback.setMessage(requireTrimmed(request.getMessage(), "message is required"));
        feedback.setPageUrl(trimToNull(request.getPageUrl()));
        feedback.setAppVersion(trimToNull(request.getAppVersion()));
        feedback.setContextJson(toJsonOrNull(request.getContext(), "context"));
        feedback.setMetadataJson(toJsonOrNull(request.getMetadata(), "metadata"));

        return userFeedbackRepository.save(feedback);
    }

    private String normalizeOrDefault(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
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

    private String toJsonOrNull(Map<String, Object> value, String fieldName) {
        if (value == null || value.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be valid JSON");
        }
    }
}
