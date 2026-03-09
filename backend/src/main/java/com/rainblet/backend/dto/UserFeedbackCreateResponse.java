package com.rainblet.backend.dto;

import java.time.Instant;

public class UserFeedbackCreateResponse {

    private final Long id;
    private final String status;
    private final Instant createdAt;

    public UserFeedbackCreateResponse(Long id, String status, Instant createdAt) {
        this.id = id;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
