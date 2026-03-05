package com.rainblet.backend.dto;

public record AuthResponse(
        String token,
        String id,
        String email,
        String name,
        String pictureUrl
) {
}
