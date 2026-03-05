package com.rainblet.backend.dto;

public record UserWalletResponse(
        Long userId,
        int coins,
        int points
) {
}