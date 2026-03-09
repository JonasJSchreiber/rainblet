package com.rainblet.backend.controller;

import com.rainblet.backend.dto.UserFeedbackCreateRequest;
import com.rainblet.backend.dto.UserFeedbackCreateResponse;
import com.rainblet.backend.entity.User;
import com.rainblet.backend.entity.UserFeedback;
import com.rainblet.backend.service.UserFeedbackService;
import com.rainblet.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/feedback")
public class UserFeedbackController {

    private final UserService userService;
    private final UserFeedbackService userFeedbackService;

    public UserFeedbackController(UserService userService, UserFeedbackService userFeedbackService) {
        this.userService = userService;
        this.userFeedbackService = userFeedbackService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserFeedbackCreateResponse create(
            Authentication authentication,
            @Valid @RequestBody UserFeedbackCreateRequest request
    ) {
        User user = userService.resolveAuthenticatedUser(authentication);
        UserFeedback created = userFeedbackService.create(user, request);
        return new UserFeedbackCreateResponse(created.getId(), created.getStatus(), created.getCreatedAt());
    }
}
