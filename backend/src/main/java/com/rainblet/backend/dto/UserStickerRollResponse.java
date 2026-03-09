package com.rainblet.backend.dto;

public record UserStickerRollResponse(
        boolean affordable,
        boolean success,
        boolean isNew,
        int ownedCount,
        int remainingCoins,
        int remainingPoints,
        String stickerId
) {
}
